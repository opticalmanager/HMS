import { pgTable, text, timestamp, boolean, uuid, numeric } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { branches } from "./branches";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // Matches Supabase Auth user ID
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: text("role", {
    enum: [
      "super_admin",
      "hospital_admin",
      "doctor",
      "nurse",
      "receptionist",
      "pharmacist",
      "accountant",
      "lab_technician",
    ],
  }).notNull(),
  department: text("department"), // e.g. "General Medicine", "Cardiology", "Orthopedics"
  designation: text("designation"), // e.g. "Senior Consultant", "Resident Medical Officer"
  medicalLicenseNumber: text("medical_license_number"), // MCI or State Medical Council Reg No.
  qualification: text("qualification"), // e.g. "MBBS, MD (Medicine)"
  defaultConsultationFee: numeric("default_consultation_fee", { precision: 10, scale: 2 }).default("500.00"),
  signatureUrl: text("signature_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
