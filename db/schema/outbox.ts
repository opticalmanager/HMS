import { pgTable, text, timestamp, uuid, integer, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations";

export const webhookOutbox = pgTable(
  "webhook_outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payloadJson: jsonb("payload_json").$type<Record<string, unknown>>().notNull(),
    status: text("status", { enum: ["PENDING", "PROCESSING", "SENT", "FAILED"] })
      .default("PENDING")
      .notNull(),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(5).notNull(),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("webhook_outbox_org_id_idx").on(table.organizationId),
    index("webhook_outbox_status_retry_idx")
      .on(table.status, table.nextRetryAt)
      .where(sql`status IN ('PENDING', 'FAILED')`),
  ]
);

export type WebhookOutboxEntity = typeof webhookOutbox.$inferSelect;
export type NewWebhookOutboxEntity = typeof webhookOutbox.$inferInsert;
