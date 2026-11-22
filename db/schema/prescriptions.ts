import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { doctors } from "./doctors";
import { patients } from "./patients";
import { appointments } from "./appointments";
import { user } from "./auth";

export interface PrescriptionItem {
  medicineId?: string;
  brandName: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions?: string;
}

export const prescriptions = pgTable(
  "prescriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["DRAFT", "APPROVED"] }).default("DRAFT").notNull(),
    rawTranscript: text("raw_transcript"),
    chiefComplaint: text("chief_complaint"),
    diagnosis: text("diagnosis"),
    itemsJson: jsonb("items_json").$type<PrescriptionItem[]>().default([]).notNull(),
    followUpDate: timestamp("follow_up_date", { withTimezone: true }),
    approvedByUserId: uuid("approved_by_user_id").references(() => user.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("prescriptions_organization_id_idx").on(table.organizationId),
    index("prescriptions_patient_id_idx").on(table.patientId),
    index("prescriptions_doctor_id_idx").on(table.doctorId),
  ]
);

export type PrescriptionEntity = typeof prescriptions.$inferSelect;
export type NewPrescriptionEntity = typeof prescriptions.$inferInsert;
