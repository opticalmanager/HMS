import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { doctors } from "@/db/schema/doctors";
import { requireClinicSession, handleAuthError, ForbiddenError } from "@/lib/auth-guard";
import { ScheduleService } from "@/services/domain/schedule-service";
import { AppointmentDomainService } from "@/services/domain/appointment-service";

const confirmBlockSlotSchema = z.object({
  action: z.literal("CONFIRM_BLOCK_SLOT"),
  doctorId: z.string().uuid("Invalid doctor UUID"),
  startAt: z.string(),
  endAt: z.string(),
  reason: z.string().optional().nullable(),
  notifyAffectedPatients: z.boolean().optional().default(true),
});

const confirmBookFollowupSchema = z.object({
  action: z.literal("CONFIRM_BOOK_FOLLOWUP"),
  patientId: z.string().uuid("Invalid patient UUID"),
  doctorId: z.string().uuid("Invalid doctor UUID"),
  department: z.string().default("General Medicine"),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  timeSlot: z.string().regex(/^\d{1,2}:\d{2}$/, "Format must be HH:mm"),
  chiefComplaints: z.string().optional().nullable(),
});

const confirmActionSchema = z.discriminatedUnion("action", [
  confirmBlockSlotSchema,
  confirmBookFollowupSchema,
]);

export async function POST(request: NextRequest) {
  try {
    const { clinicId, user, role } = await requireClinicSession(
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = confirmActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.action === "CONFIRM_BLOCK_SLOT") {
      // Role check: Only owner, admin, or doctor can block slots
      if (role !== "owner" && role !== "admin" && role !== "doctor") {
        throw new ForbiddenError("Insufficient permission to block doctor slots.");
      }

      if (role === "doctor") {
        const [doctorProfile] = await db
          .select({ id: doctors.id, userId: doctors.userId })
          .from(doctors)
          .where(
            and(
              eq(doctors.organizationId, clinicId),
              eq(doctors.id, parsed.data.doctorId)
            )
          )
          .limit(1);

        if (!doctorProfile || doctorProfile.userId !== user.id) {
          throw new ForbiddenError("Doctor ownership mismatch: You can only block slots for your own doctor profile.");
        }
      }

      // Step 2 of 2-Step Destructive Action: dryRun = false
      const result = await ScheduleService.blockDoctorSlot(clinicId, {
        doctorId: parsed.data.doctorId,
        startAt: new Date(parsed.data.startAt),
        endAt: new Date(parsed.data.endAt),
        reason: parsed.data.reason || "Doctor schedule blocked via Copilot",
        createdByUserId: user.id,
        createdVia: "WEB",
        notifyAffectedPatients: parsed.data.notifyAffectedPatients ?? true,
        dryRun: false,
      });

      return NextResponse.json({
        success: true,
        action: "CONFIRM_BLOCK_SLOT",
        result,
      });
    }

    if (parsed.data.action === "CONFIRM_BOOK_FOLLOWUP") {
      // Book appointment atomically
      const appointment = await AppointmentDomainService.createAppointment(clinicId, {
        patientId: parsed.data.patientId,
        doctorId: parsed.data.doctorId,
        department: parsed.data.department,
        appointmentDate: parsed.data.appointmentDate,
        timeSlot: parsed.data.timeSlot,
        chiefComplaints: parsed.data.chiefComplaints || "Follow-up consultation",
        source: "WEB",
      });

      return NextResponse.json({
        success: true,
        action: "CONFIRM_BOOK_FOLLOWUP",
        appointment,
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return handleAuthError(error);
  }
}
