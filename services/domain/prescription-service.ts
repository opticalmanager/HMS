import "server-only";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import {
  prescriptions,
  type PrescriptionEntity,
  type NewPrescriptionEntity,
} from "@/db/schema/prescriptions";
import { fuzzyMatchMedicines } from "@/lib/fuzzy-search";
import { enqueueWebhookEvent } from "./notification-service";
import type { VisitExtraction } from "@/lib/validations/clinical-ai";

export class AlreadyApprovedError extends Error {
  code = "ALREADY_APPROVED";
  status = 409;
  constructor(message = "This prescription is already approved and cannot be modified.") {
    super(message);
    this.name = "AlreadyApprovedError";
  }
}

export class PrescriptionNotFoundError extends Error {
  code = "PRESCRIPTION_NOT_FOUND";
  status = 404;
  constructor(message = "Prescription not found.") {
    super(message);
    this.name = "PrescriptionNotFoundError";
  }
}

export interface GroundedPrescriptionItem {
  spokenName: string;
  brandName: string;
  genericName?: string | null;
  medicineMasterId?: string | null;
  strength?: string | null;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions?: string;
  confidence: number;
  matchScore: number;
  needsReview: boolean;
}

export interface CreateDraftPrescriptionInput {
  organizationId: string;
  doctorId: string;
  patientId: string;
  appointmentId?: string | null;
  rawTranscript?: string | null;
  extraction: VisitExtraction;
}

export interface UpdateDraftPrescriptionInput {
  chiefComplaint?: string | null;
  diagnosis?: string | null;
  items?: GroundedPrescriptionItem[];
  followUpDate?: Date | null;
}

export class PrescriptionDomainService {
  /**
   * Retrieves a prescription by ID with tenant isolation.
   */
  static async getPrescriptionById(
    organizationId: string,
    prescriptionId: string
  ): Promise<PrescriptionEntity | null> {
    const [row] = await db
      .select()
      .from(prescriptions)
      .where(
        and(
          eq(prescriptions.organizationId, organizationId),
          eq(prescriptions.id, prescriptionId)
        )
      )
      .limit(1);

    return row || null;
  }

  /**
   * Lists prescriptions for a clinic with optional filters.
   */
  static async listPrescriptions(
    organizationId: string,
    options: {
      patientId?: string;
      doctorId?: string;
      status?: "DRAFT" | "APPROVED";
      limit?: number;
    } = {}
  ): Promise<PrescriptionEntity[]> {
    const conditions = [eq(prescriptions.organizationId, organizationId)];

    if (options.patientId) {
      conditions.push(eq(prescriptions.patientId, options.patientId));
    }
    if (options.doctorId) {
      conditions.push(eq(prescriptions.doctorId, options.doctorId));
    }
    if (options.status) {
      conditions.push(eq(prescriptions.status, options.status));
    }

    const limit = Math.max(1, Math.min(100, options.limit || 50));

    return db
      .select()
      .from(prescriptions)
      .where(and(...conditions))
      .orderBy(desc(prescriptions.createdAt))
      .limit(limit);
  }

