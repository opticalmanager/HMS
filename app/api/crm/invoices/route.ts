import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";
import { BillingDomainService } from "@/services/domain/billing-service";
import { ExtractedBillableItemSchema } from "@/lib/validations/clinical-ai";

const createInvoiceApiSchema = z.object({
  patientId: z.string().uuid("Invalid patient UUID"),
  appointmentId: z.string().uuid("Invalid appointment UUID").optional().nullable(),
  items: z.array(ExtractedBillableItemSchema).min(1, "At least one billable item is required"),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await requireClinicSession(
      { billing: ["read"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId") || undefined;
    const status = (searchParams.get("status") as any) || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const data = await BillingDomainService.listInvoices(clinicId, {
      patientId,
      status,
      limit,
    });

    return NextResponse.json({
      success: true,
      count: data.length,
      invoices: data,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { clinicId, user } = await requireClinicSession(
      { billing: ["draft"] },
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

    const parsed = createInvoiceApiSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const invoice = await BillingDomainService.createDraftInvoiceFromItems({
      organizationId: clinicId,
      patientId: parsed.data.patientId,
      appointmentId: parsed.data.appointmentId,
      items: parsed.data.items,
      billerUserId: user.id,
      notes: parsed.data.notes,
    });

    return NextResponse.json(
      {
        success: true,
        invoice,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}
