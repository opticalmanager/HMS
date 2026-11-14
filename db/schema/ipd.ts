import { pgTable, text, timestamp, uuid, numeric, jsonb } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { branches } from "./branches";
import { patients } from "./patients";
import { profiles } from "./profiles";
import type { PrescriptionItem } from "@/types/hms";

export const wards = pgTable("wards", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. "General Male Ward", "Cardiology ICU"
  type: text("type", {
    enum: ["general", "semi_private", "private", "icu", "nicu", "emergency"],
  }).notNull(),
  floor: text("floor").default("Ground Floor"),
  totalBeds: text("total_beds").default("10"),
  dailyRate: numeric("daily_rate", { precision: 10, scale: 2 }).default("1000.00").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const beds = pgTable("beds", {
  id: uuid("id").defaultRandom().primaryKey(),
  wardId: uuid("ward_id")
    .notNull()
    .references(() => wards.id, { onDelete: "cascade" }),
  bedNumber: text("bed_number").notNull(), // e.g. "B-101", "ICU-04"
  status: text("status", {
    enum: ["available", "occupied", "cleaning", "maintenance", "reserved"],
  }).default("available").notNull(),
  currentPatientId: uuid("current_patient_id").references(() => patients.id, { onDelete: "set null" }),
  currentAdmissionId: uuid("current_admission_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ipdAdmissions = pgTable("ipd_admissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  admissionNumber: text("admission_number").notNull().unique(), // e.g. "IPD-2026-000001"
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  primaryDoctorId: uuid("primary_doctor_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  wardId: uuid("ward_id")
    .notNull()
    .references(() => wards.id, { onDelete: "cascade" }),
  bedId: uuid("bed_id")
    .notNull()
    .references(() => beds.id, { onDelete: "cascade" }),
  admissionDate: text("admission_date").notNull(), // YYYY-MM-DD
  expectedDischargeDate: text("expected_discharge_date"),
  actualDischargeDate: text("actual_discharge_date"),
  status: text("status", {
    enum: ["admitted", "transferred", "discharged", "transferred_out"],
  }).default("admitted").notNull(),
  admissionReason: text("admission_reason").notNull(),
  admissionDiagnosis: text("admission_diagnosis"),
  mlcCase: text("mlc_case").default("false"), // Medico-Legal Case
  totalAdvancePaid: numeric("total_advance_paid", { precision: 10, scale: 2 }).default("0.00").notNull(),
  dischargeSummary: jsonb("discharge_summary").$type<{
    diagnosisAtDischarge: string;
    clinicalCourse: string;
    proceduresDone?: string[];
    dischargePrescriptions: PrescriptionItem[];
    followUpInstructions: string;
    dischargedByDoctorId: string;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const nurseRounds = pgTable("nurse_rounds", {
  id: uuid("id").defaultRandom().primaryKey(),
  admissionId: uuid("admission_id")
    .notNull()
    .references(() => ipdAdmissions.id, { onDelete: "cascade" }),
  recordedByNurseId: uuid("recorded_by_nurse_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  roundTimestamp: timestamp("round_timestamp", { withTimezone: true }).defaultNow().notNull(),
  systolicBp: numeric("systolic_bp"),
  diastolicBp: numeric("diastolic_bp"),
  pulseRate: numeric("pulse_rate"),
  temperature: numeric("temperature", { precision: 4, scale: 1 }),
  spo2: numeric("spo2"),
  bloodSugar: numeric("blood_sugar"),
  ivFluidsGiven: text("iv_fluids_given"),
  notes: text("notes"),
});

export type WardEntity = typeof wards.$inferSelect;
export type BedEntity = typeof beds.$inferSelect;
export type IpdAdmissionEntity = typeof ipdAdmissions.$inferSelect;
export type NurseRoundEntity = typeof nurseRounds.$inferSelect;
