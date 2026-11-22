import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { clinicProfiles } from "@/db/schema/clinic-profiles";
import { encryptBroadcastApiKey } from "@/lib/crypto";
import type { z } from "zod";
import type { updateClinicProfileSchema } from "@/lib/validations/master-data";

export interface SanitizedClinicProfile {
  id: string;
  organizationId: string;
  timezone: string;
  defaultSlotMinutes: number;
  workingHoursJson: Record<string, { start: string; end: string; enabled?: boolean }> | null;
  wabaId: string | null;
  broadcastWebhookUrl: string | null;
  hasBroadcastApiKey: boolean;
  gstin: string | null;
  invoicePrefix: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ClinicService {
  /**
   * Retrieves clinic configuration profile for a tenant organization.
   * Creates a default profile if none exists.
   */
  static async getClinicProfile(organizationId: string): Promise<SanitizedClinicProfile> {
    const existing = await db
      .select()
      .from(clinicProfiles)
      .where(eq(clinicProfiles.organizationId, organizationId))
      .limit(1);

    if (existing.length > 0) {
      const row = existing[0];
      return {
        id: row.id,
        organizationId: row.organizationId,
        timezone: row.timezone,
        defaultSlotMinutes: row.defaultSlotMinutes,
        workingHoursJson: (row.workingHoursJson as Record<string, { start: string; end: string; enabled?: boolean }>) || null,
        wabaId: row.wabaId,
        broadcastWebhookUrl: row.broadcastWebhookUrl,
        hasBroadcastApiKey: Boolean(row.broadcastApiKeyEnc),
        gstin: row.gstin,
        invoicePrefix: row.invoicePrefix,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }

    // Default working hours: Mon - Sat 09:00 - 18:00
    const defaultHours = {
      monday: { start: "09:00", end: "18:00", enabled: true },
      tuesday: { start: "09:00", end: "18:00", enabled: true },
      wednesday: { start: "09:00", end: "18:00", enabled: true },
      thursday: { start: "09:00", end: "18:00", enabled: true },
      friday: { start: "09:00", end: "18:00", enabled: true },
      saturday: { start: "09:00", end: "14:00", enabled: true },
      sunday: { start: "10:00", end: "13:00", enabled: false },
    };

    const [created] = await db
      .insert(clinicProfiles)
      .values({
        organizationId,
        timezone: "Asia/Kolkata",
        defaultSlotMinutes: 15,
        workingHoursJson: defaultHours,
        invoicePrefix: "INV",
      })
      .returning();

    return {
      id: created.id,
      organizationId: created.organizationId,
      timezone: created.timezone,
      defaultSlotMinutes: created.defaultSlotMinutes,
      workingHoursJson: created.workingHoursJson as Record<string, { start: string; end: string; enabled?: boolean }>,
      wabaId: created.wabaId,
      broadcastWebhookUrl: created.broadcastWebhookUrl,
      hasBroadcastApiKey: false,
      gstin: created.gstin,
      invoicePrefix: created.invoicePrefix,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  /**
   * Updates clinic configuration profile for a tenant organization.
   * Encrypts broadcast API keys with AES-256-GCM.
   */
  static async updateClinicProfile(
    organizationId: string,
    input: z.infer<typeof updateClinicProfileSchema>
  ): Promise<SanitizedClinicProfile> {
    const updateValues: Partial<typeof clinicProfiles.$inferInsert> = {
      timezone: input.timezone,
      defaultSlotMinutes: input.defaultSlotMinutes,
      invoicePrefix: input.invoicePrefix,
      updatedAt: new Date(),
    };

    if (input.workingHoursJson !== undefined) {
      updateValues.workingHoursJson = input.workingHoursJson;
    }
    if (input.wabaId !== undefined) {
      updateValues.wabaId = input.wabaId || null;
    }
    if (input.broadcastWebhookUrl !== undefined) {
      updateValues.broadcastWebhookUrl = input.broadcastWebhookUrl || null;
    }
    if (input.gstin !== undefined) {
      updateValues.gstin = input.gstin || null;
    }
    if (input.broadcastApiKey) {
      updateValues.broadcastApiKeyEnc = encryptBroadcastApiKey(input.broadcastApiKey.trim());
    }

    const [updated] = await db
      .insert(clinicProfiles)
      .values({
        organizationId,
        timezone: input.timezone || "Asia/Kolkata",
        defaultSlotMinutes: input.defaultSlotMinutes || 15,
        invoicePrefix: input.invoicePrefix || "INV",
        ...updateValues,
      })
      .onConflictDoUpdate({
        target: clinicProfiles.organizationId,
        set: updateValues,
      })
      .returning();

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      timezone: updated.timezone,
      defaultSlotMinutes: updated.defaultSlotMinutes,
      workingHoursJson: (updated.workingHoursJson as Record<string, { start: string; end: string; enabled?: boolean }>) || null,
      wabaId: updated.wabaId,
      broadcastWebhookUrl: updated.broadcastWebhookUrl,
      hasBroadcastApiKey: Boolean(updated.broadcastApiKeyEnc),
      gstin: updated.gstin,
      invoicePrefix: updated.invoicePrefix,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
