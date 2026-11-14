import { pgTable, text, timestamp, uuid, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { branches } from "./branches";
import { patients } from "./patients";
import { profiles } from "./profiles";
import { appointments } from "./appointments";
import type { PrescriptionItem, DiagnosisEntry } from "@/types/hms";

export const opdConsultations = pgTable("opd_consultations", {
  id: uuid("id").defaultRandom().primaryKey(),
  consultationNumber: text("consultation_number").notNull().unique(), // e.g. "OPD-2026-000001"
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  consultationDate: text("consultation_date").notNull(), // YYYY-MM-DD
  // Vitals recorded during triage or OPD
  systolicBp: integer("systolic_bp"),
  diastolicBp: integer("diastolic_bp"),
  pulseRate: integer("pulse_rate"),
  temperature: numeric("temperature", { precision: 4, scale: 1 }),
  respiratoryRate: integer("respiratory_rate"),
  spo2: integer("spo2"),
  heightCm: numeric("height_cm", { precision: 5, scale: 1 }),
  weightKg: numeric("weight_kg", { precision: 5, scale: 2 }),
  bmi: numeric("bmi", { precision: 4, scale: 1 }),
  bloodSugarRandom: integer("blood_sugar_random"),
  // Clinical encounter notes
  chiefComplaints: jsonb("chief_complaints").$type<string[]>().default([]).notNull(),
  historyOfPresentIllness: text("history_of_present_illness"),
  physicalExamination: text("physical_examination"),
  // Structured Diagnoses & Prescriptions
  diagnoses: jsonb("diagnoses").$type<DiagnosisEntry[]>().default([]).notNull(),
  prescriptions: jsonb("prescriptions").$type<PrescriptionItem[]>().default([]).notNull(),
  labInvestigations: jsonb("lab_investigations").$type<string[]>().default([]).notNull(),
  advice: text("advice"),
  followUpDate: text("follow_up_date"), // YYYY-MM-DD
  // ABDM Care Context link status
  isAbdmLinked: text("is_abdm_linked").default("false"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type OpdConsultationEntity = typeof opdConsultations.$inferSelect;
export type NewOpdConsultationEntity = typeof opdConsultations.$inferInsert;
