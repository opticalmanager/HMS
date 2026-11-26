import { pgTable, text, timestamp, boolean, uuid, integer, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const PRINT_TEMPLATE_TYPES = [
  "opd_treatment",
  "opd_case_paper",
  "opd_consent_form",
  "ipd_document",
  "ipd_treatment",
  "ipd_initial_assessment",
  "lab_order",
  "opd_billing",
  "thermal_print",
] as const;

export type PrintTemplateType = (typeof PRINT_TEMPLATE_TYPES)[number];

export interface PrintSettingsConfig {
  title?: string;
  pageSize?: "A4" | "A5" | "3in";
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  columnType?: "single" | "double";
  columnWidth?: number; // 10 to 90 %
  fontSize?: number; // 8 to 15 pt
  lineSpacing?: number; // 0 to 10 pt
  fontFamily?: string;
  displayHeader?: boolean;
  displayFooter?: boolean;
  includeLogo?: boolean;
  displayDoctorDetails?: boolean;
  displaySignature?: boolean;
  patientKinSignature?: boolean;
  displayBarcode?: boolean;
  displayDateTime?: boolean;
  displayVitals?: boolean;
  displayPatientDetailsInColumns?: boolean;
  headerHeight?: string;
  headerImageUrl?: string | null;
  footerImageUrl?: string | null;
  footerText?: string;
  billHeader?: string;
  receiptHeader?: string;
  depositHeader?: string;
  refundHeader?: string;
  displayOperatorName?: boolean;
  displayHsnCode?: boolean;
  displayGstNumber?: boolean;
  hsnCodeLabel?: string;
  printOrder?: string[];
  visibleFields?: Record<string, boolean>;
  customConfig?: Record<string, unknown>;
}

export const printSettings = pgTable(
  "print_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    templateType: text("template_type").$type<PrintTemplateType>().notNull(),
    title: text("title").default("").notNull(),
    pageSize: text("page_size").default("A4").notNull(),
    marginTop: text("margin_top").default("0.25").notNull(),
    marginBottom: text("margin_bottom").default("0.25").notNull(),
    marginLeft: text("margin_left").default("0.25").notNull(),
    marginRight: text("margin_right").default("0.25").notNull(),
    columnType: text("column_type").default("single").notNull(),
    columnWidth: integer("column_width").default(50).notNull(),
    fontSize: integer("font_size").default(11).notNull(),
    lineSpacing: integer("line_spacing").default(3).notNull(),
    fontFamily: text("font_family").default("Inter").notNull(),
    displayHeader: boolean("display_header").default(true).notNull(),
    displayFooter: boolean("display_footer").default(true).notNull(),
    includeLogo: boolean("include_logo").default(true).notNull(),
    displayDoctorDetails: boolean("display_doctor_details").default(true).notNull(),
    displaySignature: boolean("display_signature").default(true).notNull(),
    patientKinSignature: boolean("patient_kin_signature").default(false).notNull(),
    displayBarcode: boolean("display_barcode").default(true).notNull(),
    displayDateTime: boolean("display_date_time").default(true).notNull(),
    displayVitals: boolean("display_vitals").default(true).notNull(),
    displayPatientDetailsInColumns: boolean("display_patient_details_in_columns").default(true).notNull(),
    headerHeight: text("header_height").default("1.25").notNull(),
    headerImageUrl: text("header_image_url"),
    footerImageUrl: text("footer_image_url"),
    footerText: text("footer_text").default("Kindly correlate clinically. Not for medico-legal purpose.").notNull(),
    billHeader: text("bill_header").default("OPD Bill").notNull(),
    receiptHeader: text("receipt_header").default("OPD Receipt").notNull(),
    depositHeader: text("deposit_header").default("OPD Deposit").notNull(),
    refundHeader: text("refund_header").default("OPD Refund").notNull(),
    displayOperatorName: boolean("display_operator_name").default(true).notNull(),
    displayHsnCode: boolean("display_hsn_code").default(true).notNull(),
    displayGstNumber: boolean("display_gst_number").default(true).notNull(),
    hsnCodeLabel: text("hsn_code_label").default("HSN Code").notNull(),
    printOrderJson: jsonb("print_order_json").$type<string[]>(),
    visibleFieldsJson: jsonb("visible_fields_json").$type<Record<string, boolean>>(),
    customConfigJson: jsonb("custom_config_json").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("print_settings_org_template_uidx").on(table.organizationId, table.templateType),
    index("print_settings_org_id_idx").on(table.organizationId),
  ]
);

export type PrintSettingsEntity = typeof printSettings.$inferSelect;
export type NewPrintSettingsEntity = typeof printSettings.$inferInsert;
