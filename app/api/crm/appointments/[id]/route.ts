import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { appointments } from "@/db/schema/appointments";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";

const updateAppointmentSchema = z.object({
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD").optional(),
  timeSlot: z.string().min(1).optional(),
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

    // IDOR Protection: Strict compound filter scoping by clinicId and id
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.organizationId, clinicId), eq(appointments.id, id)))
      .limit(1);

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

    // IDOR Protection: Update strictly where organizationId == clinicId AND id == id
    const [updatedAppointment] = await db
      .update(appointments)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.organizationId, clinicId), eq(appointments.id, id)))
      .returning();

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

    // IDOR Protection: Soft cancel or delete strictly scoped by clinicId and id
    const [cancelled] = await db
      .update(appointments)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.organizationId, clinicId), eq(appointments.id, id)))
      .returning();

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
