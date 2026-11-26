import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PRINT_CONFIGS,
  PrintSettingsDomainService,
  buildFallbackEntity,
} from "../services/domain/print-service";
import {
  PRINT_TEMPLATE_TYPES,
  type PrintTemplateType,
} from "../db/schema/print-settings";
import {
  savePrintSettingsSchema,
  printTemplateTypeSchema,
} from "../lib/validations/print-settings";

describe("Healthray Print Settings & Domain Service", () => {
  const TEST_ORG_ID = "00000000-0000-0000-0000-000000000001";

  test("defines all 9 required clinical print template types", () => {
    const expectedTemplates: PrintTemplateType[] = [
      "opd_treatment",
      "opd_case_paper",
      "opd_consent_form",
      "ipd_document",
      "ipd_treatment",
      "ipd_initial_assessment",
      "lab_order",
      "opd_billing",
      "thermal_print",
    ];

    assert.equal(PRINT_TEMPLATE_TYPES.length, 9);
    for (const t of expectedTemplates) {
      assert.ok(PRINT_TEMPLATE_TYPES.includes(t), `Template ${t} must be registered`);
      assert.ok(DEFAULT_PRINT_CONFIGS[t], `Default config for ${t} must exist`);
      assert.equal(DEFAULT_PRINT_CONFIGS[t].templateType, t);
    }
  });

  test("builds tenant-scoped fallback entity with factory defaults", () => {
    const entity = buildFallbackEntity(TEST_ORG_ID, "opd_treatment");

    assert.equal(entity.organizationId, TEST_ORG_ID);
    assert.equal(entity.templateType, "opd_treatment");
    assert.equal(entity.pageSize, "A4");
    assert.equal(entity.marginTop, "0.25");
    assert.equal(entity.columnType, "single");
    assert.equal(entity.displayHeader, true);
    assert.equal(entity.displaySignature, true);
    assert.ok(Array.isArray(entity.printOrderJson));
    assert.ok(entity.printOrderJson.includes("rx"));
  });

  test("retrieves default config gracefully for unconfigured clinic tenant", async () => {
    const config = await PrintSettingsDomainService.getTemplateConfig(
      TEST_ORG_ID,
      "opd_billing"
    );

    assert.equal(config.organizationId, TEST_ORG_ID);
    assert.equal(config.templateType, "opd_billing");
    assert.equal(config.displayOperatorName, true);
    assert.equal(config.hsnCodeLabel, "HSN/SAC");
  });

  test("retrieves all 9 template configurations in a unified dictionary", async () => {
    const all = await PrintSettingsDomainService.getAllTemplateConfigs(TEST_ORG_ID);

    assert.equal(Object.keys(all).length, 9);
    for (const t of PRINT_TEMPLATE_TYPES) {
      assert.ok(all[t]);
      assert.equal(all[t].templateType, t);
      assert.equal(all[t].organizationId, TEST_ORG_ID);
    }
    // Thermal receipt must have 3in page size
    assert.equal(all.thermal_print.pageSize, "3in");
  });

  test("validates print settings input schema with Zod guardrails", () => {
    // Valid input
    const valid = savePrintSettingsSchema.safeParse({
      templateType: "opd_treatment",
      title: "Custom OPD Prescription",
      pageSize: "A4",
      marginTop: "0.5",
      fontSize: 12,
      lineSpacing: 4,
      displayHeader: true,
      displayFooter: true,
      printOrder: ["vitals", "diagnosis", "rx"],
      visibleFields: { uhid: true, patientName: true },
    });
    assert.ok(valid.success, "Valid input should parse cleanly");

    // Invalid template type
    const invalidType = savePrintSettingsSchema.safeParse({
      templateType: "invalid_template_name",
      title: "Unknown",
    });
    assert.equal(invalidType.success, false, "Invalid templateType must fail validation");

    // Out-of-bounds font size (> 18)
    const invalidFontSize = savePrintSettingsSchema.safeParse({
      templateType: "opd_treatment",
      fontSize: 25,
    });
    assert.equal(invalidFontSize.success, false, "Font size > 18 must fail validation");
  });

  test("validates print template enum query param parser", () => {
    assert.ok(printTemplateTypeSchema.safeParse("thermal_print").success);
    assert.ok(printTemplateTypeSchema.safeParse("ipd_initial_assessment").success);
    assert.equal(printTemplateTypeSchema.safeParse("random_string").success, false);
  });

  test("validates all 9 factory default template configurations against savePrintSettingsSchema", () => {
    for (const [type, config] of Object.entries(DEFAULT_PRINT_CONFIGS)) {
      const result = savePrintSettingsSchema.safeParse(config);
      assert.ok(
        result.success,
        `Factory default configuration for ${type} must pass Zod schema validation: ${
          result.success ? "" : JSON.stringify(result.error.issues)
        }`
      );
    }
  });

  test("validates columnWidth bounds (10% to 100%)", () => {
    // 100% allowed (used for thermal print)
    assert.ok(
      savePrintSettingsSchema.safeParse({
        templateType: "thermal_print",
        columnWidth: 100,
      }).success,
      "columnWidth: 100 should be valid for thermal receipt"
    );

    // 10% allowed (minimum)
    assert.ok(
      savePrintSettingsSchema.safeParse({
        templateType: "opd_case_paper",
        columnWidth: 10,
      }).success,
      "columnWidth: 10 should be valid"
    );

    // < 10 rejected
    assert.equal(
      savePrintSettingsSchema.safeParse({
        templateType: "opd_treatment",
        columnWidth: 5,
      }).success,
      false,
      "columnWidth < 10 must be rejected"
    );

    // > 100 rejected
    assert.equal(
      savePrintSettingsSchema.safeParse({
        templateType: "opd_treatment",
        columnWidth: 105,
      }).success,
      false,
      "columnWidth > 100 must be rejected"
    );
  });
});
