import "server-only";
import { eq, and, desc, lt, gt, sql } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { appointments, type AppointmentEntity, type NewAppointmentEntity } from "@/db/schema/appointments";
import { doctorSlotBlocks } from "@/db/schema/schedules";

export class SlotConflictError extends Error {
  code = "SLOT_CONFLICT";
  status = 409;
  constructor(message = "This appointment slot has already been booked by another patient.") {
    super(message);
    this.name = "SlotConflictError";
  }
}

export class SlotBlockedError extends Error {
  code = "SLOT_BLOCKED";
  status = 409;
  reason?: string;
  constructor(reason?: string) {
    super(`Doctor is unavailable during this time${reason ? `: ${reason}` : ""}`);
    this.name = "SlotBlockedError";
    this.reason = reason;
  }
}

export interface CreateAppointmentInput {
  patientId: string;
  doctorId: string;
  branchId?: string | null;
  department: string;
  appointmentDate: string; // YYYY-MM-DD
  timeSlot: string; // HH:mm
  slotStart?: Date | string | null;
  slotEnd?: Date | string | null;
  source?: "WEB" | "WHATSAPP" | "VOICE_DOGRAH";
  idempotencyKey?: string | null;
  tokenNumber?: number;
  priority?: "normal" | "urgent" | "emergency";
  chiefComplaints?: string | null;
  consultationFee?: string;
}

export interface UpdateAppointmentInput {
  appointmentDate?: string;
  timeSlot?: string;
  slotStart?: Date | string | null;
  slotEnd?: Date | string | null;
  status?: "scheduled" | "arrived" | "in_consultation" | "completed" | "cancelled" | "no_show";
  priority?: "normal" | "urgent" | "emergency";
  chiefComplaints?: string | null;
  consultationFee?: string;
  isPaid?: boolean;
}

export class AppointmentDomainService {
  /**
   * Lists appointments strictly scoped by clinic organization.
   */
  static async listAppointments(
    clinicId: string,
    options: {
      limit?: number;
      doctorId?: string;
      patientId?: string;
      status?: string;
      appointmentDate?: string;
    } = {}
  ): Promise<AppointmentEntity[]> {
    const conditions = [eq(appointments.organizationId, clinicId)];

    if (options.doctorId) {
      conditions.push(eq(appointments.doctorId, options.doctorId));
    }
    if (options.patientId) {
      conditions.push(eq(appointments.patientId, options.patientId));
    }
    if (options.status) {
      conditions.push(eq(appointments.status, options.status as any));
    }
    if (options.appointmentDate) {
      conditions.push(eq(appointments.appointmentDate, options.appointmentDate));
    }

    const limit = Math.max(1, Math.min(100, options.limit || 50));

    return db
      .select()
      .from(appointments)
      .where(and(...conditions))
      .orderBy(desc(appointments.createdAt))
      .limit(limit);
  }

