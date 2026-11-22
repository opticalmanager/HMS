import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { patients } from "@/db/schema/patients";
import { requireClinicSession, ClinicAuthError } from "@/lib/auth-guard";

const createPatientSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  gender: z.enum(["male", "female", "other"]),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  uhid: z.string().optional(),
  dateOfBirth: z.string().optional(),
  age: z.number().int().positive().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { clinicId, role } = await requireClinicSession(
      { patient: ["read"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    // Strict tenant isolation: EVERY query MUST explicitly filter by clinicId
    const data = await db
      .select()
      .from(patients)
      .where(eq(patients.organizationId, clinicId))
      .orderBy(desc(patients.createdAt))
      .limit(50);

    return NextResponse.json({
      success: true,
      clinicId,
      role,
      count: data.length,
      patients: data,
    });
  } catch (error) {
    if (error instanceof ClinicAuthError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal server error fetching patients" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { clinicId } = await requireClinicSession(
      { patient: ["create"] },
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
    const parsed = createPatientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { fullName, gender, phone, dateOfBirth, age, email, address, bloodGroup } = parsed.data;
    const uhid = parsed.data.uhid || `UHID-${Date.now().toString().slice(-6)}`;

    // Strict tenant isolation: organizationId ALWAYS comes from requireClinicSession
    const [newPatient] = await db
      .insert(patients)
      .values({
        organizationId: clinicId,
        uhid,
        fullName,
        gender,
        phone,
        dateOfBirth,
        age,
        email,
        address,
        bloodGroup,
      })
      .returning();

    return NextResponse.json(
      { success: true, patient: newPatient },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ClinicAuthError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal server error creating patient" },
      { status: 500 }
    );
  }
}
