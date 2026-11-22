import { NextResponse, type NextRequest } from "next/server";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";
import { CatalogService } from "@/services/domain/catalog-service";
import {
  createMedicineSchema,
  updateMedicineSchema,
} from "@/lib/validations/master-data";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await requireClinicSession(
      { knowledge: ["read"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const items = await CatalogService.listMedicines(clinicId, query, limit);

    return NextResponse.json({
      success: true,
      query: query || null,
      count: items.length,
      medicines: items,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only owner & admin have knowledge: ['manage']; receptionist & doctor get 403
    const { clinicId } = await requireClinicSession(
      { knowledge: ["manage"] },
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

    const parsed = createMedicineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const created = await CatalogService.createMedicine(clinicId, parsed.data);

    return NextResponse.json(
      { success: true, medicine: created },
      { status: 201 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}

const updateWithIdSchema = updateMedicineSchema.extend({
  id: z.string().uuid("Invalid medicine UUID"),
});

export async function PATCH(request: NextRequest) {
  try {
    const { clinicId } = await requireClinicSession(
      { knowledge: ["manage"] },
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

    const updated = await CatalogService.updateMedicine(clinicId, parsed.data.id, parsed.data);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Medicine not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      medicine: updated,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
