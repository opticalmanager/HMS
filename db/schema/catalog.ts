import { pgTable, text, timestamp, boolean, uuid, integer, numeric, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const medicineMaster = pgTable(
  "medicine_master",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    brandName: text("brand_name").notNull(),
    genericName: text("generic_name").notNull(),
    strength: text("strength"),
    form: text("form", {
      enum: ["TABLET", "CAPSULE", "SYRUP", "INJECTION", "DROPS", "OINTMENT", "OTHER"],
    }).notNull(),
    defaultDosage: text("default_dosage"),
    defaultFrequency: text("default_frequency", {
      enum: ["OD", "BD", "TDS", "SOS"],
    }),
    defaultDurationDays: integer("default_duration_days"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("medicine_master_organization_id_idx").on(table.organizationId),
  ]
);

export const serviceTariffs = pgTable(
  "service_tariffs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category", {
      enum: ["CONSULTATION", "LAB", "PROCEDURE", "DIAGNOSTIC", "OTHER"],
    }).notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0.00").notNull(),
    hsnSacCode: text("hsn_sac_code"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("service_tariffs_organization_id_idx").on(table.organizationId),
  ]
);

export type MedicineMasterEntity = typeof medicineMaster.$inferSelect;
export type NewMedicineMasterEntity = typeof medicineMaster.$inferInsert;
export type ServiceTariffEntity = typeof serviceTariffs.$inferSelect;
export type NewServiceTariffEntity = typeof serviceTariffs.$inferInsert;
