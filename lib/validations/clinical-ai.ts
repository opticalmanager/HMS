import { z } from "zod";

/**
 * Medicine item extracted from doctor-patient clinical encounter.
 */
export const ExtractedMedicineSchema = z.object({
  spokenName: z
    .string()
    .describe("Spoken name of the medicine, brand name, or salt (e.g. Paracetamol, Augmentin 625, Pantocid)"),
  dosage: z
    .string()
    .describe("Dosage strength or form spoken by doctor (e.g. 500mg, 650mg, 1 tablet, 5ml)"),
  frequency: z
    .string()
    .describe("Dosing frequency notation (e.g. 1-0-1, OD, BD, TDS, SOS, HS, once daily)"),
  durationDays: z
    .number()
    .int()
    .describe("Duration of treatment in days (e.g. 5 for 5 days, 7 for 1 week)"),
  instructions: z
    .string()
    .describe("Specific administration instructions (e.g. After food, Before breakfast, At bedtime, With warm water)"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Extraction confidence score between 0.0 and 1.0"),
});

export type ExtractedMedicine = z.infer<typeof ExtractedMedicineSchema>;

/**
 * Billable clinical service or procedure item extracted from visit.
 */
export const ExtractedBillableItemSchema = z.object({
  spokenServiceName: z
    .string()
    .describe("Name of procedure, lab investigation, consultation or tariff spoken (e.g. General OPD Consultation, ECG, CBC, Dressing)"),
  quantity: z
    .number()
    .int()
    .min(1)
    .describe("Quantity of service or test, typically 1"),
  customAmountIfStated: z
    .number()
    .nullable()
    .describe("Custom monetary price if explicitly dictated by the doctor, or null if standard clinic tariff applies"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Extraction confidence score between 0.0 and 1.0"),
});

export type ExtractedBillableItem = z.infer<typeof ExtractedBillableItemSchema>;

/**
 * Gemini-friendly Structured Visit Extraction Schema.
 * Kept flat with clear .describe() hints to maximize native JSON output accuracy.
 */
export const VisitExtractionSchema = z.object({
  transcript: z
    .string()
    .describe("Cleaned verbatim transcript of the clinical consultation in English or Hinglish"),
  chiefComplaint: z
    .string()
    .nullable()
    .describe("Primary symptom, complaint, or reason for clinic visit (e.g. High grade fever with chills for 3 days)"),
  symptoms: z
    .array(z.string())
    .describe("List of individual clinical symptoms reported by patient or observed by doctor"),
  diagnosis: z
    .string()
    .nullable()
    .describe("Clinical diagnosis or provisional assessment formulated by the physician (e.g. Acute Viral Bronchitis, Type 2 Diabetes)"),
  medicines: z
    .array(ExtractedMedicineSchema)
    .describe("Prescribed pharmaceuticals including strength, frequency, and duration"),
  billableItems: z
    .array(ExtractedBillableItemSchema)
    .describe("Billable clinical procedures, investigations, and services performed or ordered"),
  followUpDays: z
    .number()
    .int()
    .nullable()
    .describe("Recommended follow-up visit duration in days, or null if as needed"),
  missingInfoWarnings: z
    .array(z.string())
    .describe("Clinical alerts for missing crucial details, such as unspecified dosage, missing duration, or unclear instructions"),
});

export type VisitExtraction = z.infer<typeof VisitExtractionSchema>;
