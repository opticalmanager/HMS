import { pgTable, text, timestamp, uuid, integer, boolean, numeric, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations";
import { branches } from "./branches";
import { patients } from "./patients";
import { doctors } from "./doctors";

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    department: text("department").notNull(),
    tokenNumber: integer("token_number").notNull(),
    appointmentDate: text("appointment_date").notNull(), // YYYY-MM-DD
    timeSlot: text("time_slot").notNull(), // HH:mm
    slotStart: timestamp("slot_start", { withTimezone: true }),
    slotEnd: timestamp("slot_end", { withTimezone: true }),
    source: text("source", { enum: ["WEB", "WHATSAPP", "VOICE_DOGRAH"] }).default("WEB").notNull(),
    idempotencyKey: text("idempotency_key"),
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
  },
  (table) => [
    index("appointments_organization_id_idx").on(table.organizationId),
    uniqueIndex("appointments_doctor_slot_concurrency_idx")
      .on(table.organizationId, table.doctorId, table.slotStart)
      .where(sql`status IN ('scheduled', 'arrived', 'in_consultation') AND slot_start IS NOT NULL`),
    uniqueIndex("appointments_idempotency_key_idx")
      .on(table.organizationId, table.idempotencyKey)
      .where(sql`idempotency_key IS NOT NULL`),
  ]
);

export type AppointmentEntity = typeof appointments.$inferSelect;
export type NewAppointmentEntity = typeof appointments.$inferInsert;
