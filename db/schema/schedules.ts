import { pgTable, text, timestamp, boolean, uuid, integer, smallint, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations";
import { doctors } from "./doctors";
import { user } from "./auth";

export const doctorSchedules = pgTable(
  "doctor_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    dayOfWeek: smallint("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    startTime: text("start_time").notNull(), // HH:mm (24h)
    endTime: text("end_time").notNull(), // HH:mm (24h)
    slotDurationMins: integer("slot_duration_mins").default(15).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("doctor_schedules_org_id_idx").on(table.organizationId),
    index("doctor_schedules_org_doctor_idx").on(table.organizationId, table.doctorId),
    check("doctor_schedules_start_before_end", sql`start_time < end_time`),
  ]
);

export const doctorSlotBlocks = pgTable(
  "doctor_slot_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    reason: text("reason"),
    createdVia: text("created_via", { enum: ["WEB", "WHATSAPP"] }).default("WEB").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("doctor_slot_blocks_org_id_idx").on(table.organizationId),
    index("doctor_slot_blocks_org_doc_range_idx").on(
      table.organizationId,
      table.doctorId,
      table.startAt,
      table.endAt
    ),
  ]
);

export type DoctorScheduleEntity = typeof doctorSchedules.$inferSelect;
export type NewDoctorScheduleEntity = typeof doctorSchedules.$inferInsert;
export type DoctorSlotBlockEntity = typeof doctorSlotBlocks.$inferSelect;
export type NewDoctorSlotBlockEntity = typeof doctorSlotBlocks.$inferInsert;
