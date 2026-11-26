import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import {
  printSettings,
  type PrintSettingsEntity,
} from "@/db/schema/print-settings";
import {
  DEFAULT_PRINT_CONFIGS,
  type DefaultPrintConfig,
  PRINT_TEMPLATE_TYPES,
  type PrintTemplateType,
  type PrintSettingsConfig,
} from "@/lib/print-defaults";

export {
  DEFAULT_PRINT_CONFIGS,
  type DefaultPrintConfig,
  PRINT_TEMPLATE_TYPES,
  type PrintTemplateType,
  type PrintSettingsConfig,
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
