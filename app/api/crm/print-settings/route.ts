import { NextResponse, type NextRequest } from "next/server";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";
import { PrintSettingsDomainService } from "@/services/domain/print-service";
import {
  savePrintSettingsSchema,
  printTemplateTypeSchema,
} from "@/lib/validations/print-settings";
import type { PrintTemplateType } from "@/db/schema/print-settings";

export async function GET(request: NextRequest) {
  try {
    const { clinicId, role } = await requireClinicSession(
      undefined,
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    const { searchParams } = new URL(request.url);
    const templateTypeParam = searchParams.get("templateType");

    if (templateTypeParam) {
      const parsedType = printTemplateTypeSchema.safeParse(templateTypeParam);
      if (!parsedType.success) {
        return NextResponse.json(
          { success: false, error: "Invalid templateType parameter" },
          { status: 400 }
        );
      }

      const config = await PrintSettingsDomainService.getTemplateConfig(
        clinicId,
        parsedType.data
      );

      return NextResponse.json({
        success: true,
        clinicId,
        role,
        data: config,
      });
    }

    const allConfigs = await PrintSettingsDomainService.getAllTemplateConfigs(clinicId);

    return NextResponse.json({
      success: true,
      clinicId,
      role,
      data: allConfigs,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { clinicId, role } = await requireClinicSession(
      undefined,
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const parsed = savePrintSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { templateType, ...restConfig } = parsed.data;

    const saved = await PrintSettingsDomainService.saveTemplateConfig(
      clinicId,
      templateType as PrintTemplateType,
      restConfig
    );

    return NextResponse.json({
      success: true,
      clinicId,
      role,
      data: saved,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { clinicId, role } = await requireClinicSession(
      undefined,
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    const { searchParams } = new URL(request.url);
    const templateTypeParam = searchParams.get("templateType");

    if (!templateTypeParam) {
      return NextResponse.json(
        { success: false, error: "Missing templateType query parameter" },
        { status: 400 }
      );
    }

    const parsedType = printTemplateTypeSchema.safeParse(templateTypeParam);
    if (!parsedType.success) {
      return NextResponse.json(
        { success: false, error: "Invalid templateType parameter" },
        { status: 400 }
      );
    }

    const resetConfig = await PrintSettingsDomainService.resetTemplateConfig(
      clinicId,
      parsedType.data
    );

    return NextResponse.json({
      success: true,
      clinicId,
      role,
      data: resetConfig,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
