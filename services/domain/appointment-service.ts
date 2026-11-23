import "server-only";
import { eq, and, or, desc, lt, gt, sql, inArray } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { appointments, type AppointmentEntity, type NewAppointmentEntity } from "@/db/schema/appointments";
import { doctorSchedules, doctorSlotBlocks } from "@/db/schema/schedules";
import { clinicProfiles } from "@/db/schema/clinic-profiles";
import { enqueueWebhookEvent } from "./notification-service";

export interface AvailableSlot {
  slotStart: string; // ISO 8601 UTC
  slotEnd: string;   // ISO 8601 UTC
  timeSlot: string;  // HH:mm (24h)
  localDisplay: string; // e.g. "10:30 AM"
}

export class SlotConflictError extends Error {
  code = "SLOT_CONFLICT";
  status = 409;
  suggestedSlots: AvailableSlot[];
  constructor(
    message = "This appointment slot has already been booked by another patient.",
    suggestedSlots: AvailableSlot[] = []
  ) {
    super(message);
    this.name = "SlotConflictError";
    this.suggestedSlots = suggestedSlots;
  }
}

export class SlotBlockedError extends Error {
  code = "SLOT_BLOCKED";
  status = 409;
  reason?: string;
  suggestedSlots: AvailableSlot[];
  constructor(
    reason?: string,
    suggestedSlots: AvailableSlot[] = []
  ) {
    super(`Doctor is unavailable during this time${reason ? `: ${reason}` : ""}`);
    this.name = "SlotBlockedError";
    this.reason = reason;
    this.suggestedSlots = suggestedSlots;
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

// -------------------------------------------------------------
// Timezone and Slot Calculation Helpers
// -------------------------------------------------------------

export function localToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const naiveUtc = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(naiveUtc);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value;
  const localYear = Number(getPart("year"));
  const localMonth = Number(getPart("month"));
  const localDay = Number(getPart("day"));
  let localHour = Number(getPart("hour"));
  if (localHour === 24) localHour = 0;
  const localMin = Number(getPart("minute"));
  const localSec = Number(getPart("second"));
  const localAsUtc = new Date(Date.UTC(localYear, localMonth - 1, localDay, localHour, localMin, localSec));
  const offsetMs = localAsUtc.getTime() - naiveUtc.getTime();
  return new Date(naiveUtc.getTime() - offsetMs);
}

export function formatLocalDisplay(date: Date, timeZone: string): string {
  return date.toLocaleTimeString("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function getDayOfWeekInTimezone(dateStr: string, timeZone: string): number {
  const dt = localToUtc(dateStr, "12:00", timeZone);
  const weekdayStr = dt.toLocaleDateString("en-US", { timeZone, weekday: "short" });
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekdayStr] ?? dt.getUTCDay();
}

function parseMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function formatMinutes(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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
   * Computes exact open slots in UTC (TIMESTAMPTZ) and clinic-local formatted strings.
   * Loads clinic timezone from clinic_profiles, doctor_schedules, doctor_slot_blocks,
   * and active appointments.
   */
  static async getAvailableSlots(options: {
    organizationId: string;
    doctorId: string;
    date: string | Date;
    maxSlots?: number;
    filterPastSlots?: boolean;
  }): Promise<AvailableSlot[]> {
    const { organizationId, doctorId } = options;
    const maxSlots = Math.max(1, Math.min(50, options.maxSlots ?? 12));
    const filterPast = options.filterPastSlots ?? false;

    // Normalize date to YYYY-MM-DD string
    let dateStr: string;
    if (options.date instanceof Date) {
      dateStr = options.date.toISOString().split("T")[0];
    } else {
      dateStr = String(options.date).trim();
    }

    // 1. Fetch clinic timezone
    const [profile] = await db
      .select({ timezone: clinicProfiles.timezone })
      .from(clinicProfiles)
      .where(eq(clinicProfiles.organizationId, organizationId))
      .limit(1);

    const timeZone = profile?.timezone || "Asia/Kolkata";

    // 2. Determine day of week in clinic timezone
    const dayOfWeek = getDayOfWeekInTimezone(dateStr, timeZone);

    // 3. Query active doctor schedule blocks for that day of week
    const schedules = await db
      .select()
      .from(doctorSchedules)
      .where(
        and(
          eq(doctorSchedules.organizationId, organizationId),
          eq(doctorSchedules.doctorId, doctorId),
          eq(doctorSchedules.dayOfWeek, dayOfWeek),
          eq(doctorSchedules.isActive, true)
        )
      )
      .orderBy(doctorSchedules.startTime);

    if (schedules.length === 0) {
      return [];
    }

    // Compute start and end of the full day in UTC to query blocks & active bookings
    const dayStartUtc = localToUtc(dateStr, "00:00", timeZone);
    const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000);

    // 4. Query overlapping doctor slot blocks on that date
    const slotBlocks = await db
      .select()
      .from(doctorSlotBlocks)
      .where(
        and(
          eq(doctorSlotBlocks.organizationId, organizationId),
          eq(doctorSlotBlocks.doctorId, doctorId),
          lt(doctorSlotBlocks.startAt, dayEndUtc),
          gt(doctorSlotBlocks.endAt, dayStartUtc)
        )
      );

    // 5. Query active appointments for that doctor on that date
    const activeAppointments = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        timeSlot: appointments.timeSlot,
        slotStart: appointments.slotStart,
        slotEnd: appointments.slotEnd,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          eq(appointments.doctorId, doctorId),
          inArray(appointments.status, ["scheduled", "arrived", "in_consultation"]),
          or(
            eq(appointments.appointmentDate, dateStr),
            and(
              lt(appointments.slotStart, dayEndUtc),
              gt(appointments.slotEnd, dayStartUtc)
            )
          )
        )
      );

    const availableSlots: AvailableSlot[] = [];
    const nowMs = Date.now();

    for (const sched of schedules) {
      const slotDuration = sched.slotDurationMins || 15;
      const startMins = parseMinutes(sched.startTime);
      const endMins = parseMinutes(sched.endTime);

      for (let cur = startMins; cur + slotDuration <= endMins; cur += slotDuration) {
        if (availableSlots.length >= maxSlots) {
          break;
        }

        const slotTimeStr = formatMinutes(cur);
        const slotEndTimeStr = formatMinutes(cur + slotDuration);

        const slotStart = localToUtc(dateStr, slotTimeStr, timeZone);
        const slotEnd = localToUtc(dateStr, slotEndTimeStr, timeZone);

        // Optional filter for past slots
        if (filterPast && slotStart.getTime() <= nowMs) {
          continue;
        }

        // Check if overlaps any slot block
        const isBlocked = slotBlocks.some((b) => b.startAt < slotEnd && b.endAt > slotStart);
        if (isBlocked) {
          continue;
        }

        // Check if overlaps any active appointment
        const isBooked = activeAppointments.some((apt) => {
          if (apt.slotStart && apt.slotEnd) {
            return apt.slotStart < slotEnd && apt.slotEnd > slotStart;
          }
          if (apt.slotStart) {
            return apt.slotStart.getTime() === slotStart.getTime();
          }
          return apt.appointmentDate === dateStr && apt.timeSlot === slotTimeStr;
        });

        if (isBooked) {
          continue;
        }

        availableSlots.push({
          slotStart: slotStart.toISOString(),
          slotEnd: slotEnd.toISOString(),
          timeSlot: slotTimeStr,
          localDisplay: formatLocalDisplay(slotStart, timeZone),
        });
      }

      if (availableSlots.length >= maxSlots) {
        break;
      }
    }

    return availableSlots;
  }

  /**
   * Creates an appointment with atomic concurrency locking, slot block conflict detection,
   * write idempotency, and transactional outbox event creation.
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

    // 2. Fetch clinic timezone for slot normalization
    const [profile] = await db
      .select({ timezone: clinicProfiles.timezone })
      .from(clinicProfiles)
      .where(eq(clinicProfiles.organizationId, clinicId))
      .limit(1);
    const timeZone = profile?.timezone || "Asia/Kolkata";

    // Normalize timestamps
    let parsedStart: Date | null = null;
    let parsedEnd: Date | null = null;

    if (input.slotStart) {
      parsedStart = input.slotStart instanceof Date ? input.slotStart : new Date(input.slotStart);
    } else if (input.appointmentDate && input.timeSlot) {
      parsedStart = localToUtc(input.appointmentDate, input.timeSlot, timeZone);
    }

    if (input.slotEnd) {
      parsedEnd = input.slotEnd instanceof Date ? input.slotEnd : new Date(input.slotEnd);
    } else if (parsedStart) {
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
        let suggestedSlots: AvailableSlot[] = [];
        try {
          suggestedSlots = await AppointmentDomainService.getAvailableSlots({
            organizationId: clinicId,
            doctorId: input.doctorId,
            date: input.appointmentDate,
            maxSlots: 3,
            filterPastSlots: true,
          });
        } catch {
          suggestedSlots = [];
        }
        throw new SlotBlockedError(conflictingBlocks[0].reason || undefined, suggestedSlots);
      }
    }

    // 4. Calculate sequential token number if not supplied
    const tokenNumber = input.tokenNumber || Math.floor(Math.random() * 90 + 10);

    // 5. Atomic write with PostgreSQL partial unique constraint enforcement and Transactional Outbox
    try {
      return await db.transaction(async (tx) => {
        const [newAppointment] = await tx
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

        // Enqueue appointment.confirmed event into webhook_outbox inside same transaction
        await enqueueWebhookEvent(tx, {
          organizationId: clinicId,
          eventType: "appointment.confirmed",
          payload: {
            appointmentId: newAppointment.id,
            doctorId: newAppointment.doctorId,
            patientId: newAppointment.patientId,
            appointmentDate: newAppointment.appointmentDate,
            timeSlot: newAppointment.timeSlot,
            slotStart: newAppointment.slotStart ? newAppointment.slotStart.toISOString() : null,
            slotEnd: newAppointment.slotEnd ? newAppointment.slotEnd.toISOString() : null,
            source: newAppointment.source,
          },
        });

        return { appointment: newAppointment, isDuplicate: false };
      });
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
        let suggestedSlots: AvailableSlot[] = [];
        try {
          suggestedSlots = await AppointmentDomainService.getAvailableSlots({
            organizationId: clinicId,
            doctorId: input.doctorId,
            date: input.appointmentDate,
            maxSlots: 3,
            filterPastSlots: true,
          });
        } catch {
          suggestedSlots = [];
        }

        if (
          detail.includes("slot_start") ||
          detail.includes("slot_concurrency") ||
          err.constraint?.includes("concurrency")
        ) {
          throw new SlotConflictError(
            `Dr. slot at ${input.timeSlot} (${input.appointmentDate}) is already booked by another patient.`,
            suggestedSlots
          );
        }

        throw new SlotConflictError(undefined, suggestedSlots);
      }

      throw err;
    }
  }

  /**
   * Alias for createAppointment satisfying bookAppointment API contract.
   */
  static async bookAppointment(
    clinicId: string,
    input: CreateAppointmentInput
  ): Promise<{ appointment: AppointmentEntity; isDuplicate?: boolean }> {
    return this.createAppointment(clinicId, input);
  }

  /**
   * Reschedules an existing appointment to a new date/time with outbox notification.
   */
  static async rescheduleAppointment(
    clinicId: string,
    appointmentId: string,
    input: {
      appointmentDate: string;
      timeSlot: string;
      slotStart?: Date | string | null;
      slotEnd?: Date | string | null;
    }
  ): Promise<AppointmentEntity | null> {
    return this.updateAppointment(clinicId, appointmentId, {
      appointmentDate: input.appointmentDate,
      timeSlot: input.timeSlot,
      slotStart: input.slotStart,
      slotEnd: input.slotEnd,
    });
  }

  /**
   * Updates an existing appointment with IDOR protection and transactional outbox.
   */
  static async updateAppointment(
    clinicId: string,
    appointmentId: string,
    input: UpdateAppointmentInput
  ): Promise<AppointmentEntity | null> {
    const isRescheduling = Boolean(input.appointmentDate || input.timeSlot || input.slotStart);

    // Fetch existing appointment to guarantee accurate tenant checks, doctor association, and slot recalculation
    const existing = await AppointmentDomainService.getAppointmentById(clinicId, appointmentId);
    if (!existing) {
      return null;
    }

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

    const targetDate = input.appointmentDate || existing.appointmentDate;
    const targetTime = input.timeSlot || existing.timeSlot;

    let parsedStart: Date | null = null;
    let parsedEnd: Date | null = null;

    if (input.slotStart !== undefined) {
      parsedStart = input.slotStart
        ? input.slotStart instanceof Date
          ? input.slotStart
          : new Date(input.slotStart)
        : null;
      updateValues.slotStart = parsedStart;
    }

    if (input.slotEnd !== undefined) {
      parsedEnd = input.slotEnd
        ? input.slotEnd instanceof Date
          ? input.slotEnd
          : new Date(input.slotEnd)
        : null;
      updateValues.slotEnd = parsedEnd;
    }

    if (isRescheduling && !input.slotStart) {
      // Recalculate slotStart and slotEnd in clinic timezone
      const [profile] = await db
        .select({ timezone: clinicProfiles.timezone })
        .from(clinicProfiles)
        .where(eq(clinicProfiles.organizationId, clinicId))
        .limit(1);
      const timeZone = profile?.timezone || "Asia/Kolkata";

      parsedStart = localToUtc(targetDate, targetTime, timeZone);
      parsedEnd = input.slotEnd
        ? parsedEnd
        : new Date(parsedStart.getTime() + 15 * 60 * 1000);

      updateValues.slotStart = parsedStart;
      updateValues.slotEnd = parsedEnd;
    }

    // Verify doctor slot block conflicts if rescheduling to a new slot
    if (isRescheduling && parsedStart && parsedEnd) {
      const conflictingBlocks = await db
        .select()
        .from(doctorSlotBlocks)
        .where(
          and(
            eq(doctorSlotBlocks.organizationId, clinicId),
            eq(doctorSlotBlocks.doctorId, existing.doctorId),
            lt(doctorSlotBlocks.startAt, parsedEnd),
            gt(doctorSlotBlocks.endAt, parsedStart)
          )
        )
        .limit(1);

      if (conflictingBlocks.length > 0) {
        let suggestedSlots: AvailableSlot[] = [];
        try {
          suggestedSlots = await AppointmentDomainService.getAvailableSlots({
            organizationId: clinicId,
            doctorId: existing.doctorId,
            date: targetDate,
            maxSlots: 3,
            filterPastSlots: true,
          });
        } catch {
          suggestedSlots = [];
        }
        throw new SlotBlockedError(conflictingBlocks[0].reason || undefined, suggestedSlots);
      }
    }

    try {
      return await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(appointments)
          .set(updateValues)
          .where(and(eq(appointments.organizationId, clinicId), eq(appointments.id, appointmentId)))
          .returning();

        if (updated && isRescheduling) {
          await enqueueWebhookEvent(tx, {
            organizationId: clinicId,
            eventType: "appointment.rescheduled",
            payload: {
              appointmentId: updated.id,
              doctorId: updated.doctorId,
              patientId: updated.patientId,
              appointmentDate: updated.appointmentDate,
              timeSlot: updated.timeSlot,
              slotStart: updated.slotStart ? updated.slotStart.toISOString() : null,
              slotEnd: updated.slotEnd ? updated.slotEnd.toISOString() : null,
            },
          });
        }

        return updated || null;
      });
    } catch (err: any) {
      const code = err.code || err.cause?.code;
      if (code === "23505") {
        let suggestedSlots: AvailableSlot[] = [];
        try {
          suggestedSlots = await AppointmentDomainService.getAvailableSlots({
            organizationId: clinicId,
            doctorId: existing.doctorId,
            date: targetDate,
            maxSlots: 3,
            filterPastSlots: true,
          });
        } catch {
          suggestedSlots = [];
        }
        throw new SlotConflictError(
          `Dr. slot at ${targetTime} (${targetDate}) is already booked by another patient.`,
          suggestedSlots
        );
      }
      throw err;
    }
  }

  /**
   * Cancels an appointment, instantly releasing the concurrency lock and enqueuing outbox event.
   */
  static async cancelAppointment(
    clinicId: string,
    appointmentId: string
  ): Promise<AppointmentEntity | null> {
    return await db.transaction(async (tx) => {
      const [cancelled] = await tx
        .update(appointments)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(and(eq(appointments.organizationId, clinicId), eq(appointments.id, appointmentId)))
        .returning();

      if (cancelled) {
        await enqueueWebhookEvent(tx, {
          organizationId: clinicId,
          eventType: "appointment.cancelled",
          payload: {
            appointmentId: cancelled.id,
            doctorId: cancelled.doctorId,
            patientId: cancelled.patientId,
            appointmentDate: cancelled.appointmentDate,
            timeSlot: cancelled.timeSlot,
          },
        });
      }

      return cancelled || null;
    });
  }
}