  /**
   * Creates a draft prescription from structured visit extraction with deterministic grounding.
   * Fuzzy matches extracted medicines against medicine_master.
   * Sets needsReview: true if match score < 0.45 OR confidence < 0.75 OR missing dosage/duration.
   * Always persists with status: "DRAFT" (HITL requirement - Law 4.1).
   */
  static async createDraftPrescription(
    input: CreateDraftPrescriptionInput
  ): Promise<PrescriptionEntity> {
    const { organizationId, doctorId, patientId, appointmentId, rawTranscript, extraction } = input;

    // Ground each extracted medicine against catalog
    const groundedItems: GroundedPrescriptionItem[] = [];

    for (const item of extraction.medicines) {
      const matches = await fuzzyMatchMedicines(organizationId, item.spokenName, 1);
      const topMatch = matches.length > 0 ? matches[0] : null;
      const matchScore = topMatch ? topMatch.score : 0;

      const hasMissingDosage = !item.dosage || item.dosage.trim() === "";
      const hasMissingDuration = !item.durationDays || item.durationDays <= 0;
      const lowMatchScore = matchScore < 0.45;
      const lowConfidence = item.confidence < 0.75;

      const needsReview = lowMatchScore || lowConfidence || hasMissingDosage || hasMissingDuration;

      groundedItems.push({
        spokenName: item.spokenName,
        brandName: topMatch ? topMatch.brandName : item.spokenName,
        genericName: topMatch?.genericName || null,
        medicineMasterId: topMatch?.id || null,
        strength: topMatch?.strength || null,
        dosage: item.dosage,
        frequency: item.frequency,
        durationDays: item.durationDays,
        instructions: item.instructions || undefined,
        confidence: item.confidence,
        matchScore,
        needsReview,
      });
    }

    let followUpDate: Date | null = null;
    if (extraction.followUpDays && extraction.followUpDays > 0) {
      followUpDate = new Date(Date.now() + extraction.followUpDays * 24 * 60 * 60 * 1000);
    }

    const [created] = await db
      .insert(prescriptions)
      .values({
        organizationId,
        doctorId,
        patientId,
        appointmentId: appointmentId || null,
        status: "DRAFT",
        rawTranscript: rawTranscript || extraction.transcript || null,
        chiefComplaint: extraction.chiefComplaint || null,
        diagnosis: extraction.diagnosis || null,
        itemsJson: groundedItems as any,
        followUpDate,
      })
      .returning();

    return created;
  }

  /**
   * Updates a draft prescription. Rejects modification if already approved.
   */
  static async updateDraftPrescription(
    organizationId: string,
    prescriptionId: string,
    updates: UpdateDraftPrescriptionInput
  ): Promise<PrescriptionEntity> {
    const existing = await this.getPrescriptionById(organizationId, prescriptionId);
    if (!existing) {
      throw new PrescriptionNotFoundError();
    }

    if (existing.status === "APPROVED") {
      throw new AlreadyApprovedError();
    }

    const updateValues: Partial<NewPrescriptionEntity> = {
      updatedAt: new Date(),
    };

    if (updates.chiefComplaint !== undefined) updateValues.chiefComplaint = updates.chiefComplaint;
    if (updates.diagnosis !== undefined) updateValues.diagnosis = updates.diagnosis;
    if (updates.items !== undefined) updateValues.itemsJson = updates.items as any;
    if (updates.followUpDate !== undefined) updateValues.followUpDate = updates.followUpDate;

    const [updated] = await db
      .update(prescriptions)
      .set(updateValues)
      .where(
        and(
          eq(prescriptions.organizationId, organizationId),
          eq(prescriptions.id, prescriptionId)
        )
      )
      .returning();

    return updated;
  }

  /**
   * Transitions DRAFT prescription to APPROVED status atomically inside a transaction,
   * stamps approvedByUserId and approvedAt, and enqueues prescription.approved into webhook_outbox.
   */
  static async approvePrescription(options: {
    organizationId: string;
    prescriptionId: string;
    approvedByUserId: string;
  }): Promise<PrescriptionEntity> {
    const { organizationId, prescriptionId, approvedByUserId } = options;

    const existing = await this.getPrescriptionById(organizationId, prescriptionId);
    if (!existing) {
      throw new PrescriptionNotFoundError();
    }

    if (existing.status === "APPROVED") {
      throw new AlreadyApprovedError("Prescription is already approved.");
    }

    return await db.transaction(async (tx) => {
      const [approved] = await tx
        .update(prescriptions)
        .set({
          status: "APPROVED",
          approvedByUserId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(prescriptions.organizationId, organizationId),
            eq(prescriptions.id, prescriptionId)
          )
        )
        .returning();

      // Enqueue prescription.approved event into webhook_outbox inside same transaction
      await enqueueWebhookEvent(tx, {
        organizationId,
        eventType: "prescription.approved",
        payload: {
          prescriptionId: approved.id,
          doctorId: approved.doctorId,
          patientId: approved.patientId,
          appointmentId: approved.appointmentId,
          approvedByUserId,
          approvedAt: approved.approvedAt ? approved.approvedAt.toISOString() : new Date().toISOString(),
          diagnosis: approved.diagnosis,
          itemsCount: (approved.itemsJson as any[])?.length || 0,
        },
      });

      return approved;
    });
  }
}
