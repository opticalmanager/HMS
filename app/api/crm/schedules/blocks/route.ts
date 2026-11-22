import { NextResponse, type NextRequest } from "next/server";
import { requireClinicSession, handleAuthError, ForbiddenError } from "@/lib/auth-guard";
import { ScheduleService } from "@/services/domain/schedule-service";
import { DoctorService } from "@/services/domain/doctor-service";
import { createDoctorSlotBlockSchema } from "@/lib/validations/master-data";

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await requireClinicSession(
      { schedule: ["read"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId") || undefined;
    const fromStr = searchParams.get("fromDate");
    const toStr = searchParams.get("toDate");

    const fromDate = fromStr ? new Date(fromStr) : undefined;
    const toDate = toStr ? new Date(toStr) : undefined;

    const blocks = await ScheduleService.listSlotBlocks(clinicId, {
      doctorId,
      fromDate,
      toDate,
    });

    return NextResponse.json({
      success: true,
      count: blocks.length,
      blocks,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Receptionist has no manage permission -> 403
    const { clinicId, role, user } = await requireClinicSession(
      { schedule: ["manage_own"] },
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

    const parsed = createDoctorSlotBlockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // RBAC: Doctors may only block their own slots
    if (role === "doctor") {
      const ownDoctor = await DoctorService.getDoctorByUserId(clinicId, user.id);
      if (!ownDoctor || ownDoctor.id !== parsed.data.doctorId) {
        throw new ForbiddenError("Doctors may only block their own schedule slots");
      }
    }

    const newBlock = await ScheduleService.createSlotBlock(clinicId, parsed.data, user.id);

    return NextResponse.json(
      { success: true, block: newBlock },
      { status: 201 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Receptionist has no manage permission -> 403
    const { clinicId, role, user } = await requireClinicSession(
      { schedule: ["manage_own"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    const { searchParams } = new URL(request.url);
    const blockId = searchParams.get("id");

    if (!blockId) {
      return NextResponse.json(
        { success: false, error: "Block ID ('id' query param) is required" },
        { status: 400 }
      );
    }

    const existingBlock = await ScheduleService.getSlotBlockById(clinicId, blockId);
    if (!existingBlock) {
      return NextResponse.json(
        { success: false, error: "Slot block not found" },
        { status: 404 }
      );
    }

    if (role === "doctor") {
      const ownDoctor = await DoctorService.getDoctorByUserId(clinicId, user.id);
      if (!ownDoctor || ownDoctor.id !== existingBlock.doctorId) {
        throw new ForbiddenError("Doctors may only delete their own slot blocks");
      }
    }

    await ScheduleService.deleteSlotBlock(clinicId, blockId);

    return NextResponse.json({
      success: true,
      message: "Slot block removed successfully",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
