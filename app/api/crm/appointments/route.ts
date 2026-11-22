import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";
import {
  AppointmentDomainService,
  SlotConflictError,
  SlotBlockedError,
} from "@/services/domain/appointment-service";

const createAppointmentSchema = z.object({
  patientId: z.string().uuid("Invalid patient UUID"),
  doctorId: z.string().uuid("Invalid doctor UUID"),
  branchId: z.string().uuid("Invalid branch UUID").nullable().optional(),
  department: z.string().min(1, "Department is required"),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  timeSlot: z.string().min(1, "Time slot is required"),
  slotStart: z.string().datetime({ offset: true }).or(z.date()).optional().nullable(),
  slotEnd: z.string().datetime({ offset: true }).or(z.date()).optional().nullable(),
  source: z.enum(["WEB", "WHATSAPP", "VOICE_DOGRAH"]).default("WEB"),
  idempotencyKey: z.string().trim().min(1).optional().nullable(),
  tokenNumber: z.number().int().positive().optional(),
  priority: z.enum(["normal", "urgent", "emergency"]).default("normal"),
  chiefComplaints: z.string().optional().nullable(),
  consultationFee: z.string().or(z.number()).transform((v) => String(v)).default("500.00"),
});

export async function GET(request: NextRequest) {
  try {
    const { clinicId, role } = await requireClinicSession(
      { appointment: ["read"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId") || undefined;
    const patientId = searchParams.get("patientId") || undefined;
    const status = searchParams.get("status") || undefined;
    const appointmentDate = searchParams.get("date") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    // Strict tenant isolation: Single Domain Service Layer
    const data = await AppointmentDomainService.listAppointments(clinicId, {
      doctorId,
      patientId,
      status,
      appointmentDate,
      limit,
    });

    return NextResponse.json({
      success: true,
      clinicId,
      role,
      count: data.length,
      appointments: data,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { clinicId } = await requireClinicSession(
      { appointment: ["create"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body" },
        { status: 400 }
      );
    }
    const parsed = createAppointmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    try {
      // Concurrency locks, slot blocks & idempotency managed by single domain service
      const result = await AppointmentDomainService.createAppointment(clinicId, parsed.data);

      return NextResponse.json(
        {
          success: true,
          appointment: result.appointment,
          duplicate: result.isDuplicate ?? false,
        },
        { status: result.isDuplicate ? 200 : 201 }
      );
    } catch (err: unknown) {
      if (err instanceof SlotConflictError || err instanceof SlotBlockedError) {
        return NextResponse.json(
          { success: false, error: err.message, code: err.code },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (error) {
    return handleAuthError(error);
  }
}
