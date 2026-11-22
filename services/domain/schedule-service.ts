import "server-only";
import { eq, and, asc, desc, gte, lte, inArray, lt, gt } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import {
  doctorSchedules,
  doctorSlotBlocks,
  type DoctorScheduleEntity,
  type DoctorSlotBlockEntity,
} from "@/db/schema/schedules";
import { appointments } from "@/db/schema/appointments";
import { patients } from "@/db/schema/patients";
import { enqueueWebhookEvent } from "./notification-service";
import type { z } from "zod";
import type {
  createDoctorScheduleSchema,
  updateDoctorScheduleSchema,
  createDoctorSlotBlockSchema,
} from "@/lib/validations/master-data";

export interface ConflictingAppointment {
  appointmentId: string;
  patientName: string;
  slotStart: Date | null;
  appointmentDate?: string;
  timeSlot?: string;
}

export interface BlockDoctorSlotInput {
  doctorId: string;
  startAt: Date | string;
  endAt: Date | string;
  reason?: string | null;
  createdVia?: "WEB" | "WHATSAPP";
  createdByUserId?: string | null;
  notifyAffectedPatients?: boolean;
  dryRun?: boolean;
}

export interface BlockDoctorSlotResult {
  dryRun: boolean;
  requiresConfirmation: boolean;
  conflictCount: number;
  conflicts: ConflictingAppointment[];
  block?: DoctorSlotBlockEntity;
}

export class ScheduleService {
  /**
   * Retrieves recurring weekly schedules for all doctors or a specific doctor.
   */
  static async listSchedules(
    organizationId: string,
    doctorId?: string
  ): Promise<DoctorScheduleEntity[]> {
    const conditions = [eq(doctorSchedules.organizationId, organizationId)];
    if (doctorId) {
      conditions.push(eq(doctorSchedules.doctorId, doctorId));
    }

    return db
      .select()
      .from(doctorSchedules)
      .where(and(...conditions))
      .orderBy(asc(doctorSchedules.dayOfWeek), asc(doctorSchedules.startTime));
  }

  /**
   * Retrieves a single doctor schedule by ID.
   */
  static async getScheduleById(
    organizationId: string,
    scheduleId: string
  ): Promise<DoctorScheduleEntity | null> {
    const [row] = await db
      .select()
      .from(doctorSchedules)
      .where(and(eq(doctorSchedules.organizationId, organizationId), eq(doctorSchedules.id, scheduleId)))
      .limit(1);

    return row || null;
  }

  /**
   * Creates a recurring weekly schedule block for a doctor.
   */
  static async createSchedule(
    organizationId: string,
    input: z.input<typeof createDoctorScheduleSchema>
  ): Promise<DoctorScheduleEntity> {
    const [created] = await db
      .insert(doctorSchedules)
      .values({
        organizationId,
        doctorId: input.doctorId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        slotDurationMins: input.slotDurationMins ?? 15,
        isActive: input.isActive ?? true,
      })
      .returning();

    return created;
  }

  /**
   * Updates an existing doctor recurring schedule block.
   */
  static async updateSchedule(
    organizationId: string,
    scheduleId: string,
    input: z.infer<typeof updateDoctorScheduleSchema>
  ): Promise<DoctorScheduleEntity | null> {
    const updateValues: Partial<typeof doctorSchedules.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.dayOfWeek !== undefined) updateValues.dayOfWeek = input.dayOfWeek;
    if (input.startTime !== undefined) updateValues.startTime = input.startTime;
    if (input.endTime !== undefined) updateValues.endTime = input.endTime;
    if (input.slotDurationMins !== undefined) updateValues.slotDurationMins = input.slotDurationMins;
    if (input.isActive !== undefined) updateValues.isActive = input.isActive;

    const [updated] = await db
      .update(doctorSchedules)
      .set(updateValues)
      .where(and(eq(doctorSchedules.organizationId, organizationId), eq(doctorSchedules.id, scheduleId)))
      .returning();

