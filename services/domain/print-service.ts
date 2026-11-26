import { eq, and } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import {
  printSettings,
  type PrintSettingsEntity,
  type PrintTemplateType,
  type PrintSettingsConfig,
  PRINT_TEMPLATE_TYPES,
} from "@/db/schema/print-settings";

export interface DefaultPrintConfig {
  templateType: PrintTemplateType;
  title: string;
  pageSize: "A4" | "A5" | "3in";
  marginTop: string;
  marginBottom: string;
  marginLeft: string;
  marginRight: string;
  columnType: "single" | "double";
  columnWidth: number;
  fontSize: number;
  lineSpacing: number;
  fontFamily: string;
  displayHeader: boolean;
  displayFooter: boolean;
  includeLogo: boolean;
  displayDoctorDetails: boolean;
  displaySignature: boolean;
  patientKinSignature: boolean;
  displayBarcode: boolean;
  displayDateTime: boolean;
  displayVitals: boolean;
  displayPatientDetailsInColumns: boolean;
  headerHeight: string;
  headerImageUrl: string | null;
  footerImageUrl: string | null;
  footerText: string;
  billHeader: string;
  receiptHeader: string;
  depositHeader: string;
  refundHeader: string;
  displayOperatorName: boolean;
  displayHsnCode: boolean;
  displayGstNumber: boolean;
  hsnCodeLabel: string;
  printOrder: string[];
  visibleFields: Record<string, boolean>;
}

