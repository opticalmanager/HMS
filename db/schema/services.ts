import { pgTable, text, timestamp, uuid, numeric, boolean } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { branches } from "./branches";

export const hospitalServices = pgTable("hospital_services", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(), // e.g. "SRV-CBC", "SRV-XRAY-CHEST"
  name: text("name").notNull(),
  category: text("category", {
    enum: ["consultation", "diagnostic_lab", "radiology", "procedure", "nursing", "ambulance", "package"],
  }).notNull(),
  department: text("department").notNull(), // e.g. "Pathology", "Radiology", "General Surgery"
  standardRate: numeric("standard_rate", { precision: 10, scale: 2 }).notNull(),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).default("0.00").notNull(), // Healthcare services mostly 0% in India
  turnaroundTimeHours: text("turnaround_time_hours").default("4"),
  sampleRequired: text("sample_required"), // e.g. "Whole Blood EDTA", "Urine Mid-Stream"
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type HospitalServiceEntity = typeof hospitalServices.$inferSelect;
export type NewHospitalServiceEntity = typeof hospitalServices.$inferInsert;
