import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./drizzle";
import type { MedicineMasterEntity, ServiceTariffEntity } from "@/db/schema";

export interface FuzzyMedicineResult extends MedicineMasterEntity {
  score: number;
  needsReview: boolean;
}

export interface FuzzyTariffResult extends ServiceTariffEntity {
  score: number;
  needsReview: boolean;
}

/**
 * Fuzzy matches medicines in the clinic catalog using pg_trgm similarity on brand_name and generic_name.
 * Scoped strictly by organizationId and is_active = true.
 *
 * @param organizationId - Clinic tenant UUID
 * @param query - Medicine name or fragment to match
 * @param limit - Maximum rows to return (default 5)
 */
export async function fuzzyMatchMedicines(
  organizationId: string,
  query: string,
  limit = 5
): Promise<FuzzyMedicineResult[]> {
  if (!organizationId || !query || !query.trim()) {
    return [];
  }

  const cleanQuery = query.trim();
  const ilikePattern = `%${cleanQuery}%`;

  // Parameterized query using similarity() from pg_trgm
  const results = await db.execute<{
    id: string;
    organization_id: string;
    brand_name: string;
    generic_name: string;
    strength: string | null;
    form: MedicineMasterEntity["form"];
    default_dosage: string | null;
    default_frequency: MedicineMasterEntity["defaultFrequency"] | null;
    default_duration_days: number | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    raw_score: string | number;
  }>(sql`
    SELECT
      id,
      organization_id,
      brand_name,
      generic_name,
      strength,
      form,
      default_dosage,
      default_frequency,
      default_duration_days,
      is_active,
      created_at,
      updated_at,
      GREATEST(
        similarity(brand_name, ${cleanQuery}),
        similarity(generic_name, ${cleanQuery}),
        CASE 
          WHEN lower(brand_name) = lower(${cleanQuery}) OR lower(generic_name) = lower(${cleanQuery}) THEN 1.0
          WHEN brand_name ILIKE ${ilikePattern} OR generic_name ILIKE ${ilikePattern} THEN 0.55
          ELSE 0.0
        END
      ) AS raw_score
    FROM medicine_master
    WHERE organization_id = ${organizationId}::uuid
      AND is_active = true
      AND (
        similarity(brand_name, ${cleanQuery}) > 0.1
        OR similarity(generic_name, ${cleanQuery}) > 0.1
        OR brand_name ILIKE ${ilikePattern}
        OR generic_name ILIKE ${ilikePattern}
      )
    ORDER BY raw_score DESC
    LIMIT ${limit};
  `);

  return (results as unknown as Array<Record<string, unknown>>).map((row) => {
    const scoreVal = parseFloat(String(row.raw_score ?? 0));
    const score = Math.min(1.0, Math.max(0.0, parseFloat(scoreVal.toFixed(4))));

    return {
      id: String(row.id),
      organizationId: String(row.organization_id),
      brandName: String(row.brand_name),
      genericName: String(row.generic_name),
      strength: row.strength ? String(row.strength) : null,
      form: row.form as MedicineMasterEntity["form"],
      defaultDosage: row.default_dosage ? String(row.default_dosage) : null,
      defaultFrequency: (row.default_frequency as MedicineMasterEntity["defaultFrequency"]) ?? null,
      defaultDurationDays: row.default_duration_days ? Number(row.default_duration_days) : null,
      isActive: Boolean(row.is_active),
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
      score,
      needsReview: score < 0.45,
    };
  });
}

/**
 * Fuzzy matches clinical service tariffs using pg_trgm similarity on name.
 * Scoped strictly by organizationId and is_active = true.
 *
 * @param organizationId - Clinic tenant UUID
 * @param query - Service/procedure name to match
 * @param limit - Maximum rows to return (default 5)
 */
export async function fuzzyMatchTariffs(
  organizationId: string,
  query: string,
  limit = 5
): Promise<FuzzyTariffResult[]> {
  if (!organizationId || !query || !query.trim()) {
    return [];
  }

  const cleanQuery = query.trim();
  const ilikePattern = `%${cleanQuery}%`;

  const results = await db.execute<{
    id: string;
    organization_id: string;
    name: string;
    category: ServiceTariffEntity["category"];
    price: string;
    tax_rate: string;
    hsn_sac_code: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    raw_score: string | number;
  }>(sql`
    SELECT
      id,
      organization_id,
      name,
      category,
      price,
      tax_rate,
      hsn_sac_code,
      is_active,
      created_at,
      updated_at,
      GREATEST(
        similarity(name, ${cleanQuery}),
        CASE 
          WHEN lower(name) = lower(${cleanQuery}) THEN 1.0
          WHEN name ILIKE ${ilikePattern} THEN 0.55
          ELSE 0.0
        END
      ) AS raw_score
    FROM service_tariffs
    WHERE organization_id = ${organizationId}::uuid
      AND is_active = true
      AND (
        similarity(name, ${cleanQuery}) > 0.1
        OR name ILIKE ${ilikePattern}
      )
    ORDER BY raw_score DESC
    LIMIT ${limit};
  `);

  return (results as unknown as Array<Record<string, unknown>>).map((row) => {
    const scoreVal = parseFloat(String(row.raw_score ?? 0));
    const score = Math.min(1.0, Math.max(0.0, parseFloat(scoreVal.toFixed(4))));

    return {
      id: String(row.id),
      organizationId: String(row.organization_id),
      name: String(row.name),
      category: row.category as ServiceTariffEntity["category"],
      price: String(row.price),
      taxRate: String(row.tax_rate ?? "0.00"),
      hsnSacCode: row.hsn_sac_code ? String(row.hsn_sac_code) : null,
      isActive: Boolean(row.is_active),
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
      score,
      needsReview: score < 0.45,
    };
  });
}