export const DEFAULT_PRINT_CONFIGS: Record<PrintTemplateType, DefaultPrintConfig> = {
  opd_treatment: {
    templateType: "opd_treatment",
    title: "OPD Treatment",
    pageSize: "A4",
    marginTop: "0.25",
    marginBottom: "0.25",
    marginLeft: "0.25",
    marginRight: "0.25",
    columnType: "single",
    columnWidth: 50,
    fontSize: 11,
    lineSpacing: 3,
    fontFamily: "Inter",
    displayHeader: true,
    displayFooter: true,
    includeLogo: true,
    displayDoctorDetails: true,
    displaySignature: true,
    patientKinSignature: false,
    displayBarcode: true,
    displayDateTime: true,
    displayVitals: true,
    displayPatientDetailsInColumns: true,
    headerHeight: "1.25",
    headerImageUrl: "/assets/print/clinic-logo.svg",
    footerImageUrl: "/assets/print/clinic-footer-branches.svg",
    footerText: "Kindly correlate clinically. Not for medico-legal purpose.",
    billHeader: "OPD Bill",
    receiptHeader: "OPD Receipt",
    depositHeader: "OPD Deposit",
    refundHeader: "OPD Refund",
    displayOperatorName: true,
    displayHsnCode: true,
    displayGstNumber: true,
    hsnCodeLabel: "HSN Code",
    printOrder: ["vitals", "complaints", "diagnosis", "rx", "investigations", "advice", "followUp"],
    visibleFields: {
      uhid: true,
      patientName: true,
      age: true,
      gender: true,
      phone: true,
      address: true,
      doctorName: true,
      specialty: true,
      date: true,
      time: true,
      weight: true,
      height: true,
      bp: true,
      pulse: true,
      spo2: true,
      temperature: true,
    },
  },
  opd_case_paper: {
    templateType: "opd_case_paper",
    title: "OPD Case Paper",
    pageSize: "A4",
    marginTop: "0.25",
    marginBottom: "0.25",
    marginLeft: "0.25",
    marginRight: "0.25",
    columnType: "double",
    columnWidth: 40,
    fontSize: 11,
    lineSpacing: 3,
    fontFamily: "Inter",
    displayHeader: true,
    displayFooter: true,
    includeLogo: true,
    displayDoctorDetails: true,
    displaySignature: true,
    patientKinSignature: false,
    displayBarcode: true,
    displayDateTime: true,
    displayVitals: true,
    displayPatientDetailsInColumns: true,
    headerHeight: "1.25",
    headerImageUrl: "/assets/print/clinic-logo.svg",
    footerImageUrl: "/assets/print/clinic-footer-branches.svg",
    footerText: "Kindly correlate clinically. Not for medico-legal purpose.",
    billHeader: "OPD Bill",
    receiptHeader: "OPD Receipt",
    depositHeader: "OPD Deposit",
    refundHeader: "OPD Refund",
    displayOperatorName: true,
    displayHsnCode: true,
    displayGstNumber: true,
    hsnCodeLabel: "HSN Code",
    printOrder: ["patientDetails", "vitals", "complaints", "pastHistory", "systemicExam", "diagnosis", "rx", "investigations", "plan"],
    visibleFields: {
      uhid: true,
      patientName: true,
      age: true,
      gender: true,
      phone: true,
      address: true,
      bloodGroup: true,
      doctorName: true,
      specialty: true,
      date: true,
      time: true,
      vitals: true,
      allergies: true,
      pastIllness: true,
      surgicalHistory: true,
    },
  },
  opd_consent_form: {
    templateType: "opd_consent_form",
    title: "Informed Procedural Consent Form",
    pageSize: "A4",
    marginTop: "0.5",
    marginBottom: "0.5",
    marginLeft: "0.5",
    marginRight: "0.5",
    columnType: "single",
    columnWidth: 50,
    fontSize: 11,
    lineSpacing: 4,
    fontFamily: "Inter",
    displayHeader: true,
    displayFooter: true,
    includeLogo: true,
    displayDoctorDetails: true,
    displaySignature: true,
    patientKinSignature: true,
    displayBarcode: true,
    displayDateTime: true,
    displayVitals: false,
    displayPatientDetailsInColumns: true,
    headerHeight: "1.25",
    headerImageUrl: "/assets/print/clinic-logo.svg",
    footerImageUrl: null,
    footerText: "This consent is executed in full understanding of procedural risks and therapeutic alternatives.",
    billHeader: "OPD Bill",
    receiptHeader: "OPD Receipt",
    depositHeader: "OPD Deposit",
    refundHeader: "OPD Refund",
    displayOperatorName: false,
    displayHsnCode: false,
    displayGstNumber: false,
    hsnCodeLabel: "HSN Code",
    printOrder: ["patientDetails", "procedureDeclaration", "risksExplanation", "signatures"],
    visibleFields: {
      uhid: true,
      patientName: true,
      age: true,
      gender: true,
      phone: true,
      address: true,
      doctorName: true,
      guardianName: true,
      kinRelation: true,
      kinPhone: true,
      date: true,
    },
  },
  ipd_document: {
    templateType: "ipd_document",
    title: "IPD Discharge Summary",
    pageSize: "A4",
    marginTop: "0.25",
    marginBottom: "0.25",
    marginLeft: "0.25",
    marginRight: "0.25",
    columnType: "single",
    columnWidth: 50,
    fontSize: 11,
    lineSpacing: 3,
    fontFamily: "Inter",
    displayHeader: true,
    displayFooter: true,
    includeLogo: true,
    displayDoctorDetails: true,
    displaySignature: true,
    patientKinSignature: false,
    displayBarcode: true,
    displayDateTime: true,
    displayVitals: true,
    displayPatientDetailsInColumns: true,
    headerHeight: "1.25",
    headerImageUrl: "/assets/print/clinic-logo.svg",
    footerImageUrl: "/assets/print/clinic-footer-branches.svg",
    footerText: "Emergency Helpline 24x7: +91 92050 40505. In case of acute distress, report to emergency.",
    billHeader: "IPD Bill",
    receiptHeader: "IPD Receipt",
    depositHeader: "IPD Deposit",
    refundHeader: "IPD Refund",
    displayOperatorName: true,
    displayHsnCode: true,
    displayGstNumber: true,
    hsnCodeLabel: "HSN Code",
    printOrder: ["patientDetails", "admissionDischargeDates", "admissionDiagnosis", "courseInHospital", "dischargeCondition", "dischargeMeds", "followUp"],
    visibleFields: {
      uhid: true,
      patientName: true,
      ipdNo: true,
      bedNo: true,
      ward: true,
      admissionDate: true,
      dischargeDate: true,
      consultant: true,
    },
  },
  ipd_treatment: {
    templateType: "ipd_treatment",
    title: "IPD Inpatient Medication Chart",
    pageSize: "A4",
    marginTop: "0.25",
    marginBottom: "0.25",
    marginLeft: "0.25",
    marginRight: "0.25",
    columnType: "single",
    columnWidth: 50,
    fontSize: 10,
    lineSpacing: 2,
    fontFamily: "Inter",
    displayHeader: true,
    displayFooter: true,
    includeLogo: true,
    displayDoctorDetails: true,
    displaySignature: true,
    patientKinSignature: false,
    displayBarcode: true,
    displayDateTime: true,
    displayVitals: true,
    displayPatientDetailsInColumns: true,
    headerHeight: "1.25",
    headerImageUrl: "/assets/print/clinic-logo.svg",
    footerImageUrl: null,
    footerText: "Administered strictly under certified RN / Physician supervision.",
    billHeader: "IPD Bill",
    receiptHeader: "IPD Receipt",
    depositHeader: "IPD Deposit",
    refundHeader: "IPD Refund",
    displayOperatorName: true,
    displayHsnCode: false,
    displayGstNumber: false,
    hsnCodeLabel: "HSN Code",
    printOrder: ["patientDetails", "vitals", "activeMedications", "nurseAdministrationGrid"],
    visibleFields: {
      uhid: true,
      patientName: true,
      ipdNo: true,
      bedNo: true,
      ward: true,
      allergies: true,
      nurseName: true,
    },
  },
  ipd_initial_assessment: {
    templateType: "ipd_initial_assessment",
    title: "IPD Initial Nursing Assessment",
    pageSize: "A4",
    marginTop: "0.25",
    marginBottom: "0.25",
    marginLeft: "0.25",
    marginRight: "0.25",
    columnType: "double",
    columnWidth: 50,
    fontSize: 10,
    lineSpacing: 2,
    fontFamily: "Inter",
    displayHeader: true,
    displayFooter: true,
    includeLogo: true,
    displayDoctorDetails: true,
    displaySignature: true,
    patientKinSignature: false,
    displayBarcode: true,
    displayDateTime: true,
    displayVitals: true,
    displayPatientDetailsInColumns: true,
    headerHeight: "1.25",
    headerImageUrl: "/assets/print/clinic-logo.svg",
    footerImageUrl: "/assets/print/clinic-footer-branches.svg",
    footerText: "Clinical documentation recorded per NABH nursing standards.",
    billHeader: "IPD Bill",
    receiptHeader: "IPD Receipt",
    depositHeader: "IPD Deposit",
    refundHeader: "IPD Refund",
    displayOperatorName: true,
    displayHsnCode: false,
    displayGstNumber: false,
    hsnCodeLabel: "HSN Code",
    printOrder: ["patientDetails", "vitals", "triageCategory", "fallRiskAssessment", "nursingPlan"],
    visibleFields: {
      uhid: true,
      patientName: true,
      ipdNo: true,
      bedNo: true,
      triageLevel: true,
      painScore: true,
      fallRisk: true,
    },
  },
  lab_order: {
    templateType: "lab_order",
    title: "Diagnostic & Laboratory Requisition",
    pageSize: "A4",
    marginTop: "0.25",
    marginBottom: "0.25",
    marginLeft: "0.25",
    marginRight: "0.25",
    columnType: "single",
    columnWidth: 50,
    fontSize: 11,
    lineSpacing: 3,
    fontFamily: "Inter",
    displayHeader: true,
    displayFooter: true,
    includeLogo: true,
    displayDoctorDetails: true,
    displaySignature: true,
    patientKinSignature: false,
    displayBarcode: true,
    displayDateTime: true,
    displayVitals: false,
    displayPatientDetailsInColumns: true,
    headerHeight: "1.25",
    headerImageUrl: "/assets/print/clinic-logo.svg",
    footerImageUrl: "/assets/print/clinic-footer-branches.svg",
    footerText: "Sample collection instructions: Fasting required where indicated. Reports available on portal.",
    billHeader: "Lab Bill",
    receiptHeader: "Lab Receipt",
    depositHeader: "Lab Deposit",
    refundHeader: "Lab Refund",
    displayOperatorName: true,
    displayHsnCode: true,
    displayGstNumber: true,
    hsnCodeLabel: "SAC Code",
    printOrder: ["patientDetails", "clinicalIndication", "investigationsTable", "phlebotomyNotes"],
    visibleFields: {
      uhid: true,
      patientName: true,
      age: true,
      gender: true,
      phone: true,
      doctorName: true,
      date: true,
      sampleType: true,
    },
  },
  opd_billing: {
    templateType: "opd_billing",
    title: "Tax Invoice / OPD Bill",
    pageSize: "A4",
    marginTop: "0.25",
    marginBottom: "0.25",
    marginLeft: "0.25",
    marginRight: "0.25",
    columnType: "single",
    columnWidth: 50,
    fontSize: 11,
    lineSpacing: 2,
    fontFamily: "Inter",
    displayHeader: true,
    displayFooter: true,
    includeLogo: true,
    displayDoctorDetails: true,
    displaySignature: true,
    patientKinSignature: false,
    displayBarcode: true,
    displayDateTime: true,
    displayVitals: false,
    displayPatientDetailsInColumns: true,
    headerHeight: "1.25",
    headerImageUrl: "/assets/print/clinic-logo.svg",
    footerImageUrl: "/assets/print/clinic-footer-branches.svg",
    footerText: "Goods and services once dispensed are non-returnable. Computer-generated tax invoice.",
    billHeader: "OPD Final Bill",
    receiptHeader: "OPD Receipt",
    depositHeader: "OPD Deposit",
    refundHeader: "OPD Refund",
    displayOperatorName: true,
    displayHsnCode: true,
    displayGstNumber: true,
    hsnCodeLabel: "HSN/SAC",
    printOrder: ["invoiceMeta", "patientDetails", "itemsTable", "taxBreakup", "paymentDetails", "declaration"],
    visibleFields: {
      invoiceNumber: true,
      invoiceDate: true,
      uhid: true,
      patientName: true,
      phone: true,
      address: true,
      gstin: true,
      operatorName: true,
      doctorName: true,
    },
  },
  thermal_print: {
    templateType: "thermal_print",
    title: "OPD Cash Receipt",
    pageSize: "3in",
    marginTop: "0.1",
    marginBottom: "0.1",
    marginLeft: "0.1",
    marginRight: "0.1",
    columnType: "single",
    columnWidth: 100,
    fontSize: 10,
    lineSpacing: 1,
    fontFamily: "Inter",
    displayHeader: true,
    displayFooter: true,
    includeLogo: false,
    displayDoctorDetails: true,
    displaySignature: false,
    patientKinSignature: false,
    displayBarcode: true,
    displayDateTime: true,
    displayVitals: false,
    displayPatientDetailsInColumns: false,
    headerHeight: "0.8",
    headerImageUrl: null,
    footerImageUrl: null,
    footerText: "Thank you for visiting Apex Clinic. Get well soon!",
    billHeader: "OPD Bill",
    receiptHeader: "OPD Receipt",
    depositHeader: "OPD Deposit",
    refundHeader: "OPD Refund",
    displayOperatorName: true,
    displayHsnCode: false,
    displayGstNumber: true,
    hsnCodeLabel: "HSN",
    printOrder: ["header", "patientSummary", "items", "totals", "tenderDetails", "barcode"],
    visibleFields: {
      receiptNo: true,
      date: true,
      uhid: true,
      patientName: true,
      doctorName: true,
      operatorName: true,
      paymentMode: true,
    },
  },
};

