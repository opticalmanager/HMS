import "server-only";
import { eq, and, sql, ilike } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { patients, type PatientEntity } from "@/db/schema/patients";
import { doctors, type DoctorEntity } from "@/db/schema/doctors";
import { serviceTariffs } from "@/db/schema/catalog";
import { defaultLlmClient, LlmClient } from "../llm-client";
import { DOCTOR_DICTATION_PROMPT_V1 } from "../prompts";
import {
  VisitExtractionSchema,
  type VisitExtraction,
  type ExtractedMedicine,
  type ExtractedBillableItem,
} from "@/lib/validations/clinical-ai";
import {
  PrescriptionDomainService,
  type GroundedPrescriptionItem,
} from "@/services/domain/prescription-service";
import {
  BillingDomainService,
  type GroundedInvoiceItem,
} from "@/services/domain/billing-service";
import { prescriptions, type PrescriptionEntity } from "@/db/schema/prescriptions";
import type { InvoiceEntity } from "@/db/schema/billing";

export interface AllergyAlert {
  medicineName: string;
  genericName?: string | null;
  matchedAllergen: string;
  severity: "CRITICAL" | "HIGH" | "WARNING";
  message: string;
}

export interface DictateVisitOptions {
  organizationId: string;
  doctorId: string;
  patientId: string;
  appointmentId?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  text?: string;
  audioBase64?: string;
  mimeType?: string;
}

export interface DictationResult {
  extraction: VisitExtraction;
  prescription: PrescriptionEntity;
  invoice: InvoiceEntity;
  allergyAlerts: AllergyAlert[];
  groundedMedicines: GroundedPrescriptionItem[];
  groundedBillableItems: GroundedInvoiceItem[];
}

/**
 * Common antibiotic and pharmaceutical drug allergy groups for deterministic cross-check.
 */
const ALLERGY_SYNONYM_GROUPS: Record<string, string[]> = {
  penicillin: ["amoxicillin", "ampicillin", "augmentin", "cloxacillin", "piperacillin", "penicillin"],
  amoxicillin: ["amoxicillin", "augmentin", "moxikind", "novamox", "penicillin"],
  sulfa: ["sulfamethoxazole", "bactrim", "septran", "sulfa", "sulfonamide"],
  aspirin: ["aspirin", "acetylsalicylic", "ecosprin", "disprin"],
  paracetamol: ["paracetamol", "acetaminophen", "dolo", "crocin", "calpol", "pacimol"],
  cephalosporin: ["cefixime", "ceftriaxone", "cefuroxime", "cefpodoxime", "cephalexin"],
  fluoroquinolone: ["ciprofloxacin", "ofloxacin", "levofloxacin", "norfloxacin"],
  nsaid: ["ibuprofen", "diclofenac", "naproxen", "aceclofenac", "ketorolac", "mefenamic"],
};

export class DictationOrchestrator {
  private llmClient: LlmClient;

  constructor(llmClient?: LlmClient) {
    this.llmClient = llmClient || defaultLlmClient;
  }

  /**
   * Deterministically cross-checks patient's documented allergies against prescribed drugs
   * using salt-level (genericName), brand name, spoken name, and cross-reactive groups.
   */
  static checkAllergies(
    patientAllergies: string[],
    items: GroundedPrescriptionItem[]
  ): AllergyAlert[] {
    const alerts: AllergyAlert[] = [];
    if (!patientAllergies || patientAllergies.length === 0 || !items || items.length === 0) {
      return alerts;
    }

    const cleanPatientAllergies = patientAllergies
      .map((a) => a.toLowerCase().trim())
      .filter((a) => a.length > 0);

    for (const item of items) {
      const spoken = (item.spokenName || "").toLowerCase();
      const brand = (item.brandName || "").toLowerCase();
      const generic = (item.genericName || "").toLowerCase();

      for (const allergen of cleanPatientAllergies) {
        let isMatch = false;

        // 1. Direct substring match in spoken, brand, or generic salt
        if (
          spoken.includes(allergen) ||
          brand.includes(allergen) ||
          generic.includes(allergen)
        ) {
          isMatch = true;
        }

        // 2. Cross-reactivity group match
        if (!isMatch) {
          for (const [groupKey, members] of Object.entries(ALLERGY_SYNONYM_GROUPS)) {
            const groupMatchesAllergen = allergen.includes(groupKey) || members.some((m) => allergen.includes(m));
            if (groupMatchesAllergen) {
              const drugMatchesGroup = members.some(
                (m) => spoken.includes(m) || brand.includes(m) || generic.includes(m)
              );
              if (drugMatchesGroup) {
                isMatch = true;
                break;
              }
            }
          }
        }

        if (isMatch) {
          alerts.push({
            medicineName: item.brandName || item.spokenName,
            genericName: item.genericName,
            matchedAllergen: allergen,
            severity: "CRITICAL",
            message: `CRITICAL ALLERGY ALERT: Patient has a documented allergy to "${allergen.toUpperCase()}". The prescribed item "${item.brandName || item.spokenName}" (${item.genericName || "same class"}) may cause severe hypersensitivity.`,
          });
          item.needsReview = true;
        }
      }
    }

    return alerts;
  }

