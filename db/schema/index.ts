/**
 * Central Database Schema Barrel Export & Relations Definitions
 */

export * from "./organizations";
export * from "./auth";
export * from "./branches";
export * from "./profiles";
export * from "./patients";
export * from "./appointments";
export * from "./clinical";
export * from "./ipd";
export * from "./billing";
export * from "./inventory";
export * from "./services";
export * from "./whatsapp";
export * from "./audit";

// Step 2 Core Master Data & Scheduling Tables
export * from "./clinic-profiles";
export * from "./doctors";
export * from "./schedules";
export * from "./catalog";
export * from "./prescriptions";
export * from "./outbox";
export * from "./ai-audit";
export * from "./print-settings";

import { relations } from "drizzle-orm";
import { organizations } from "./organizations";
import { user, member, invitation } from "./auth";
import { branches } from "./branches";
import { profiles } from "./profiles";
import { patients } from "./patients";
import { appointments } from "./appointments";
import { opdConsultations } from "./clinical";
import { wards, beds, ipdAdmissions, nurseRounds } from "./ipd";
import { invoices, payments } from "./billing";
import { inventoryItems, inventoryBatches, stockMovements } from "./inventory";
import { hospitalServices } from "./services";
import { whatsappMessages } from "./whatsapp";
import { auditLogs } from "./audit";

import { clinicProfiles } from "./clinic-profiles";
import { doctors } from "./doctors";
import { doctorSchedules, doctorSlotBlocks } from "./schedules";
import { medicineMaster, serviceTariffs } from "./catalog";
import { prescriptions } from "./prescriptions";
import { webhookOutbox } from "./outbox";
import { aiAuditLogs } from "./ai-audit";
import { printSettings } from "./print-settings";

// Organization Relations
export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  branches: many(branches),
  profiles: many(profiles),
  patients: many(patients),
  members: many(member),
  invitations: many(invitation),
  clinicProfile: one(clinicProfiles, {
    fields: [organizations.id],
    references: [clinicProfiles.organizationId],
  }),
  doctors: many(doctors),
  doctorSchedules: many(doctorSchedules),
  doctorSlotBlocks: many(doctorSlotBlocks),
  medicines: many(medicineMaster),
  serviceTariffs: many(serviceTariffs),
  prescriptions: many(prescriptions),
  outbox: many(webhookOutbox),
  aiAuditLogs: many(aiAuditLogs),
  printSettings: many(printSettings),
}));

// Clinic Profile Relations
export const clinicProfilesRelations = relations(clinicProfiles, ({ one }) => ({
  organization: one(organizations, {
    fields: [clinicProfiles.organizationId],
    references: [organizations.id],
  }),
}));

// Doctor Relations
export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [doctors.organizationId],
    references: [organizations.id],
  }),
  user: one(user, {
    fields: [doctors.userId],
    references: [user.id],
  }),
  schedules: many(doctorSchedules),
  slotBlocks: many(doctorSlotBlocks),
  appointments: many(appointments),
  prescriptions: many(prescriptions),
}));

// Doctor Schedules Relations
export const doctorSchedulesRelations = relations(doctorSchedules, ({ one }) => ({
  organization: one(organizations, {
    fields: [doctorSchedules.organizationId],
    references: [organizations.id],
  }),
  doctor: one(doctors, {
    fields: [doctorSchedules.doctorId],
    references: [doctors.id],
  }),
}));

// Doctor Slot Blocks Relations
export const doctorSlotBlocksRelations = relations(doctorSlotBlocks, ({ one }) => ({
  organization: one(organizations, {
    fields: [doctorSlotBlocks.organizationId],
    references: [organizations.id],
  }),
  doctor: one(doctors, {
    fields: [doctorSlotBlocks.doctorId],
    references: [doctors.id],
  }),
  createdByUser: one(user, {
    fields: [doctorSlotBlocks.createdByUserId],
    references: [user.id],
  }),
}));

// Master Catalog Relations
export const medicineMasterRelations = relations(medicineMaster, ({ one }) => ({
  organization: one(organizations, {
    fields: [medicineMaster.organizationId],
    references: [organizations.id],
  }),
}));

export const serviceTariffsRelations = relations(serviceTariffs, ({ one }) => ({
  organization: one(organizations, {
    fields: [serviceTariffs.organizationId],
    references: [organizations.id],
  }),
}));

