import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";
import {
  AppointmentDomainService,
  SlotConflictError,
  SlotBlockedError,
} from "@/services/domain/appointment-service";

const updateAppointmentSchema = z.object({
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD").optional(),
  timeSlot: z.string().min(1).optional(),
  slotStart: z.string().datetime({ offset: true }).or(z.date()).optional().nullable(),
  slotEnd: z.string().datetime({ offset: true }).or(z.date()).optional().nullable(),
  status: z
    .enum(["scheduled", "arrived", "in_consultation", "completed", "cancelled", "no_show"])
    .optional(),
  priority: z.enum(["normal", "urgent", "emergency"]).optional(),
  chiefComplaints: z.string().optional(),
  consultationFee: z.string().optional(),
  isPaid: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { clinicId, role } = await requireClinicSession(
      { appointment: ["read"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    // IDOR Protection: Strict compound filter scoping via domain service
    const appointment = await AppointmentDomainService.getAppointmentById(clinicId, id);

    if (!appointment) {
      return NextResponse.json(
        {
          success: false,
          error: "Appointment not found or belongs to another clinic organization",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      clinicId,
      role,
      appointment,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { clinicId } = await requireClinicSession(
      { appointment: ["update"] },
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

    const parsed = updateAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    try {
      // IDOR Protection: Update strictly where organizationId == clinicId AND id == id
      const updatedAppointment = await AppointmentDomainService.updateAppointment(
        clinicId,
        id,
        parsed.data
      );

      if (!updatedAppointment) {
        return NextResponse.json(
          {
            success: false,
            error: "Appointment not found or belongs to another clinic organization",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        appointment: updatedAppointment,
      });
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

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { clinicId } = await requireClinicSession(
      { appointment: ["cancel"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    // IDOR Protection: Soft cancel strictly scoped by clinicId and id, freeing slot lock
    const cancelled = await AppointmentDomainService.cancelAppointment(clinicId, id);

    if (!cancelled) {
      return NextResponse.json(
        {
          success: false,
          error: "Appointment not found or belongs to another clinic organization",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Appointment successfully cancelled",
      appointment: cancelled,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
