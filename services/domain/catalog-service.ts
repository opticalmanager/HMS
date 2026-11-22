import "server-only";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import {
  medicineMaster,
  serviceTariffs,
  type MedicineMasterEntity,
  type ServiceTariffEntity,
} from "@/db/schema/catalog";
import { fuzzyMatchMedicines, fuzzyMatchTariffs, type FuzzyMedicineResult, type FuzzyTariffResult } from "@/lib/fuzzy-search";
import type { z } from "zod";
import type {
  createMedicineSchema,
  updateMedicineSchema,
  createTariffSchema,
  updateTariffSchema,
} from "@/lib/validations/master-data";

export class CatalogService {
  /**
   * Retrieves medicines for a clinic. If query is provided, performs pg_trgm fuzzy matching.
   */
  static async listMedicines(
    organizationId: string,
    query?: string,
    limit = 50
  ): Promise<Array<MedicineMasterEntity | FuzzyMedicineResult>> {
    if (query && query.trim()) {
      return fuzzyMatchMedicines(organizationId, query.trim(), limit);
    }

    return db
      .select()
      .from(medicineMaster)
      .where(eq(medicineMaster.organizationId, organizationId))
      .orderBy(asc(medicineMaster.brandName))
      .limit(limit);
  }

  /**
   * Adds a new medicine to the clinic formulary master.
   */
  static async createMedicine(
    organizationId: string,
    input: z.infer<typeof createMedicineSchema>
  ): Promise<MedicineMasterEntity> {
    const [created] = await db
      .insert(medicineMaster)
      .values({
        organizationId,
        brandName: input.brandName.trim(),
        genericName: input.genericName.trim(),
        strength: input.strength?.trim() || null,
        form: input.form,
        defaultDosage: input.defaultDosage?.trim() || null,
        defaultFrequency: input.defaultFrequency || null,
        defaultDurationDays: input.defaultDurationDays || null,
        isActive: input.isActive ?? true,
      })
      .returning();

    return created;
  }

  /**
   * Updates an existing medicine entry.
   */
  static async updateMedicine(
    organizationId: string,
    medicineId: string,
    input: z.infer<typeof updateMedicineSchema>
  ): Promise<MedicineMasterEntity | null> {
    const updateValues: Partial<typeof medicineMaster.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.brandName !== undefined) updateValues.brandName = input.brandName.trim();
    if (input.genericName !== undefined) updateValues.genericName = input.genericName.trim();
    if (input.strength !== undefined) updateValues.strength = input.strength?.trim() || null;
    if (input.form !== undefined) updateValues.form = input.form;
    if (input.defaultDosage !== undefined) updateValues.defaultDosage = input.defaultDosage?.trim() || null;
    if (input.defaultFrequency !== undefined) updateValues.defaultFrequency = input.defaultFrequency || null;
    if (input.defaultDurationDays !== undefined) updateValues.defaultDurationDays = input.defaultDurationDays || null;
    if (input.isActive !== undefined) updateValues.isActive = input.isActive;

    const [updated] = await db
      .update(medicineMaster)
      .set(updateValues)
      .where(and(eq(medicineMaster.organizationId, organizationId), eq(medicineMaster.id, medicineId)))
      .returning();

    return updated || null;
  }

  /**
   * Retrieves clinical service tariffs. If query is provided, performs pg_trgm fuzzy matching.
   */
  static async listTariffs(
    organizationId: string,
    query?: string,
    limit = 50
  ): Promise<Array<ServiceTariffEntity | FuzzyTariffResult>> {
    if (query && query.trim()) {
      return fuzzyMatchTariffs(organizationId, query.trim(), limit);
    }

    return db
      .select()
      .from(serviceTariffs)
      .where(eq(serviceTariffs.organizationId, organizationId))
      .orderBy(asc(serviceTariffs.name))
      .limit(limit);
  }

  /**
   * Adds a new service tariff/procedure to the clinic charge master.
   */
  static async createTariff(
    organizationId: string,
    input: z.infer<typeof createTariffSchema>
  ): Promise<ServiceTariffEntity> {
    const [created] = await db
      .insert(serviceTariffs)
      .values({
        organizationId,
        name: input.name.trim(),
        category: input.category,
        price: input.price,
        taxRate: input.taxRate ?? "0.00",
        hsnSacCode: input.hsnSacCode?.trim() || null,
        isActive: input.isActive ?? true,
      })
      .returning();

    return created;
  }

  /**
   * Updates an existing service tariff.
   */
  static async updateTariff(
    organizationId: string,
    tariffId: string,
    input: z.infer<typeof updateTariffSchema>
  ): Promise<ServiceTariffEntity | null> {
    const updateValues: Partial<typeof serviceTariffs.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateValues.name = input.name.trim();
    if (input.category !== undefined) updateValues.category = input.category;
    if (input.price !== undefined) updateValues.price = input.price;
    if (input.taxRate !== undefined) updateValues.taxRate = input.taxRate;
    if (input.hsnSacCode !== undefined) updateValues.hsnSacCode = input.hsnSacCode?.trim() || null;
    if (input.isActive !== undefined) updateValues.isActive = input.isActive;

    const [updated] = await db
      .update(serviceTariffs)
      .set(updateValues)
      .where(and(eq(serviceTariffs.organizationId, organizationId), eq(serviceTariffs.id, tariffId)))
      .returning();

    return updated || null;
  }
}
