import { pgTable, text, timestamp, uuid, integer, jsonb, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const clinicProfiles = pgTable(
  "clinic_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .unique()
      .references(() => organizations.id, { onDelete: "cascade" }),
    timezone: text("timezone").default("Asia/Kolkata").notNull(),
    defaultSlotMinutes: integer("default_slot_minutes").default(15).notNull(),
    workingHoursJson: jsonb("working_hours_json").$type<Record<string, { start: string; end: string; enabled?: boolean }>>(),
    wabaId: text("waba_id").unique(),
    broadcastWebhookUrl: text("broadcast_webhook_url"),
    broadcastApiKeyEnc: text("broadcast_api_key_enc"),
    gstin: text("gstin"),
    invoicePrefix: text("invoice_prefix").default("INV").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("clinic_profiles_org_id_idx").on(table.organizationId),
  ]
);

export type ClinicProfileEntity = typeof clinicProfiles.$inferSelect;
export type NewClinicProfileEntity = typeof clinicProfiles.$inferInsert;
