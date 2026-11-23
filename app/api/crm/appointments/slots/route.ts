import { NextResponse, type NextRequest } from "next/server";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";
import { AppointmentDomainService } from "@/services/domain/appointment-service";

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await requireClinicSession(
      { appointment: ["read"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId");
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    if (!doctorId) {
      return NextResponse.json(
        { success: false, error: "doctorId query parameter is required" },
        { status: 400 }
      );
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const isToday = date === todayStr;

    // Fetch verified available slots against doctor schedules, slot blocks & active appointments
    const availableSlots = await AppointmentDomainService.getAvailableSlots({
      organizationId: clinicId,
      doctorId,
      date,
      maxSlots: 50,
      filterPastSlots: isToday,
    });

    return NextResponse.json({
      success: true,
      doctorId,
      date,
      slots: availableSlots,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