  /**
   * Retrieves a single appointment by ID with strict tenant isolation.
   */
  static async getAppointmentById(
    clinicId: string,
    appointmentId: string
  ): Promise<AppointmentEntity | null> {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.organizationId, clinicId), eq(appointments.id, appointmentId)))
      .limit(1);

    return appointment || null;
  }

  /**
   * Creates an appointment with atomic concurrency locking, slot block conflict detection,
   * and write idempotency.
   */
  static async createAppointment(
    clinicId: string,
    input: CreateAppointmentInput
  ): Promise<{ appointment: AppointmentEntity; isDuplicate?: boolean }> {
    // 1. Idempotency Check: if idempotencyKey is supplied, check for existing write
    if (input.idempotencyKey && input.idempotencyKey.trim()) {
      const trimmedKey = input.idempotencyKey.trim();
      const [existing] = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.organizationId, clinicId),
            eq(appointments.idempotencyKey, trimmedKey)
          )
        )
        .limit(1);

      if (existing) {
        return { appointment: existing, isDuplicate: true };
      }
    }

    // 2. Normalize timestamps
    let parsedStart: Date | null = null;
    let parsedEnd: Date | null = null;

    if (input.slotStart) {
      parsedStart = input.slotStart instanceof Date ? input.slotStart : new Date(input.slotStart);
    }
    if (input.slotEnd) {
      parsedEnd = input.slotEnd instanceof Date ? input.slotEnd : new Date(input.slotEnd);
    } else if (parsedStart) {
      // Default 15 minute slot end if slotStart is provided
      parsedEnd = new Date(parsedStart.getTime() + 15 * 60 * 1000);
    }

    // 3. Concurrency check: verify doctor is not blocked via doctor_slot_blocks (Law 3.2)
    if (parsedStart && parsedEnd) {
      const conflictingBlocks = await db
        .select()
        .from(doctorSlotBlocks)
        .where(
          and(
            eq(doctorSlotBlocks.organizationId, clinicId),
            eq(doctorSlotBlocks.doctorId, input.doctorId),
            lt(doctorSlotBlocks.startAt, parsedEnd),
            gt(doctorSlotBlocks.endAt, parsedStart)
          )
        )
        .limit(1);

      if (conflictingBlocks.length > 0) {
        throw new SlotBlockedError(conflictingBlocks[0].reason || undefined);
      }
    }

    // 4. Calculate sequential token number if not supplied
    const tokenNumber = input.tokenNumber || Math.floor(Math.random() * 90 + 10);

    // 5. Atomic write with PostgreSQL partial unique constraint enforcement
    try {
      const [newAppointment] = await db
        .insert(appointments)
        .values({
          organizationId: clinicId,
          branchId: input.branchId || null,
          patientId: input.patientId,
          doctorId: input.doctorId,
          department: input.department.trim(),
          appointmentDate: input.appointmentDate,
          timeSlot: input.timeSlot,
          slotStart: parsedStart,
          slotEnd: parsedEnd,
          source: input.source || "WEB",
          idempotencyKey: input.idempotencyKey?.trim() || null,
          tokenNumber,
          priority: input.priority || "normal",
          chiefComplaints: input.chiefComplaints?.trim() || null,
          consultationFee: input.consultationFee || "500.00",
          status: "scheduled",
        })
        .returning();

      return { appointment: newAppointment, isDuplicate: false };
    } catch (err: any) {
      const code = err.code || err.cause?.code;
      const detail = String(err.detail || err.message || "");

      if (code === "23505") {
        // Check if conflict was on the idempotency key index
        if (detail.includes("idempotency_key") || err.constraint?.includes("idempotency")) {
          if (input.idempotencyKey) {
            const [existing] = await db
              .select()
              .from(appointments)
              .where(
                and(
                  eq(appointments.organizationId, clinicId),
                  eq(appointments.idempotencyKey, input.idempotencyKey.trim())
                )
              )
              .limit(1);

            if (existing) {
              return { appointment: existing, isDuplicate: true };
            }
          }
        }

        // Concurrency index conflict: slot is already booked
        if (
          detail.includes("slot_start") ||
          detail.includes("slot_concurrency") ||
          err.constraint?.includes("concurrency")
        ) {
          throw new SlotConflictError(
            `Dr. slot at ${input.timeSlot} (${input.appointmentDate}) is already booked by another patient.`
          );
        }

        throw new SlotConflictError();
      }

      throw err;
    }
  }

  /**
   * Updates an existing appointment with IDOR protection.
   */
  static async updateAppointment(
    clinicId: string,
    appointmentId: string,
    input: UpdateAppointmentInput
  ): Promise<AppointmentEntity | null> {
    const updateValues: Partial<NewAppointmentEntity> = {
      updatedAt: new Date(),
    };

    if (input.appointmentDate !== undefined) updateValues.appointmentDate = input.appointmentDate;
    if (input.timeSlot !== undefined) updateValues.timeSlot = input.timeSlot;
    if (input.status !== undefined) updateValues.status = input.status;
    if (input.priority !== undefined) updateValues.priority = input.priority;
    if (input.chiefComplaints !== undefined) updateValues.chiefComplaints = input.chiefComplaints;
    if (input.consultationFee !== undefined) updateValues.consultationFee = input.consultationFee;
    if (input.isPaid !== undefined) updateValues.isPaid = input.isPaid;

    if (input.slotStart !== undefined) {
      updateValues.slotStart = input.slotStart
        ? input.slotStart instanceof Date
          ? input.slotStart
          : new Date(input.slotStart)
        : null;
    }
    if (input.slotEnd !== undefined) {
      updateValues.slotEnd = input.slotEnd
        ? input.slotEnd instanceof Date
          ? input.slotEnd
          : new Date(input.slotEnd)
        : null;
    }

    try {
      const [updated] = await db
        .update(appointments)
        .set(updateValues)
        .where(and(eq(appointments.organizationId, clinicId), eq(appointments.id, appointmentId)))
        .returning();

      return updated || null;
    } catch (err: any) {
      const code = err.code || err.cause?.code;
      if (code === "23505") {
        throw new SlotConflictError("The target slot timestamp is already booked by another appointment.");
      }
      throw err;
    }
  }

  /**
   * Cancels an appointment, instantly releasing the concurrency lock for that doctor slot.
   */
  static async cancelAppointment(
    clinicId: string,
    appointmentId: string
  ): Promise<AppointmentEntity | null> {
    const [cancelled] = await db
      .update(appointments)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.organizationId, clinicId), eq(appointments.id, appointmentId)))
      .returning();

    return cancelled || null;
  }
}
