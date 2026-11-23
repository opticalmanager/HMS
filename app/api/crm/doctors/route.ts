import { NextResponse, type NextRequest } from "next/server";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";
import { DoctorService } from "@/services/domain/doctor-service";

export async function GET(request: NextRequest) {
  try {
    const { clinicId, role } = await requireClinicSession(
      { clinic: ["read"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    const docList = await DoctorService.listDoctors(clinicId, { isActiveOnly: true });

    return NextResponse.json({
      success: true,
      clinicId,
      role,
      count: docList.length,
      doctors: docList,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
