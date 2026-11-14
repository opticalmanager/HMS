import { pgTable, text, timestamp, uuid, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { branches } from "./branches";
import { patients } from "./patients";
import { profiles } from "./profiles";

export const appointments = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),
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
  department: text("department").notNull(),
  tokenNumber: integer("token_number").notNull(),
  appointmentDate: text("appointment_date").notNull(), // YYYY-MM-DD
  timeSlot: text("time_slot").notNull(), // HH:mm
  status: text("status", {
    enum: [
      "scheduled",
      "arrived",
      "in_consultation",
      "completed",
      "cancelled",
      "no_show",
    ],
  }).default("scheduled").notNull(),
  priority: text("priority", {
    enum: ["normal", "urgent", "emergency"],
  }).default("normal").notNull(),
  chiefComplaints: text("chief_complaints"),
  consultationFee: numeric("consultation_fee", { precision: 10, scale: 2 }).default("0.00").notNull(),
  isPaid: boolean("is_paid").default(false).notNull(),
  calledAt: timestamp("called_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AppointmentEntity = typeof appointments.$inferSelect;
export type NewAppointmentEntity = typeof appointments.$inferInsert;