// Prescription Relations
export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [prescriptions.organizationId],
    references: [organizations.id],
  }),
  appointment: one(appointments, {
    fields: [prescriptions.appointmentId],
    references: [appointments.id],
  }),
  doctor: one(doctors, {
    fields: [prescriptions.doctorId],
    references: [doctors.id],
  }),
  patient: one(patients, {
    fields: [prescriptions.patientId],
    references: [patients.id],
  }),
  approvedByUser: one(user, {
    fields: [prescriptions.approvedByUserId],
    references: [user.id],
  }),
}));

// Webhook Outbox Relations
export const webhookOutboxRelations = relations(webhookOutbox, ({ one }) => ({
  organization: one(organizations, {
    fields: [webhookOutbox.organizationId],
    references: [organizations.id],
  }),
}));

// AI Audit Logs Relations
export const aiAuditLogsRelations = relations(aiAuditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [aiAuditLogs.organizationId],
    references: [organizations.id],
  }),
}));

// Branch Relations
export const branchesRelations = relations(branches, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [branches.organizationId],
    references: [organizations.id],
  }),
  profiles: many(profiles),
  patients: many(patients),
  appointments: many(appointments),
  wards: many(wards),
}));

// Profile Relations
export const profilesRelations = relations(profiles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [profiles.organizationId],
    references: [organizations.id],
  }),
  branch: one(branches, {
    fields: [profiles.branchId],
    references: [branches.id],
  }),
  appointments: many(appointments),
  consultations: many(opdConsultations),
  ipdAdmissions: many(ipdAdmissions),
}));

// Patient Relations
export const patientsRelations = relations(patients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [patients.organizationId],
    references: [organizations.id],
  }),
  branch: one(branches, {
    fields: [patients.branchId],
    references: [branches.id],
  }),
  appointments: many(appointments),
  consultations: many(opdConsultations),
  ipdAdmissions: many(ipdAdmissions),
  invoices: many(invoices),
  prescriptions: many(prescriptions),
}));

// Appointment Relations
export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  doctor: one(doctors, {
    fields: [appointments.doctorId],
    references: [doctors.id],
  }),
  branch: one(branches, {
    fields: [appointments.branchId],
    references: [branches.id],
  }),
  prescriptions: many(prescriptions),
  invoices: many(invoices),
}));

// OPD Consultation Relations
export const opdConsultationsRelations = relations(opdConsultations, ({ one }) => ({
  patient: one(patients, {
    fields: [opdConsultations.patientId],
    references: [patients.id],
  }),
  doctor: one(profiles, {
    fields: [opdConsultations.doctorId],
    references: [profiles.id],
  }),
  appointment: one(appointments, {
    fields: [opdConsultations.appointmentId],
    references: [appointments.id],
  }),
}));

// IPD Ward & Bed Relations
export const wardsRelations = relations(wards, ({ many }) => ({
  beds: many(beds),
}));

export const bedsRelations = relations(beds, ({ one }) => ({
  ward: one(wards, {
    fields: [beds.wardId],
    references: [wards.id],
  }),
  currentPatient: one(patients, {
    fields: [beds.currentPatientId],
    references: [patients.id],
  }),
}));

// IPD Admission Relations
export const ipdAdmissionsRelations = relations(ipdAdmissions, ({ one, many }) => ({
  patient: one(patients, {
    fields: [ipdAdmissions.patientId],
    references: [patients.id],
  }),
  doctor: one(profiles, {
    fields: [ipdAdmissions.primaryDoctorId],
    references: [profiles.id],
  }),
  ward: one(wards, {
    fields: [ipdAdmissions.wardId],
    references: [wards.id],
  }),
  bed: one(beds, {
    fields: [ipdAdmissions.bedId],
    references: [beds.id],
  }),
  nurseRounds: many(nurseRounds),
}));

// Invoice & Payment Relations
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  patient: one(patients, {
    fields: [invoices.patientId],
    references: [patients.id],
  }),
  biller: one(profiles, {
    fields: [invoices.billerId],
    references: [profiles.id],
  }),
  appointment: one(appointments, {
    fields: [invoices.appointmentId],
    references: [appointments.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  collectedByProfile: one(profiles, {
    fields: [payments.collectedBy],
    references: [profiles.id],
  }),
}));

// Inventory Relations
export const inventoryItemsRelations = relations(inventoryItems, ({ many }) => ({
  batches: many(inventoryBatches),
  stockMovements: many(stockMovements),
}));

export const inventoryBatchesRelations = relations(inventoryBatches, ({ one }) => ({
  item: one(inventoryItems, {
    fields: [inventoryBatches.itemId],
    references: [inventoryItems.id],
  }),
}));

// Print Settings Relations
export const printSettingsRelations = relations(printSettings, ({ one }) => ({
  organization: one(organizations, {
    fields: [printSettings.organizationId],
    references: [organizations.id],
  }),
}));
