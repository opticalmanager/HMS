import { NextResponse, type NextRequest } from "next/server";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";
import {
  BillingDomainService,
  InvoiceNotFoundError,
  CannotModifyIssuedInvoiceError,
} from "@/services/domain/billing-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { clinicId, user } = await requireClinicSession(
      { billing: ["issue"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    const { id } = await context.params;

    try {
      const issued = await BillingDomainService.issueInvoice({
        organizationId: clinicId,
        invoiceId: id,
        issuedByUserId: user.id,
      });

      return NextResponse.json({
        success: true,
        invoice: issued,
      });
    } catch (err: unknown) {
      if (err instanceof InvoiceNotFoundError) {
        return NextResponse.json(
          { success: false, error: err.message, code: err.code },
          { status: 404 }
        );
      }
      if (err instanceof CannotModifyIssuedInvoiceError) {
        return NextResponse.json(
          { success: false, error: err.message, code: err.code },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (error) {
    return handleAuthError(error);
  }
}
