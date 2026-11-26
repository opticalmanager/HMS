import { z } from "zod";
import { PRINT_TEMPLATE_TYPES } from "@/db/schema/print-settings";

export const printTemplateTypeSchema = z.enum(PRINT_TEMPLATE_TYPES);

export const savePrintSettingsSchema = z.object({
  templateType: printTemplateTypeSchema,
  title: z.string().optional(),
  pageSize: z.enum(["A4", "A5", "3in"]).optional(),
  marginTop: z.string().optional(),
  marginBottom: z.string().optional(),
  marginLeft: z.string().optional(),
  marginRight: z.string().optional(),
  columnType: z.enum(["single", "double"]).optional(),
  columnWidth: z.number().min(10).max(100).optional(),
  fontSize: z.number().min(8).max(18).optional(),
  lineSpacing: z.number().min(0).max(15).optional(),
  fontFamily: z.string().optional(),
  displayHeader: z.boolean().optional(),
  displayFooter: z.boolean().optional(),
  includeLogo: z.boolean().optional(),
  displayDoctorDetails: z.boolean().optional(),
  displaySignature: z.boolean().optional(),
  patientKinSignature: z.boolean().optional(),
  displayBarcode: z.boolean().optional(),
  displayDateTime: z.boolean().optional(),
  displayVitals: z.boolean().optional(),
  displayPatientDetailsInColumns: z.boolean().optional(),
  headerHeight: z.string().optional(),
  headerImageUrl: z.string().nullable().optional(),
  footerImageUrl: z.string().nullable().optional(),
  footerText: z.string().optional(),
  billHeader: z.string().optional(),
  receiptHeader: z.string().optional(),
  depositHeader: z.string().optional(),
  refundHeader: z.string().optional(),
  displayOperatorName: z.boolean().optional(),
  displayHsnCode: z.boolean().optional(),
  displayGstNumber: z.boolean().optional(),
  hsnCodeLabel: z.string().optional(),
  printOrder: z.array(z.string()).optional(),
  visibleFields: z.record(z.string(), z.boolean()).optional(),
  customConfig: z.record(z.string(), z.unknown()).optional(),
});

export type SavePrintSettingsInput = z.infer<typeof savePrintSettingsSchema>;
