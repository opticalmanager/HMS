import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq, desc, ilike, or, and } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { patients } from "@/db/schema/patients";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";

const createPatientSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  gender: z.enum(["male", "female", "other"]).default("male"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  uhid: z.string().optional(),
  dateOfBirth: z.string().optional().or(z.literal("")),
  age: z.number().int().positive().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  abhaId: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { clinicId, role } = await requireClinicSession(
      { patient: ["read"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("query") || searchParams.get("search") || "").trim();

    const conditions = [eq(patients.organizationId, clinicId)];
    if (query) {
      conditions.push(
        or(
          ilike(patients.fullName, `%${query}%`),
          ilike(patients.phone, `%${query}%`),
          ilike(patients.uhid, `%${query}%`)
        )!
      );
    }

    // Strict tenant isolation: EVERY query MUST explicitly filter by clinicId
    const data = await db
      .select()
      .from(patients)
      .where(and(...conditions))
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
    return handleAuthError(error);
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

    const {
      fullName,
      gender,
      phone,
      dateOfBirth,
      age,
      email,
      address,
      city,
      pincode,
      bloodGroup,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      abhaId,
      allergies,
      chronicConditions,
    } = parsed.data;

    const cleanPhone = phone.replace(/\D/g, "");
    const phoneE164 = phone.startsWith("+") ? phone : `+91${cleanPhone}`;
    const uhid = parsed.data.uhid || `UHID-${Date.now().toString().slice(-6)}`;

    // Strict tenant isolation: check if patient already exists in this clinic by phone
    const [existingPatient] = await db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.organizationId, clinicId),
          or(
            eq(patients.phoneE164, phoneE164),
            eq(patients.phone, cleanPhone)
          )
        )
      )
      .limit(1);

    if (existingPatient) {
      // If patient exists and fullName was updated, sync it
      if (fullName && fullName.trim() !== existingPatient.fullName) {
        const [updated] = await db
          .update(patients)
          .set({
            fullName: fullName.trim(),
            updatedAt: new Date(),
          })
          .where(and(eq(patients.organizationId, clinicId), eq(patients.id, existingPatient.id)))
          .returning();
        return NextResponse.json(
          { success: true, patient: updated, isExisting: true },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { success: true, patient: existingPatient, isExisting: true },
        { status: 200 }
      );
    }

    try {
      // Strict tenant isolation: organizationId ALWAYS comes from requireClinicSession
      const [newPatient] = await db
        .insert(patients)
        .values({
          organizationId: clinicId,
          uhid,
          fullName,
          gender,
          phone: cleanPhone,
          phoneE164,
          dateOfBirth: dateOfBirth || null,
          age: age || null,
          email: email || null,
          address: address || null,
          city: city || null,
          pincode: pincode || null,
          bloodGroup: bloodGroup || null,
          emergencyContactName: emergencyContactName || null,
          emergencyContactPhone: emergencyContactPhone || null,
          emergencyContactRelation: emergencyContactRelation || null,
          abhaId: abhaId || null,
          allergies: allergies || [],
          chronicConditions: chronicConditions || [],
        })
        .returning();

      return NextResponse.json(
        { success: true, patient: newPatient },
        { status: 201 }
      );
    } catch (insertErr: any) {
      if (insertErr?.code === "23505" || insertErr?.message?.includes("unique")) {
        const [conflictPatient] = await db
          .select()
          .from(patients)
          .where(
            and(
              eq(patients.organizationId, clinicId),
              or(eq(patients.phoneE164, phoneE164), eq(patients.phone, cleanPhone))
            )
          )
          .limit(1);

        if (conflictPatient) {
          return NextResponse.json(
            { success: true, patient: conflictPatient, isExisting: true },
            { status: 200 }
          );
        }
      }
      throw insertErr;
    }
  } catch (error) {
    return handleAuthError(error);
  }
}
