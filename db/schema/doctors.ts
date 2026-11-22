import { pgTable, text, timestamp, boolean, uuid, numeric, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations";
import { user } from "./auth";

export const doctors = pgTable(
  "doctors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => user.id, { onDelete: "set null" }),
    fullName: text("full_name").notNull(),
    specialty: text("specialty").notNull(),
    phoneE164: text("phone_e164"),
    consultationFee: numeric("consultation_fee", { precision: 10, scale: 2 }).default("500.00").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("doctors_organization_id_idx").on(table.organizationId),
    index("doctors_org_phone_idx").on(table.organizationId, table.phoneE164),
    uniqueIndex("doctors_org_user_unique_idx")
      .on(table.organizationId, table.userId)
      .where(sql`user_id IS NOT NULL`),
  ]
);

export type DoctorEntity = typeof doctors.$inferSelect;
export type NewDoctorEntity = typeof doctors.$inferInsert;