export function buildFallbackEntity(
  organizationId: string,
  templateType: PrintTemplateType
): PrintSettingsEntity {
  const d = DEFAULT_PRINT_CONFIGS[templateType] || DEFAULT_PRINT_CONFIGS.opd_treatment;
  const now = new Date();
  return {
    id: `default-${templateType}`,
    organizationId,
    templateType,
    title: d.title,
    pageSize: d.pageSize,
    marginTop: d.marginTop,
    marginBottom: d.marginBottom,
    marginLeft: d.marginLeft,
    marginRight: d.marginRight,
    columnType: d.columnType,
    columnWidth: d.columnWidth,
    fontSize: d.fontSize,
    lineSpacing: d.lineSpacing,
    fontFamily: d.fontFamily,
    displayHeader: d.displayHeader,
    displayFooter: d.displayFooter,
    includeLogo: d.includeLogo,
    displayDoctorDetails: d.displayDoctorDetails,
    displaySignature: d.displaySignature,
    patientKinSignature: d.patientKinSignature,
    displayBarcode: d.displayBarcode,
    displayDateTime: d.displayDateTime,
    displayVitals: d.displayVitals,
    displayPatientDetailsInColumns: d.displayPatientDetailsInColumns,
    headerHeight: d.headerHeight,
    headerImageUrl: d.headerImageUrl,
    footerImageUrl: d.footerImageUrl,
    footerText: d.footerText,
    billHeader: d.billHeader,
    receiptHeader: d.receiptHeader,
    depositHeader: d.depositHeader,
    refundHeader: d.refundHeader,
    displayOperatorName: d.displayOperatorName,
    displayHsnCode: d.displayHsnCode,
    displayGstNumber: d.displayGstNumber,
    hsnCodeLabel: d.hsnCodeLabel,
    printOrderJson: d.printOrder,
    visibleFieldsJson: d.visibleFields,
    customConfigJson: {},
    createdAt: now,
    updatedAt: now,
  };
}

