import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { doctors } from "@/db/schema/doctors";
import { requireClinicSession, handleAuthError, ForbiddenError } from "@/lib/auth-guard";
import { defaultDictationOrchestrator } from "@/modules/ai/copilot/dictation-orchestrator";

export const maxDuration = 60;

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 Megabytes

const jsonDictateSchema = z.object({
  doctorId: z.string().uuid("Invalid doctor UUID"),
  patientId: z.string().uuid("Invalid patient UUID"),
  appointmentId: z.string().uuid("Invalid appointment UUID").optional().nullable(),
  text: z.string().min(3, "Clinical text must be at least 3 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const { clinicId, user, role } = await requireClinicSession(
      { prescription: ["draft"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    const contentType = request.headers.get("content-type") || "";

    let doctorId: string;
    let patientId: string;
    let appointmentId: string | null = null;
    let text: string | undefined;
    let audioBase64: string | undefined;
    let mimeType: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const rawDoctorId = formData.get("doctorId") as string;
      const rawPatientId = formData.get("patientId") as string;
      const rawAppointmentId = formData.get("appointmentId") as string | null;
      const rawText = formData.get("text") as string | null;
      const audioFile = formData.get("audio") as File | null;

      if (!rawDoctorId || !rawPatientId) {
        return NextResponse.json(
          { success: false, error: "doctorId and patientId are required fields" },
          { status: 400 }
        );
      }

      doctorId = rawDoctorId;
      patientId = rawPatientId;
      appointmentId = rawAppointmentId || null;
      text = rawText || undefined;

      if (audioFile && audioFile.size > 0) {
        if (audioFile.size > MAX_AUDIO_BYTES) {
          return NextResponse.json(
            { success: false, error: "Audio recording exceeds maximum 10 MB payload limit.", code: "AI_PAYLOAD_TOO_LARGE" },
            { status: 413 }
          );
        }

        const buffer = Buffer.from(await audioFile.arrayBuffer());
        audioBase64 = buffer.toString("base64");
        mimeType = (audioFile.type || "audio/webm").split(";")[0].trim();
      }
    } else {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid JSON body" },
          { status: 400 }
        );
      }

      const parsed = jsonDictateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      doctorId = parsed.data.doctorId;
      patientId = parsed.data.patientId;
      appointmentId = parsed.data.appointmentId || null;
      text = parsed.data.text;
    }

    // Doctor ownership law: If user is "doctor", they must be linked to the specified doctorId
    if (role === "doctor") {
      const [doctorProfile] = await db
        .select({ id: doctors.id, userId: doctors.userId })
        .from(doctors)
        .where(
          and(
            eq(doctors.organizationId, clinicId),
            eq(doctors.id, doctorId)
          )
        )
        .limit(1);

      if (!doctorProfile || doctorProfile.userId !== user.id) {
        throw new ForbiddenError("Doctor ownership mismatch: You can only dictate prescriptions for your own doctor profile.");
      }
    }

    const result = await defaultDictationOrchestrator.dictateVisit({
      organizationId: clinicId,
      doctorId,
      patientId,
      appointmentId,
      actorUserId: user.id,
      actorRole: role,
      text,
      audioBase64,
      mimeType,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
