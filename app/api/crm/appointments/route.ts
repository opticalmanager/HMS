import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { appointments } from "@/db/schema/appointments";
import { requireClinicSession, ClinicAuthError } from "@/lib/auth-guard";

const createAppointmentSchema = z.object({
  patientId: z.string().uuid("Invalid patient UUID"),
  doctorId: z.string().uuid("Invalid doctor UUID"),
  branchId: z.string().uuid("Invalid branch UUID"),
  department: z.string().min(1, "Department is required"),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  timeSlot: z.string().min(1, "Time slot is required"),
  tokenNumber: z.number().int().positive().optional(),
  priority: z.enum(["normal", "urgent", "emergency"]).default("normal"),
  chiefComplaints: z.string().optional(),
  consultationFee: z.string().default("500.00"),
});

export async function GET(request: NextRequest) {
  try {
    const { clinicId, role } = await requireClinicSession(
      { appointment: ["read"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    // Strict tenant isolation: EVERY query MUST explicitly filter by clinicId
    const data = await db
      .select()
      .from(appointments)
      .where(eq(appointments.organizationId, clinicId))
      .orderBy(desc(appointments.createdAt))
      .limit(50);

    return NextResponse.json({
      success: true,
      clinicId,
      role,
      count: data.length,
      appointments: data,
    });
  } catch (error) {
    if (error instanceof ClinicAuthError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal server error fetching appointments" },
      { status: 500 }
    );
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

    const tokenNumber = parsed.data.tokenNumber || Math.floor(Math.random() * 90 + 10);

    // Strict tenant isolation: organizationId ALWAYS comes from requireClinicSession
    const [newAppointment] = await db
      .insert(appointments)
      .values({
        organizationId: clinicId,
        branchId: parsed.data.branchId,
        patientId: parsed.data.patientId,
        doctorId: parsed.data.doctorId,
        department: parsed.data.department,
        appointmentDate: parsed.data.appointmentDate,
        timeSlot: parsed.data.timeSlot,
        tokenNumber,
        priority: parsed.data.priority,
        chiefComplaints: parsed.data.chiefComplaints,
        consultationFee: parsed.data.consultationFee,
      })
      .returning();

    return NextResponse.json(
      { success: true, appointment: newAppointment },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ClinicAuthError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal server error creating appointment" },
      { status: 500 }
    );
  }
}
