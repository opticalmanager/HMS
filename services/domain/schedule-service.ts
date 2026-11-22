import "server-only";
import { eq, and, asc, desc, gte, lte } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import {
  doctorSchedules,
  doctorSlotBlocks,
  type DoctorScheduleEntity,
  type DoctorSlotBlockEntity,
} from "@/db/schema/schedules";
import type { z } from "zod";
import type {
  createDoctorScheduleSchema,
  updateDoctorScheduleSchema,
  createDoctorSlotBlockSchema,
} from "@/lib/validations/master-data";

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
    input: z.infer<typeof createDoctorScheduleSchema>
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
   * Blocks doctor calendar slots for breaks, meetings, or leave.
   */
  static async createSlotBlock(
    organizationId: string,
    input: z.infer<typeof createDoctorSlotBlockSchema>,
    createdByUserId?: string
  ): Promise<DoctorSlotBlockEntity> {
    const [created] = await db
      .insert(doctorSlotBlocks)
      .values({
        organizationId,
        doctorId: input.doctorId,
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        reason: input.reason?.trim() || null,
        createdVia: input.createdVia || "WEB",
        createdByUserId: createdByUserId || null,
      })
      .returning();

    return created;
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