export class PrintSettingsDomainService {
  /**
   * Fetch customized print settings for an organization and template type,
   * falling back to the default configuration if uncustomized.
   */
  static async getTemplateConfig(
    organizationId: string,
    templateType: PrintTemplateType
  ): Promise<PrintSettingsEntity> {
    try {
      const rows = await db
        .select()
        .from(printSettings)
        .where(
          and(
            eq(printSettings.organizationId, organizationId),
            eq(printSettings.templateType, templateType)
          )
        )
        .limit(1);

      if (rows.length > 0 && rows[0]) {
        return rows[0];
      }
    } catch {
      // Table may not have been migrated yet in test/offline scenarios; graceful fallback
    }

    return buildFallbackEntity(organizationId, templateType);
  }

  /**
   * Fetch all 9 template configurations for an organization.
   */
  static async getAllTemplateConfigs(
    organizationId: string
  ): Promise<Record<PrintTemplateType, PrintSettingsEntity>> {
    const result: Partial<Record<PrintTemplateType, PrintSettingsEntity>> = {};

    let dbRows: PrintSettingsEntity[] = [];
    try {
      dbRows = await db
        .select()
        .from(printSettings)
        .where(eq(printSettings.organizationId, organizationId));
    } catch {
      // Graceful fallback to defaults
    }

    const map = new Map<string, PrintSettingsEntity>();
    for (const row of dbRows) {
      map.set(row.templateType, row);
    }

    for (const t of PRINT_TEMPLATE_TYPES) {
      result[t] = map.get(t) || buildFallbackEntity(organizationId, t);
    }

    return result as Record<PrintTemplateType, PrintSettingsEntity>;
  }

