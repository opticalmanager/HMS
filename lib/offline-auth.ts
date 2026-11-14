import crypto from "crypto";

export interface OfflineSessionPayload {
  id: string;
  email: string;
  fullName: string;
  role: string;
  organizationId: string;
  branchId?: string | null;
  isActive: boolean;
  exp: number; // Unix timestamp in ms
}

function getSecretKey(): string {
  return (
    process.env.ENCRYPTION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_JWT_SECRET ||
    "hms-clinical-offline-secure-hmac-salt-2026"
  );
}

/**
 * Creates an HMAC-SHA256 signature for a session payload string.
 */
export function generateOfflineSignature(payloadStr: string): string {
  const secret = getSecretKey();
  return crypto.createHmac("sha256", secret).update(payloadStr).digest("hex");
}

/**
 * Creates a signed offline session token (base64url profile + signature)
 */
export function signOfflineSession(payload: OfflineSessionPayload): {
  profile: string;
  signature: string;
  token: string;
} {
  const profile = JSON.stringify(payload);
  const signature = generateOfflineSignature(profile);
  const token = `${Buffer.from(profile).toString("base64url")}.${signature}`;
  return { profile, signature, token };
}

/**
 * Validates whether an offline session string and its signature are valid, untampered, and unexpired.
 */
export function verifyOfflineSession(
  rawProfile: string | undefined | null,
  rawSignature: string | undefined | null
): OfflineSessionPayload | null {
  if (!rawProfile || !rawSignature) return null;

  try {
    const decodedProfile = rawProfile.startsWith("%")
      ? decodeURIComponent(rawProfile)
      : rawProfile;

    const expectedSig = generateOfflineSignature(decodedProfile);

    // Constant-time comparison to prevent timing attacks
    const sigBuffer = Buffer.from(rawSignature, "hex");
    const expectedBuffer = Buffer.from(expectedSig, "hex");

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      console.warn("[offline-auth] Invalid HMAC signature detected on offline session.");
      return null;
    }

    const parsed: OfflineSessionPayload = JSON.parse(decodedProfile);

    // Check expiration (default max 7 days)
    if (parsed.exp && parsed.exp < Date.now()) {
      console.warn("[offline-auth] Offline session token expired.");
      return null;
    }

    // Verify account is active
    if (parsed.isActive === false) {
      console.warn("[offline-auth] Inactive clinical user attempted offline access.");
      return null;
    }

    return parsed;
  } catch (err) {
    console.error("[offline-auth] Failed to parse or verify offline session:", err);
    return null;
  }
}
