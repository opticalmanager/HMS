import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";
import { PrescriptionDomainService } from "@/services/domain/prescription-service";
import { BillingDomainService } from "@/services/domain/billing-service";

const approveSchema = z.object({
  prescriptionId: z.string().uuid("Invalid prescription UUID"),
  invoiceId: z.string().uuid("Invalid invoice UUID").optional().nullable(),
  issueInvoiceNow: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const { clinicId, user, role } = await requireClinicSession(
      { prescription: ["approve"] },
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

    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // 1. Approve prescription (locks Rx, stamps approvedByUserId, enqueues prescription.approved)
    const approvedPrescription = await PrescriptionDomainService.approvePrescription({
      organizationId: clinicId,
      prescriptionId: parsed.data.prescriptionId,
      approvedByUserId: user.id,
    });

    // 2. Handle invoice according to RBAC laws
    let approvedInvoice = null;
    let invoiceStatus = "NO_INVOICE";

    if (parsed.data.invoiceId) {
      const canIssueBilling = role === "owner" || role === "admin" || role === "receptionist";

      if (canIssueBilling && parsed.data.issueInvoiceNow) {
        approvedInvoice = await BillingDomainService.issueInvoice({
          organizationId: clinicId,
          invoiceId: parsed.data.invoiceId,
          issuedByUserId: user.id,
        });
        invoiceStatus = "ISSUED";
      } else {
        // If doctor or no issue flag, keep invoice safely as DRAFT in DB for billing counter / receptionist
        approvedInvoice = await BillingDomainService.getInvoiceById(clinicId, parsed.data.invoiceId);
        invoiceStatus = "DRAFT_READY_FOR_DESK";
      }
    }

    return NextResponse.json({
      success: true,
      prescription: approvedPrescription,
      invoice: approvedInvoice,
      invoiceStatus,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