  /**
   * Main entry point for voice & text consultation dictation.
   */
  async dictateVisit(options: DictateVisitOptions): Promise<DictationResult> {
    const {
      organizationId,
      doctorId,
      patientId,
      appointmentId,
      actorUserId,
      actorRole,
      text,
      audioBase64,
      mimeType,
    } = options;

    // 1. Load patient to verify existence and retrieve recorded allergies
    const [patient] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.organizationId, organizationId), eq(patients.id, patientId)))
      .limit(1);

    if (!patient) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    // 2. Load doctor for fallback consultation fee
    const [doctor] = await db
      .select()
      .from(doctors)
      .where(and(eq(doctors.organizationId, organizationId), eq(doctors.id, doctorId)))
      .limit(1);

    // 3. AI Structured Extraction
    let extraction: VisitExtraction;

    if (audioBase64 && mimeType) {
      const audioRes = await this.llmClient.generateStructuredFromAudio(
        {
          organizationId,
          channel: "WEB_COPILOT",
          actorRole,
          actorId: actorUserId,
          task: "doctor_dictation_extract",
          audioBase64,
          mimeType,
          systemPrompt: DOCTOR_DICTATION_PROMPT_V1,
          userPrompt:
            "Extract complete clinical consultation details into structured JSON adhering to the VisitExtraction schema.",
        },
        VisitExtractionSchema
      );
      extraction = audioRes.data as unknown as VisitExtraction;
    } else if (text && text.trim().length > 0) {
      const textRes = await this.llmClient.generateStructured(
        {
          organizationId,
          channel: "WEB_COPILOT",
          actorRole,
          actorId: actorUserId,
          task: "doctor_dictation_extract",
          systemPrompt: DOCTOR_DICTATION_PROMPT_V1,
          userPrompt: text.trim(),
        },
        VisitExtractionSchema
      );
      extraction = textRes.data as unknown as VisitExtraction;
    } else {
      throw new Error("Either audioBase64 or text input is required for clinical dictation.");
    }

    // 4. Grounding: Create Draft Prescription
    const prescription = await PrescriptionDomainService.createDraftPrescription({
      organizationId,
      doctorId,
      patientId,
      appointmentId: appointmentId || null,
      rawTranscript: extraction.transcript,
      extraction,
    });

    const groundedMedicines = (prescription.itemsJson || []) as GroundedPrescriptionItem[];

    // 5. Deterministic Salt-Level Allergy Cross-Check
    const patientAllergies = (patient.allergies as string[]) || [];
    const allergyAlerts = DictationOrchestrator.checkAllergies(patientAllergies, groundedMedicines);

    // If allergies triggered, update prescription items in DB with needsReview = true
    if (allergyAlerts.length > 0) {
      await db
        .update(prescriptions)
        .set({
          itemsJson: groundedMedicines as any,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(prescriptions.organizationId, organizationId),
            eq(prescriptions.id, prescription.id)
          )
        );
    }

    // 6. Grounding: Billable items with mandatory Consultation Tariff check
    const billableItems: ExtractedBillableItem[] = [...(extraction.billableItems || [])];

    const hasConsultationItem = billableItems.some((b) =>
      /consult|opd|visit|checkup|doctor fee/i.test(b.spokenServiceName)
    );

    if (!hasConsultationItem) {
      // Find consultation tariff in clinic catalog
      const [tariff] = await db
        .select()
        .from(serviceTariffs)
        .where(
          and(
            eq(serviceTariffs.organizationId, organizationId),
            eq(serviceTariffs.isActive, true),
            sql`(${serviceTariffs.name} ILIKE '%consultation%' OR ${serviceTariffs.category} ILIKE '%consultation%' OR ${serviceTariffs.category} = 'opd')`
          )
        )
        .limit(1);

      if (tariff) {
        billableItems.unshift({
          spokenServiceName: tariff.name,
          quantity: 1,
          customAmountIfStated: null,
          confidence: 1.0,
        });
      } else {
        const docFee = doctor?.consultationFee ? parseFloat(doctor.consultationFee) : 500;
        billableItems.unshift({
          spokenServiceName: "Doctor OPD Consultation",
          quantity: 1,
          customAmountIfStated: docFee,
          confidence: 1.0,
        });
      }
    }

    // 7. Grounding: Create Draft Invoice
    const invoice = await BillingDomainService.createDraftInvoiceFromItems({
      organizationId,
      patientId,
      appointmentId: appointmentId || null,
      items: billableItems,
      billerUserId: actorUserId,
      invoiceType: "opd",
      notes: extraction.diagnosis ? `OPD Visit - Provisional Diagnosis: ${extraction.diagnosis}` : undefined,
    });

    const groundedBillableItems = (invoice.items || []) as unknown as GroundedInvoiceItem[];

    return {
      extraction,
      prescription,
      invoice,
      allergyAlerts,
      groundedMedicines,
      groundedBillableItems,
    };
  }
}

export const defaultDictationOrchestrator = new DictationOrchestrator();
