import "server-only";
import crypto from "node:crypto";
import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { webhookOutbox, type WebhookOutboxEntity } from "@/db/schema/outbox";
import { clinicProfiles } from "@/db/schema/clinic-profiles";
import { decryptBroadcastApiKey } from "@/lib/crypto";
import { env } from "@/lib/env";

export interface EnqueueWebhookEventInput {
  organizationId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export interface DispatchOutboxResult {
  claimed: number;
  sent: number;
  failed: number;
  skipped: number;
}

/**
 * Computes HMAC-SHA256 hex digest for an outbox payload string.
 */
export function generateOutboxSignature(payloadString: string, secretKey: string): string {
  return crypto.createHmac("sha256", secretKey).update(payloadString, "utf8").digest("hex");
}

/**
 * Transaction-safe helper writing an event row into webhook_outbox.
 * Supports executing inside an ongoing Drizzle transaction (tx) or standalone db client.
 */
export async function enqueueWebhookEvent(
  executor: typeof db | any,
  input: EnqueueWebhookEventInput
): Promise<WebhookOutboxEntity> {
  const client = executor || db;

  const [row] = await client
    .insert(webhookOutbox)
    .values({
      organizationId: input.organizationId,
      eventType: input.eventType,
      payloadJson: input.payload,
      status: "PENDING",
      attempts: 0,
      maxAttempts: 5,
      nextRetryAt: new Date(),
    })
    .returning();

  return row;
}

export class NotificationDomainService {
  /**
   * Helper to enqueue an event using the default db client.
   */
  static async enqueueEvent(input: EnqueueWebhookEventInput): Promise<WebhookOutboxEntity> {
    return enqueueWebhookEvent(db, input);
  }

  /**
   * Dispatches pending outbox events using a 2-phase claim pattern:
   * Phase 1: Claims due rows (FOR UPDATE SKIP LOCKED) and sets status to 'PROCESSING' in a fast transaction.
   * Phase 2: Performs HTTP delivery outside transaction with a strict 10s AbortController timeout.
   */
  static async dispatchPendingOutboxEvents(options: {
    batchSize?: number;
    fetchFn?: typeof fetch;
  } = {}): Promise<DispatchOutboxResult> {
    const batchSize = Math.max(1, Math.min(100, options.batchSize || 20));
    const activeFetch = options.fetchFn || fetch;

    // Phase 1: Claim due rows atomically in a quick transaction
    const claimedRows = await db.transaction(async (tx) => {
      const candidates = await tx.execute<WebhookOutboxEntity>(sql`
        SELECT
          id,
          organization_id as "organizationId",
          event_type as "eventType",
          payload_json as "payloadJson",
          status,
          attempts,
          max_attempts as "maxAttempts",
          next_retry_at as "nextRetryAt",
          last_error as "lastError",
          sent_at as "sentAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM webhook_outbox
        WHERE status IN ('PENDING', 'FAILED')
          AND (next_retry_at IS NULL OR next_retry_at <= NOW())
          AND attempts < max_attempts
        ORDER BY created_at ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      `);

      const rows = candidates as unknown as WebhookOutboxEntity[];
      if (!rows || rows.length === 0) {
        return [];
      }

      const claimedIds = rows.map((r) => r.id);
      await tx
        .update(webhookOutbox)
        .set({
          status: "PROCESSING",
          updatedAt: new Date(),
        })
        .where(inArray(webhookOutbox.id, claimedIds));

      return rows;
    });

    if (claimedRows.length === 0) {
      return { claimed: 0, sent: 0, failed: 0, skipped: 0 };
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    // Phase 2: Deliver HTTP requests outside of the DB transaction
    for (const row of claimedRows) {
      try {
        // Fetch clinic profile for webhook URL and encrypted API key
        const [profile] = await db
          .select({
            broadcastWebhookUrl: clinicProfiles.broadcastWebhookUrl,
            broadcastApiKeyEnc: clinicProfiles.broadcastApiKeyEnc,
          })
          .from(clinicProfiles)
          .where(eq(clinicProfiles.organizationId, row.organizationId))
          .limit(1);

        if (!profile || !profile.broadcastWebhookUrl || !profile.broadcastWebhookUrl.trim()) {
          // Webhook not configured: mark cleanly without breaking app
          await db
            .update(webhookOutbox)
            .set({
              status: "FAILED",
              lastError: "WEBHOOK_NOT_CONFIGURED",
              updatedAt: new Date(),
            })
            .where(eq(webhookOutbox.id, row.id));

          skipped++;
          continue;
        }

        // Decrypt API key for signature if present
        let apiKey = env.BETTER_AUTH_SECRET || "default_hmac_secret";
        if (profile.broadcastApiKeyEnc) {
          try {
            apiKey = decryptBroadcastApiKey(profile.broadcastApiKeyEnc);
          } catch {
            apiKey = env.BETTER_AUTH_SECRET || "default_hmac_secret";
          }
        }

        const payloadStr = JSON.stringify(row.payloadJson);
        const signature = generateOutboxSignature(payloadStr, apiKey);

        // Strict 10-second timeout guard
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const res = await activeFetch(profile.broadcastWebhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CRM-Signature": signature,
              "X-CRM-Event": row.eventType,
              "X-CRM-Delivery-Id": row.id,
            },
            body: payloadStr,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (res.ok) {
            await db
              .update(webhookOutbox)
              .set({
                status: "SENT",
                sentAt: new Date(),
                lastError: null,
                updatedAt: new Date(),
              })
              .where(eq(webhookOutbox.id, row.id));

            sent++;
          } else {
            const nextAttempts = row.attempts + 1;
            const isExhausted = nextAttempts >= row.maxAttempts;
            const backoffMinutes = Math.pow(2, nextAttempts);
            const nextRetry = isExhausted
              ? null
              : new Date(Date.now() + backoffMinutes * 60 * 1000);

            await db
              .update(webhookOutbox)
              .set({
                status: "FAILED",
                attempts: nextAttempts,
                nextRetryAt: nextRetry,
                lastError: `HTTP ${res.status}: ${res.statusText}`,
                updatedAt: new Date(),
              })
              .where(eq(webhookOutbox.id, row.id));

            failed++;
          }
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          const nextAttempts = row.attempts + 1;
          const isExhausted = nextAttempts >= row.maxAttempts;
          const backoffMinutes = Math.pow(2, nextAttempts);
          const nextRetry = isExhausted
            ? null
            : new Date(Date.now() + backoffMinutes * 60 * 1000);

          await db
            .update(webhookOutbox)
            .set({
              status: "FAILED",
              attempts: nextAttempts,
              nextRetryAt: nextRetry,
              lastError: fetchErr?.name === "AbortError" ? "Request timeout after 10000ms" : String(fetchErr?.message || fetchErr),
              updatedAt: new Date(),
            })
            .where(eq(webhookOutbox.id, row.id));

          failed++;
        }
      } catch (err: any) {
        failed++;
        await db
          .update(webhookOutbox)
          .set({
            status: "FAILED",
            lastError: String(err?.message || err),
            updatedAt: new Date(),
          })
          .where(eq(webhookOutbox.id, row.id));
      }
    }

    return {
      claimed: claimedRows.length,
      sent,
      failed,
      skipped,
    };
  }
}
