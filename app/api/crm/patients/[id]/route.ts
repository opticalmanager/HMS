import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { patients } from "@/db/schema/patients";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";

const updatePatientSchema = z.object({
  fullName: z.string().min(2).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  phone: z.string().min(10).optional(),
  dateOfBirth: z.string().optional(),
  age: z.number().int().positive().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { clinicId, role } = await requireClinicSession(
      { patient: ["read"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    // IDOR Protection: Strict compound filter scoping by clinicId and id
    const [patient] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.organizationId, clinicId), eq(patients.id, id)))
      .limit(1);

    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: "Patient not found or belongs to another clinic organization",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      clinicId,
      role,
      patient,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { clinicId } = await requireClinicSession(
      { patient: ["update"] },
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

    const parsed = updatePatientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // IDOR Protection: Update strictly where organizationId == clinicId AND id == id
    const [updatedPatient] = await db
      .update(patients)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(and(eq(patients.organizationId, clinicId), eq(patients.id, id)))
      .returning();

    if (!updatedPatient) {
      return NextResponse.json(
        {
          success: false,
          error: "Patient not found or belongs to another clinic organization",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      patient: updatedPatient,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { clinicId } = await requireClinicSession(
      { patient: ["delete"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    // IDOR Protection: Delete strictly scoped by clinicId and id
    const [deletedPatient] = await db
      .delete(patients)
      .where(and(eq(patients.organizationId, clinicId), eq(patients.id, id)))
      .returning();

    if (!deletedPatient) {
      return NextResponse.json(
        {
          success: false,
          error: "Patient not found or belongs to another clinic organization",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Patient record successfully deleted",
      patient: deletedPatient,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
