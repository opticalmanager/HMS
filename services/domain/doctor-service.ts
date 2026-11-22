import "server-only";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { doctors, type DoctorEntity } from "@/db/schema/doctors";
import { normalizePhoneE164 } from "@/lib/phone";
import type { z } from "zod";
import type { createDoctorSchema, updateDoctorSchema } from "@/lib/validations/master-data";

export class DoctorService {
  /**
   * Lists all doctors for a clinic organization.
   */
  static async listDoctors(
    organizationId: string,
    options: { isActiveOnly?: boolean } = {}
  ): Promise<DoctorEntity[]> {
    const conditions = [eq(doctors.organizationId, organizationId)];
    if (options.isActiveOnly) {
      conditions.push(eq(doctors.isActive, true));
    }

    return db
      .select()
      .from(doctors)
      .where(and(...conditions))
      .orderBy(desc(doctors.createdAt));
  }

  /**
   * Finds a doctor by ID with strict tenant isolation.
   */
  static async getDoctorById(
    organizationId: string,
    doctorId: string
  ): Promise<DoctorEntity | null> {
    const [doc] = await db
      .select()
      .from(doctors)
      .where(and(eq(doctors.organizationId, organizationId), eq(doctors.id, doctorId)))
      .limit(1);

    return doc || null;
  }

  /**
   * Finds a doctor associated with a specific Better Auth user ID.
   */
  static async getDoctorByUserId(
    organizationId: string,
    userId: string
  ): Promise<DoctorEntity | null> {
    const [doc] = await db
      .select()
      .from(doctors)
      .where(and(eq(doctors.organizationId, organizationId), eq(doctors.userId, userId)))
      .limit(1);

    return doc || null;
  }

  /**
   * Registers a new doctor under a clinic organization.
   */
  static async createDoctor(
    organizationId: string,
    input: z.infer<typeof createDoctorSchema>
  ): Promise<DoctorEntity> {
    const normalizedPhone = input.phone ? normalizePhoneE164(input.phone) : null;

    const [newDoc] = await db
      .insert(doctors)
      .values({
        organizationId,
        userId: input.userId || null,
        fullName: input.fullName.trim(),
        specialty: input.specialty.trim(),
        phoneE164: normalizedPhone,
        consultationFee: input.consultationFee,
        isActive: input.isActive ?? true,
      })
      .returning();

    return newDoc;
  }

  /**
   * Updates an existing doctor under a clinic organization.
   */
  static async updateDoctor(
    organizationId: string,
    doctorId: string,
    input: z.infer<typeof updateDoctorSchema>
  ): Promise<DoctorEntity | null> {
    const updateValues: Partial<typeof doctors.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.fullName !== undefined) updateValues.fullName = input.fullName.trim();
    if (input.specialty !== undefined) updateValues.specialty = input.specialty.trim();
    if (input.phone !== undefined) {
      updateValues.phoneE164 = input.phone ? normalizePhoneE164(input.phone) : null;
    }
    if (input.consultationFee !== undefined) updateValues.consultationFee = input.consultationFee;
    if (input.userId !== undefined) updateValues.userId = input.userId || null;
    if (input.isActive !== undefined) updateValues.isActive = input.isActive;

    const [updated] = await db
      .update(doctors)
      .set(updateValues)
      .where(and(eq(doctors.organizationId, organizationId), eq(doctors.id, doctorId)))
      .returning();

    return updated || null;
  }
}
