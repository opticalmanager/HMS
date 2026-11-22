import { pgTable, text, timestamp, uuid, integer, numeric, jsonb, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const aiAuditLogs = pgTable(
  "ai_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    traceId: text("trace_id").notNull(),
    channel: text("channel", { enum: ["WEB_COPILOT", "WHATSAPP", "VOICE_DOGRAH"] }).notNull(),
    actorRole: text("actor_role"),
    actorId: text("actor_id"),
    actionType: text("action_type").notNull(),
    model: text("model"),
    toolCallsJson: jsonb("tool_calls_json").$type<Record<string, unknown>[]>(),
    latencyMs: integer("latency_ms"),
    tokensIn: integer("tokens_in").default(0).notNull(),
    tokensOut: integer("tokens_out").default(0).notNull(),
    estimatedCostUsd: numeric("estimated_cost_usd", { precision: 10, scale: 6 }).default("0.000000"),
    status: text("status", { enum: ["SUCCESS", "ERROR", "BLOCKED"] }).notNull(),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("ai_audit_logs_organization_id_idx").on(table.organizationId),
    index("ai_audit_logs_trace_id_idx").on(table.traceId),
  ]
);

export type AiAuditLogEntity = typeof aiAuditLogs.$inferSelect;
export type NewAiAuditLogEntity = typeof aiAuditLogs.$inferInsert;
