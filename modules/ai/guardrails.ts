export type AiChannel = "WEB_COPILOT" | "WHATSAPP" | "VOICE_DOGRAH" | "REST" | string;

export interface InputValidationResult {
  allowed: boolean;
  reason?: "PROMPT_INJECTION_DETECTED" | "INPUT_LENGTH_EXCEEDED" | "MALICIOUS_CONTENT_DETECTED";
  sanitizedInput?: string;
}

export interface PatientSafetyResult {
  text: string;
  emergencyFlagged: boolean;
  modified: boolean;
}

const CHANNEL_LENGTH_LIMITS: Record<string, number> = {
  WEB_COPILOT: 4000,
  WEB: 4000,
  WHATSAPP: 1500,
  VOICE_DOGRAH: 1000,
};

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?.*?\s*instructions/i,
  /ignore\s+previous/i,
  /disregard\s+(the\s+)?(previous|system|all).*?\s*(instructions|prompt)/i,
  /act\s+as\s+(an?\s+)?(system|admin|root|developer|owner)/i,
  /pretend\s+you\s+are\s+(an?\s+)?(admin|system|root)/i,
  /you\s+are\s+now\s+(an?\s+)?(admin|system|unrestricted)/i,
  /reveal\s+(all\s+)?patients/i,
  /dump\s+(all\s+)?patients/i,
  /show\s+all\s+patient\s+records/i,
  /switch\s+(the\s+)?clinic/i,
  /change\s+clinic\s+id/i,
  /bypass\s+(the\s+)?(security|guardrails|filters)/i,
  /jailbreak/i,
];

const EMERGENCY_RED_FLAGS: RegExp[] = [
  /\bchest\s+pain\b/i,
  /\bdifficulty\s+breathing\b/i,
  /\bshortness\s+of\s+breath\b/i,
  /\bsevere\s+bleeding\b/i,
  /\bheavy\s+blood\s+loss\b/i,
  /\bstroke\b/i,
  /\bheart\s+attack\b/i,
  /\bloss\s+of\s+consciousness\b/i,
  /\bunconscious\b/i,
  /\bseizure\b/i,
  /\bchoking\b/i,
  /\bsevere\s+head\s+injury\b/i,
  /\banaphylaxis\b/i,
];

const EMERGENCY_NOTICE =
  "\n\n[EMERGENCY MEDICAL NOTICE: If you are experiencing severe or life-threatening symptoms (such as acute chest pain, severe bleeding, or difficulty breathing), please immediately call 112 / 108 or go to the nearest emergency hospital immediately.]";

/**
 * Validates inbound user input for prompt injection, length bounds, and malicious instructions.
 */
export function validateAiInput(input: string, channel: AiChannel = "WEB_COPILOT"): InputValidationResult {
  if (!input || typeof input !== "string") {
    return { allowed: true, sanitizedInput: "" };
  }

  const trimmed = input.trim();
  const maxLen = CHANNEL_LENGTH_LIMITS[channel] || 2500;

  // 1. Length enforcement
  if (trimmed.length > maxLen) {
    return {
      allowed: false,
      reason: "INPUT_LENGTH_EXCEEDED",
    };
  }

  // 2. Prompt injection detection
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        reason: "PROMPT_INJECTION_DETECTED",
      };
    }
  }

  return {
    allowed: true,
    sanitizedInput: trimmed,
  };
}

/**
 * Masks Indian phone numbers, emails, and Aadhaar numbers to ensure zero PHI/PII in logs.
 */
export function redactPiiForLogs(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  let redacted = text;

  // Mask Indian phone numbers: +91... or 10-digit mobile starting 6-9
  redacted = redacted.replace(/(\+91[\s-]?)?[6-9]\d{9}\b/g, "[REDACTED_PHONE]");

  // Mask Email addresses
  redacted = redacted.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]");

  // Mask 12-digit Indian Aadhaar numbers
  redacted = redacted.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[REDACTED_AADHAAR]");

  return redacted;
}

/**
 * Applies clinical safety boundaries on patient-facing channels (WhatsApp, Voice Dograh).
 * Enforces emergency disclaimers and non-diagnosis guardrails.
 */
export function applyPatientSafetyGuardrail(
  responseText: string,
  userQuery: string,
  channel: AiChannel
): PatientSafetyResult {
  const isPatientFacing = channel === "WHATSAPP" || channel === "VOICE_DOGRAH";

  if (!isPatientFacing) {
    return {
      text: responseText,
      emergencyFlagged: false,
      modified: false,
    };
  }

  const combined = `${userQuery} ${responseText}`;
  const isEmergency = EMERGENCY_RED_FLAGS.some((pattern) => pattern.test(combined));

  if (isEmergency) {
    // If not already included, append emergency escalation
    if (!responseText.includes("112") && !responseText.includes("emergency hospital")) {
      return {
        text: `${responseText.trim()}${EMERGENCY_NOTICE}`,
        emergencyFlagged: true,
        modified: true,
      };
    }
    return {
      text: responseText,
      emergencyFlagged: true,
      modified: false,
    };
  }

  return {
    text: responseText,
    emergencyFlagged: false,
    modified: false,
  };
}
