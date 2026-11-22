import { NextResponse, type NextRequest } from "next/server";
import { requireClinicSession, handleAuthError, ForbiddenError } from "@/lib/auth-guard";
import { ScheduleService } from "@/services/domain/schedule-service";
import { DoctorService } from "@/services/domain/doctor-service";
import {
  createDoctorScheduleSchema,
  updateDoctorScheduleBaseSchema,
} from "@/lib/validations/master-data";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await requireClinicSession(
      { schedule: ["read"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId") || undefined;

    const schedules = await ScheduleService.listSchedules(clinicId, doctorId);

    return NextResponse.json({
      success: true,
      count: schedules.length,
      schedules,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Receptionist has only schedule: ['read'], so this rejects receptionist with 403
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

    const parsed = createDoctorScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // RBAC: Doctors can only create schedules for their own doctor ID
    if (role === "doctor") {
      const ownDoctor = await DoctorService.getDoctorByUserId(clinicId, user.id);
      if (!ownDoctor || ownDoctor.id !== parsed.data.doctorId) {
        throw new ForbiddenError("Doctors may only manage their own clinical schedules");
      }
    }

    const newSchedule = await ScheduleService.createSchedule(clinicId, parsed.data);

    return NextResponse.json(
      { success: true, schedule: newSchedule },
      { status: 201 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}

const updateWithIdSchema = updateDoctorScheduleBaseSchema
  .extend({
    id: z.string().uuid("Invalid schedule UUID"),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.startTime < data.endTime;
      }
      return true;
    },
    { message: "Start time must be earlier than end time", path: ["endTime"] }
  );

export async function PUT(request: NextRequest) {
  try {
    // Blocks receptionist with 403
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

    const parsed = updateWithIdSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existingSchedule = await ScheduleService.getScheduleById(clinicId, parsed.data.id);
    if (!existingSchedule) {
      return NextResponse.json(
        { success: false, error: "Schedule not found" },
        { status: 404 }
      );
    }

    // RBAC: Doctor gets 403 when modifying another doctor's schedule
    if (role === "doctor") {
      const ownDoctor = await DoctorService.getDoctorByUserId(clinicId, user.id);
      if (!ownDoctor || ownDoctor.id !== existingSchedule.doctorId) {
        throw new ForbiddenError("Doctors may only modify their own clinical schedules");
      }
    }

    const updated = await ScheduleService.updateSchedule(clinicId, parsed.data.id, parsed.data);

    return NextResponse.json({
      success: true,
      schedule: updated,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { clinicId, role, user } = await requireClinicSession(
      { schedule: ["manage_own"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("id");

    if (!scheduleId) {
      return NextResponse.json(
        { success: false, error: "Schedule ID ('id' query param) is required" },
        { status: 400 }
      );
    }

    const existingSchedule = await ScheduleService.getScheduleById(clinicId, scheduleId);
    if (!existingSchedule) {
      return NextResponse.json(
        { success: false, error: "Schedule not found" },
        { status: 404 }
      );
    }

    // RBAC: Doctor gets 403 when deleting another doctor's schedule
    if (role === "doctor") {
      const ownDoctor = await DoctorService.getDoctorByUserId(clinicId, user.id);
      if (!ownDoctor || ownDoctor.id !== existingSchedule.doctorId) {
        throw new ForbiddenError("Doctors may only delete their own clinical schedules");
      }
    }

    await ScheduleService.deleteSchedule(clinicId, scheduleId);

    return NextResponse.json({
      success: true,
      message: "Schedule removed successfully",
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