  /**
   * Upsert custom print settings for a given organization and template type.
   */
  static async saveTemplateConfig(
    organizationId: string,
    templateType: PrintTemplateType,
    config: Partial<PrintSettingsConfig>
  ): Promise<PrintSettingsEntity> {
    const now = new Date();
    const defaults = DEFAULT_PRINT_CONFIGS[templateType] || DEFAULT_PRINT_CONFIGS.opd_treatment;

    const valuesToInsert = {
      organizationId,
      templateType,
      title: config.title ?? defaults.title,
      pageSize: config.pageSize ?? defaults.pageSize,
      marginTop: config.marginTop ?? defaults.marginTop,
      marginBottom: config.marginBottom ?? defaults.marginBottom,
      marginLeft: config.marginLeft ?? defaults.marginLeft,
      marginRight: config.marginRight ?? defaults.marginRight,
      columnType: config.columnType ?? defaults.columnType,
      columnWidth: config.columnWidth ?? defaults.columnWidth,
      fontSize: config.fontSize ?? defaults.fontSize,
      lineSpacing: config.lineSpacing ?? defaults.lineSpacing,
      fontFamily: config.fontFamily ?? defaults.fontFamily,
      displayHeader: config.displayHeader ?? defaults.displayHeader,
      displayFooter: config.displayFooter ?? defaults.displayFooter,
      includeLogo: config.includeLogo ?? defaults.includeLogo,
      displayDoctorDetails: config.displayDoctorDetails ?? defaults.displayDoctorDetails,
      displaySignature: config.displaySignature ?? defaults.displaySignature,
      patientKinSignature: config.patientKinSignature ?? defaults.patientKinSignature,
      displayBarcode: config.displayBarcode ?? defaults.displayBarcode,
      displayDateTime: config.displayDateTime ?? defaults.displayDateTime,
      displayVitals: config.displayVitals ?? defaults.displayVitals,
      displayPatientDetailsInColumns:
        config.displayPatientDetailsInColumns ?? defaults.displayPatientDetailsInColumns,
      headerHeight: config.headerHeight ?? defaults.headerHeight,
      headerImageUrl: config.headerImageUrl !== undefined ? config.headerImageUrl : defaults.headerImageUrl,
      footerImageUrl: config.footerImageUrl !== undefined ? config.footerImageUrl : defaults.footerImageUrl,
      footerText: config.footerText ?? defaults.footerText,
      billHeader: config.billHeader ?? defaults.billHeader,
      receiptHeader: config.receiptHeader ?? defaults.receiptHeader,
      depositHeader: config.depositHeader ?? defaults.depositHeader,
      refundHeader: config.refundHeader ?? defaults.refundHeader,
      displayOperatorName: config.displayOperatorName ?? defaults.displayOperatorName,
      displayHsnCode: config.displayHsnCode ?? defaults.displayHsnCode,
      displayGstNumber: config.displayGstNumber ?? defaults.displayGstNumber,
      hsnCodeLabel: config.hsnCodeLabel ?? defaults.hsnCodeLabel,
      printOrderJson: config.printOrder ?? defaults.printOrder,
      visibleFieldsJson: config.visibleFields ?? defaults.visibleFields,
      customConfigJson: config.customConfig ?? {},
      updatedAt: now,
    };

    const inserted = await db
      .insert(printSettings)
      .values({
        ...valuesToInsert,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: [printSettings.organizationId, printSettings.templateType],
        set: valuesToInsert,
      })
      .returning();

    return inserted[0] ?? buildFallbackEntity(organizationId, templateType);
  }

  /**
   * Reset template configuration to factory default.
   */
  static async resetTemplateConfig(
    organizationId: string,
    templateType: PrintTemplateType
  ): Promise<PrintSettingsEntity> {
    await db
      .delete(printSettings)
      .where(
        and(
          eq(printSettings.organizationId, organizationId),
          eq(printSettings.templateType, templateType)
        )
      );

    return buildFallbackEntity(organizationId, templateType);
  }
}
