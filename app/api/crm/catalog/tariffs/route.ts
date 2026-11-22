import { NextResponse, type NextRequest } from "next/server";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";
import { CatalogService } from "@/services/domain/catalog-service";
import {
  createTariffSchema,
  updateTariffSchema,
} from "@/lib/validations/master-data";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await requireClinicSession(
      { billing: ["read"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const items = await CatalogService.listTariffs(clinicId, query, limit);

    return NextResponse.json({
      success: true,
      query: query || null,
      count: items.length,
      tariffs: items,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // RBAC: Managing tariff master pricing requires void/admin authority.
    // Receptionist has billing: ['read', 'draft', 'issue'] (lacks 'void'), so gets 403.
    const { clinicId } = await requireClinicSession(
      { billing: ["void"] },
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

    const parsed = createTariffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const created = await CatalogService.createTariff(clinicId, parsed.data);

    return NextResponse.json(
      { success: true, tariff: created },
      { status: 201 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}

const updateWithIdSchema = updateTariffSchema.extend({
  id: z.string().uuid("Invalid tariff UUID"),
});

export async function PATCH(request: NextRequest) {
  try {
    // RBAC: Receptionist lacks billing: ['void'] -> 403 Forbidden
    const { clinicId } = await requireClinicSession(
      { billing: ["void"] },
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

    const parsed = updateWithIdSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await CatalogService.updateTariff(clinicId, parsed.data.id, parsed.data);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Tariff not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tariff: updated,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
