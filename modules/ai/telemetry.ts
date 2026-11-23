import { db } from "@/lib/drizzle";
import { aiAuditLogs, type NewAiAuditLogEntity } from "@/db/schema/ai-audit";
import { redactPiiForLogs } from "./guardrails";

export interface AiAuditEntry {
  organizationId: string;
  traceId: string;
  channel: "WEB_COPILOT" | "WHATSAPP" | "VOICE_DOGRAH";
  actorRole?: string | null;
  actorId?: string | null;
  actionType: string;
  model?: string | null;
  toolCalls?: Record<string, unknown>[] | null;
  latencyMs?: number | null;
  tokensIn?: number;
  tokensOut?: number;
  status: "SUCCESS" | "ERROR" | "BLOCKED";
  errorCode?: string | null;
  fallbackUsed?: boolean;
}

/**
 * Pricing rates per 1,000,000 tokens (USD).
 */
const MODEL_PRICING: Record<string, { inRate: number; outRate: number }> = {
  "gemini-2.5-flash-lite": { inRate: 0.075, outRate: 0.30 },
  "gemini-2.5-flash": { inRate: 0.15, outRate: 0.60 },
  "gemini-1.5-flash": { inRate: 0.075, outRate: 0.30 },
  "gemini-1.5-pro": { inRate: 1.25, outRate: 5.00 },
};

export function estimateCostUsd(model: string | null | undefined, tokensIn = 0, tokensOut = 0): string {
  const normModel = (model || "").toLowerCase();
  let pricing = MODEL_PRICING["gemini-2.5-flash-lite"];

  for (const [key, val] of Object.entries(MODEL_PRICING)) {
    if (normModel.includes(key)) {
      pricing = val;
      break;
    }
  }

  const costIn = (tokensIn / 1_000_000) * pricing.inRate;
  const costOut = (tokensOut / 1_000_000) * pricing.outRate;
  const total = costIn + costOut;

  return total.toFixed(6);
}

/**
 * Sanitizes tool calls to strip PII, raw patient names, and raw transcripts.
 */
function sanitizeToolCallsForAudit(toolCalls?: Record<string, unknown>[] | null): Record<string, unknown>[] | null {
  if (!toolCalls || !Array.isArray(toolCalls)) {
    return null;
  }

  return toolCalls.map((call) => {
    const sanitizedArgs: Record<string, unknown> = {};
    const args = (call.args || call.arguments || {}) as Record<string, unknown>;

    for (const [key, value] of Object.entries(args)) {
      if (typeof value === "string") {
        sanitizedArgs[key] = redactPiiForLogs(value);
      } else {
        sanitizedArgs[key] = value;
      }
    }

    return {
      name: call.name || call.toolName,
      arguments: sanitizedArgs,
    };
  });
}

/**
 * Fire-and-forget asynchronous audit logger writing to ai_audit_logs.
 * Guaranteed to NEVER throw or break the active request pipeline.
 */
export async function recordAiAudit(entry: AiAuditEntry): Promise<void> {
  try {
    const tokensIn = entry.tokensIn || 0;
    const tokensOut = entry.tokensOut || 0;
    const estimatedCostUsd = estimateCostUsd(entry.model, tokensIn, tokensOut);

    let sanitizedToolCalls = sanitizeToolCallsForAudit(entry.toolCalls);
    if (entry.fallbackUsed) {
      const fallbackMeta = { name: "model_router", arguments: { fallbackUsed: true } };
      sanitizedToolCalls = sanitizedToolCalls ? [...sanitizedToolCalls, fallbackMeta] : [fallbackMeta];
    }

    await db.insert(aiAuditLogs).values({
      organizationId: entry.organizationId,
      traceId: entry.traceId,
      channel: entry.channel,
      actorRole: entry.actorRole || null,
      actorId: entry.actorId ? redactPiiForLogs(entry.actorId) : null,
      actionType: entry.actionType,
      model: entry.model || null,
      toolCallsJson: sanitizedToolCalls as any,
      latencyMs: entry.latencyMs || null,
      tokensIn,
      tokensOut,
      estimatedCostUsd,
      status: entry.status,
      errorCode: entry.errorCode || null,
    });
  } catch (err) {
    // Non-blocking observability: log error to stderr without interrupting caller
    console.error("[AiAudit] Non-blocking telemetry write failed:", err);
  }
}
