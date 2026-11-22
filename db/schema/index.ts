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

import { relations } from "drizzle-orm";
import { organizations } from "./organizations";
import { member, invitation } from "./auth";
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

// Organization Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  branches: many(branches),
  profiles: many(profiles),
  patients: many(patients),
  members: many(member),
  invitations: many(invitation),
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
}));

// Appointment Relations
export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  doctor: one(profiles, {
    fields: [appointments.doctorId],
    references: [profiles.id],
  }),
  branch: one(branches, {
    fields: [appointments.branchId],
    references: [branches.id],
  }),
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
