import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";
import { PrescriptionDomainService } from "@/services/domain/prescription-service";
import { VisitExtractionSchema } from "@/lib/validations/clinical-ai";

const createPrescriptionApiSchema = z.object({
  doctorId: z.string().uuid("Invalid doctor UUID"),
  patientId: z.string().uuid("Invalid patient UUID"),
  appointmentId: z.string().uuid("Invalid appointment UUID").optional().nullable(),
  rawTranscript: z.string().optional().nullable(),
  extraction: VisitExtractionSchema,
});

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await requireClinicSession(
      { prescription: ["read"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId") || undefined;
    const doctorId = searchParams.get("doctorId") || undefined;
    const status = (searchParams.get("status") as "DRAFT" | "APPROVED") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const data = await PrescriptionDomainService.listPrescriptions(clinicId, {
      patientId,
      doctorId,
      status,
      limit,
    });

    return NextResponse.json({
      success: true,
      count: data.length,
      prescriptions: data,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { clinicId } = await requireClinicSession(
      { prescription: ["draft"] },
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

    const parsed = createPrescriptionApiSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const prescription = await PrescriptionDomainService.createDraftPrescription({
      organizationId: clinicId,
      doctorId: parsed.data.doctorId,
      patientId: parsed.data.patientId,
      appointmentId: parsed.data.appointmentId,
      rawTranscript: parsed.data.rawTranscript,
      extraction: parsed.data.extraction,
    });

    return NextResponse.json(
      {
        success: true,
        prescription,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}
