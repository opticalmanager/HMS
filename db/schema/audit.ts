import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { branches } from "./branches";
import { profiles } from "./profiles";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
    userEmail: text("user_email").notNull(),
    userRole: text("user_role").notNull(),
    action: text("action").notNull(), // e.g. "VIEW_PHI", "PRESCRIBE_MEDICATION", "DISCOUNT_OVERRIDE", "DISCHARGE_PATIENT"
    module: text("module").notNull(), // e.g. "opd", "ipd", "billing", "patients", "pharmacy"
    entityType: text("entity_type").notNull(), // e.g. "patient", "consultation", "invoice", "prescription"
    entityId: text("entity_id").notNull(),
    oldData: jsonb("old_data"),
    newData: jsonb("newData"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("audit_logs_organization_id_idx").on(table.organizationId)]
);

export type AuditLogEntity = typeof auditLogs.$inferSelect;
export type NewAuditLogEntity = typeof auditLogs.$inferInsert;
