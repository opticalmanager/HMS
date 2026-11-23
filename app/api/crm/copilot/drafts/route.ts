import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";
import {
  PrescriptionDomainService,
  type GroundedPrescriptionItem,
} from "@/services/domain/prescription-service";
import {
  BillingDomainService,
  type GroundedInvoiceItem,
} from "@/services/domain/billing-service";

const patchDraftsSchema = z.object({
  prescriptionId: z.string().uuid().optional(),
  prescriptionUpdates: z
    .object({
      chiefComplaint: z.string().nullable().optional(),
      diagnosis: z.string().nullable().optional(),
      items: z.array(z.any()).optional(),
      followUpDate: z.string().nullable().optional(),
    })
    .optional(),
  invoiceId: z.string().uuid().optional(),
  invoiceUpdates: z
    .object({
      items: z.array(z.any()).optional(),
      notes: z.string().nullable().optional(),
      discountTotal: z.string().optional(),
    })
    .optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const { clinicId } = await requireClinicSession(
      { prescription: ["draft"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = patchDraftsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let updatedPrescription = null;
    let updatedInvoice = null;

    if (parsed.data.prescriptionId && parsed.data.prescriptionUpdates) {
      const { chiefComplaint, diagnosis, items, followUpDate } = parsed.data.prescriptionUpdates;
      updatedPrescription = await PrescriptionDomainService.updateDraftPrescription(
        clinicId,
        parsed.data.prescriptionId,
        {
          chiefComplaint,
          diagnosis,
          items: items as GroundedPrescriptionItem[],
          followUpDate: followUpDate ? new Date(followUpDate) : followUpDate === null ? null : undefined,
        }
      );
    }

    if (parsed.data.invoiceId && parsed.data.invoiceUpdates) {
      const { items, notes, discountTotal } = parsed.data.invoiceUpdates;
      updatedInvoice = await BillingDomainService.updateDraftInvoice(
        clinicId,
        parsed.data.invoiceId,
        {
          items: items as GroundedInvoiceItem[],
          notes,
          discountTotal,
        }
      );
    }

    return NextResponse.json({
      success: true,
      prescription: updatedPrescription,
      invoice: updatedInvoice,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
