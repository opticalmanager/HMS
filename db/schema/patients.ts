import { pgTable, text, timestamp, uuid, integer, jsonb, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { branches } from "./branches";

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    uhid: text("uhid").notNull().unique(), // e.g. "UHID-2026-000001"
    fullName: text("full_name").notNull(),
    gender: text("gender", { enum: ["male", "female", "other"] }).notNull(),
    dateOfBirth: text("date_of_birth"), // YYYY-MM-DD
    age: integer("age"),
    phone: text("phone").notNull(),
    email: text("email"),
    address: text("address"),
    city: text("city"),
    pincode: text("pincode"),
    stateCode: text("state_code").default("27"),
    bloodGroup: text("blood_group", {
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    }),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    emergencyContactRelation: text("emergency_contact_relation"),
    // ABDM Ayushman Bharat Health Account identifiers
    abhaId: text("abha_id"), // 14-digit ABHA Number (e.g. 91-1234-5678-9012)
    abhaAddress: text("abha_address"), // e.g. "patient@abdm"
    abhaVerifiedAt: timestamp("abha_verified_at", { withTimezone: true }),
    allergies: jsonb("allergies").$type<string[]>().default([]),
    chronicConditions: jsonb("chronic_conditions").$type<string[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("patients_organization_id_idx").on(table.organizationId)]
);

export type PatientEntity = typeof patients.$inferSelect;
export type NewPatientEntity = typeof patients.$inferInsert;
