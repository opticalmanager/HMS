import { z } from "zod";

export const medicineForms = [
  "TABLET",
  "CAPSULE",
  "SYRUP",
  "INJECTION",
  "DROPS",
  "OINTMENT",
  "OTHER",
] as const;

export const medicineFrequencies = ["OD", "BD", "TDS", "SOS"] as const;

export const tariffCategories = [
  "CONSULTATION",
  "LAB",
  "PROCEDURE",
  "DIAGNOSTIC",
  "OTHER",
] as const;

export const timeFormatRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const updateClinicProfileSchema = z.object({
  timezone: z.string().min(1).default("Asia/Kolkata"),
  defaultSlotMinutes: z.number().int().min(5).max(120).default(15),
  workingHoursJson: z.record(
    z.string(),
    z.object({
      start: z.string().regex(timeFormatRegex, "Format: HH:mm"),
      end: z.string().regex(timeFormatRegex, "Format: HH:mm"),
      enabled: z.boolean().optional(),
    })
  ).optional(),
  wabaId: z.string().trim().nullable().optional(),
  broadcastWebhookUrl: z.string().url().trim().nullable().optional().or(z.literal("")),
  broadcastApiKey: z.string().trim().nullable().optional(), // Plaintext API key to encrypt
  gstin: z
    .string()
    .trim()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid 15-char Indian GSTIN")
    .nullable()
    .optional()
    .or(z.literal("")),
  invoicePrefix: z.string().min(1).max(10).default("INV"),
});

export const createDoctorSchema = z.object({
  userId: z.string().uuid("Invalid user UUID").nullable().optional(),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
  specialty: z.string().trim().min(2, "Specialty is required"),
  phone: z.string().trim().optional(),
  consultationFee: z.string().or(z.number()).transform((val) => String(val)).default("500.00"),
  isActive: z.boolean().default(true),
});

export const updateDoctorSchema = createDoctorSchema.partial();

export const createDoctorScheduleSchema = z
  .object({
    doctorId: z.string().uuid("Invalid doctor UUID"),
    dayOfWeek: z.number().int().min(0).max(6), // 0 = Sun, 6 = Sat
    startTime: z.string().regex(timeFormatRegex, "Start time must be HH:mm (24h)"),
    endTime: z.string().regex(timeFormatRegex, "End time must be HH:mm (24h)"),
    slotDurationMins: z.number().int().min(5).max(120).default(15),
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "Start time must be earlier than end time",
    path: ["endTime"],
  });

export const updateDoctorScheduleBaseSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().regex(timeFormatRegex, "Start time must be HH:mm (24h)").optional(),
  endTime: z.string().regex(timeFormatRegex, "End time must be HH:mm (24h)").optional(),
  slotDurationMins: z.number().int().min(5).max(120).optional(),
  isActive: z.boolean().optional(),
});

export const updateDoctorScheduleSchema = updateDoctorScheduleBaseSchema.refine(
  (data) => {
    if (data.startTime && data.endTime) {
      return data.startTime < data.endTime;
    }
    return true;
  },
  { message: "Start time must be earlier than end time", path: ["endTime"] }
);

export const createDoctorSlotBlockSchema = z
  .object({
    doctorId: z.string().uuid("Invalid doctor UUID"),
    startAt: z.string().datetime({ offset: true, message: "Valid ISO datetime with timezone required" }),
    endAt: z.string().datetime({ offset: true, message: "Valid ISO datetime with timezone required" }),
    reason: z.string().trim().optional().nullable(),
    createdVia: z.enum(["WEB", "WHATSAPP"]).default("WEB"),
  })
  .refine(
    (data) => new Date(data.startAt) < new Date(data.endAt),
    { message: "Start timestamp must be strictly before end timestamp", path: ["endAt"] }
  );

export const createMedicineSchema = z.object({
  brandName: z.string().trim().min(1, "Brand name is required"),
  genericName: z.string().trim().min(1, "Generic name is required"),
  strength: z.string().trim().optional().nullable(),
  form: z.enum(medicineForms),
  defaultDosage: z.string().trim().optional().nullable(),
  defaultFrequency: z.enum(medicineFrequencies).optional().nullable(),
  defaultDurationDays: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateMedicineSchema = createMedicineSchema.partial();

export const createTariffSchema = z.object({
  name: z.string().trim().min(1, "Tariff/service name is required"),
  category: z.enum(tariffCategories),
  price: z.string().or(z.number()).transform((val) => String(val)),
  taxRate: z.string().or(z.number()).transform((val) => String(val)).default("0.00"),
  hsnSacCode: z.string().trim().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateTariffSchema = createTariffSchema.partial();