    return updated || null;
  }

  /**
   * Deletes an existing doctor recurring schedule block.
   */
  static async deleteSchedule(
    organizationId: string,
    scheduleId: string
  ): Promise<boolean> {
    const result = await db
      .delete(doctorSchedules)
      .where(and(eq(doctorSchedules.organizationId, organizationId), eq(doctorSchedules.id, scheduleId)))
      .returning();

    return result.length > 0;
  }

  /**
   * Lists doctor slot blocks (leave, breaks, off-duty) with optional date filtering.
   */
  static async listSlotBlocks(
    organizationId: string,
    options: { doctorId?: string; fromDate?: Date; toDate?: Date } = {}
  ): Promise<DoctorSlotBlockEntity[]> {
    const conditions = [eq(doctorSlotBlocks.organizationId, organizationId)];

    if (options.doctorId) {
      conditions.push(eq(doctorSlotBlocks.doctorId, options.doctorId));
    }
    if (options.fromDate) {
      conditions.push(gte(doctorSlotBlocks.endAt, options.fromDate));
    }
    if (options.toDate) {
      conditions.push(lte(doctorSlotBlocks.startAt, options.toDate));
    }

    return db
      .select()
      .from(doctorSlotBlocks)
      .where(and(...conditions))
      .orderBy(desc(doctorSlotBlocks.startAt));
  }

  /**
   * Retrieves a single slot block by ID.
   */
  static async getSlotBlockById(
    organizationId: string,
    blockId: string
  ): Promise<DoctorSlotBlockEntity | null> {
    const [row] = await db
      .select()
      .from(doctorSlotBlocks)
      .where(and(eq(doctorSlotBlocks.organizationId, organizationId), eq(doctorSlotBlocks.id, blockId)))
      .limit(1);

    return row || null;
  }

  /**
   * Mandatory 2-Step Conflict Check for Doctor Slot Blocking:
   * Queries overlapping active appointments in [startAt, endAt].
   * dryRun === true: returns conflict summary without DB write.
   * dryRun === false: inserts doctor_slot_blocks and enqueues appointment.reschedule_needed
   * events in webhook_outbox inside same transaction if notifyAffectedPatients is true.
   */
  static async blockDoctorSlot(
    organizationId: string,
    input: BlockDoctorSlotInput
  ): Promise<BlockDoctorSlotResult> {
    const parsedStart = input.startAt instanceof Date ? input.startAt : new Date(input.startAt);
    const parsedEnd = input.endAt instanceof Date ? input.endAt : new Date(input.endAt);
    const dryRun = input.dryRun ?? false;

    // 1. Query overlapping active appointments
    const overlapping = await db
      .select({
        appointmentId: appointments.id,
        patientId: appointments.patientId,
        patientName: patients.fullName,
        slotStart: appointments.slotStart,
        appointmentDate: appointments.appointmentDate,
        timeSlot: appointments.timeSlot,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          eq(appointments.doctorId, input.doctorId),
          inArray(appointments.status, ["scheduled", "arrived", "in_consultation"]),
          lt(appointments.slotStart, parsedEnd),
          gt(appointments.slotEnd, parsedStart)
        )
      );

    const conflicts: ConflictingAppointment[] = overlapping.map((row) => ({
      appointmentId: row.appointmentId,
      patientName: row.patientName || "Unknown Patient",
      slotStart: row.slotStart,
      appointmentDate: row.appointmentDate,
      timeSlot: row.timeSlot,
    }));

    // If dry run, return conflict report immediately without touching the DB
    if (dryRun) {
      return {
        dryRun: true,
        requiresConfirmation: conflicts.length > 0,
        conflictCount: conflicts.length,
        conflicts,
      };
    }

    // dryRun === false: execute insert and notification inside transaction
    return await db.transaction(async (tx) => {
      const [block] = await tx
        .insert(doctorSlotBlocks)
        .values({
          organizationId,
          doctorId: input.doctorId,
          startAt: parsedStart,
          endAt: parsedEnd,
          reason: input.reason?.trim() || null,
          createdVia: input.createdVia || "WEB",
          createdByUserId: input.createdByUserId || null,
        })
        .returning();

      if (input.notifyAffectedPatients && conflicts.length > 0) {
        for (const c of conflicts) {
          await enqueueWebhookEvent(tx, {
            organizationId,
            eventType: "appointment.reschedule_needed",
            payload: {
              appointmentId: c.appointmentId,
              doctorId: input.doctorId,
              patientName: c.patientName,
              slotStart: c.slotStart ? c.slotStart.toISOString() : null,
              reason: input.reason || "Doctor unavailable",
            },
          });
        }
      }

      return {
        dryRun: false,
        requiresConfirmation: false,
        conflictCount: conflicts.length,
        conflicts,
        block,
      };
    });
  }

  /**
   * Blocks doctor calendar slots for breaks, meetings, or leave (convenience wrapper).
   */
  static async createSlotBlock(
    organizationId: string,
    input: z.infer<typeof createDoctorSlotBlockSchema>,
    createdByUserId?: string
  ): Promise<DoctorSlotBlockEntity> {
    const result = await this.blockDoctorSlot(organizationId, {
      doctorId: input.doctorId,
      startAt: input.startAt,
      endAt: input.endAt,
      reason: input.reason,
      createdVia: input.createdVia,
      createdByUserId,
      dryRun: false,
    });

    return result.block!;
  }

  /**
   * Removes an existing doctor slot block.
   */
  static async deleteSlotBlock(
    organizationId: string,
    blockId: string
  ): Promise<boolean> {
    const result = await db
      .delete(doctorSlotBlocks)
      .where(and(eq(doctorSlotBlocks.organizationId, organizationId), eq(doctorSlotBlocks.id, blockId)))
      .returning();

    return result.length > 0;
  }
}
