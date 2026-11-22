import { NextResponse, type NextRequest } from "next/server";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";
import {
  PrescriptionDomainService,
  AlreadyApprovedError,
  PrescriptionNotFoundError,
} from "@/services/domain/prescription-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { clinicId, user } = await requireClinicSession(
      { prescription: ["approve"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    const { id } = await context.params;

    try {
      const approved = await PrescriptionDomainService.approvePrescription({
        organizationId: clinicId,
        prescriptionId: id,
        approvedByUserId: user.id,
      });

      return NextResponse.json({
        success: true,
        prescription: approved,
      });
    } catch (err: unknown) {
      if (err instanceof AlreadyApprovedError) {
        return NextResponse.json(
          { success: false, error: err.message, code: err.code },
          { status: 409 }
        );
      }
      if (err instanceof PrescriptionNotFoundError) {
        return NextResponse.json(
          { success: false, error: err.message, code: err.code },
          { status: 404 }
        );
      }
      throw err;
    }
  } catch (error) {
    return handleAuthError(error);
  }
}
