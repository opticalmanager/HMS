import { NextResponse, type NextRequest } from "next/server";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";
import { ClinicService } from "@/services/domain/clinic-service";
import { updateClinicProfileSchema } from "@/lib/validations/master-data";

export async function GET(request: NextRequest) {
  try {
    const { clinicId, role } = await requireClinicSession(
      { clinic: ["read"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    const profile = await ClinicService.getClinicProfile(clinicId);

    return NextResponse.json({
      success: true,
      clinicId,
      role,
      profile,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { clinicId, role } = await requireClinicSession(
      { clinic: ["update"] },
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

    const parsed = updateClinicProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await ClinicService.updateClinicProfile(clinicId, parsed.data);

    return NextResponse.json({
      success: true,
      clinicId,
      role,
      profile: updated,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
