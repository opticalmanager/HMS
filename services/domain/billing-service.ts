import "server-only";
import crypto from "node:crypto";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import {
  invoices,
  type InvoiceEntity,
  type NewInvoiceEntity,
} from "@/db/schema/billing";
import { branches } from "@/db/schema/branches";
import { profiles } from "@/db/schema/profiles";
import { fuzzyMatchTariffs } from "@/lib/fuzzy-search";
import { formatSequenceNumber } from "@/utils/document-series";
import { enqueueWebhookEvent } from "./notification-service";
import type { ExtractedBillableItem } from "@/lib/validations/clinical-ai";

export class CannotModifyIssuedInvoiceError extends Error {
  code = "INVOICE_ALREADY_FINALIZED";
  status = 409;
  constructor(message = "Only DRAFT invoices can be modified.") {
    super(message);
    this.name = "CannotModifyIssuedInvoiceError";
  }
}

export class InvoiceNotFoundError extends Error {
  code = "INVOICE_NOT_FOUND";
  status = 404;
  constructor(message = "Invoice not found.") {
    super(message);
    this.name = "InvoiceNotFoundError";
  }
}

export interface GroundedInvoiceItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  tariffId?: string | null;
  priceSource: "OFFICIAL_TARIFF" | "DOCTOR_OVERRIDE";
  confidence: number;
  matchScore: number;
  needsReview: boolean;
}

export interface CreateDraftInvoiceInput {
  organizationId: string;
  patientId: string;
  appointmentId?: string | null;
  items: ExtractedBillableItem[];
  billerUserId?: string | null;
  branchId?: string | null;
  invoiceType?: "opd" | "ipd" | "pharmacy" | "lab" | "combined";
  notes?: string | null;
}

/**
 * Ensures non-null foreign keys branch_id and biller_id are resolved for invoices.
 */
export async function ensureBillingPrerequisites(
  organizationId: string,
  billerUserId?: string | null,
  preferredBranchId?: string | null
): Promise<{ branchId: string; billerId: string }> {
  // 1. Resolve Branch
  let branchId = preferredBranchId;
  if (branchId) {
    const [b] = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.organizationId, organizationId), eq(branches.id, branchId)))
      .limit(1);
    if (!b) branchId = undefined;
  }

  if (!branchId) {
    let [branch] = await db
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.organizationId, organizationId))
      .limit(1);

    if (!branch) {
      const [newBranch] = await db
        .insert(branches)
        .values({
          organizationId,
          name: "Main Clinic Branch",
          branchCode: "MAIN",
          addressLine1: "Clinic Facility Address",
          city: "Metro City",
          pincode: "110001",
          phone: "+919876543210",
        })
        .returning({ id: branches.id });
      branch = newBranch;
    }
    branchId = branch.id;
  }

  // 2. Resolve Biller Profile
  let billerProfile: { id: string } | undefined;
  if (billerUserId) {
    const [p] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(eq(profiles.organizationId, organizationId), eq(profiles.id, billerUserId)))
      .limit(1);
    billerProfile = p;
  }

  if (!billerProfile) {
    const [firstProfile] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.organizationId, organizationId))
      .limit(1);
    billerProfile = firstProfile;
  }

  if (!billerProfile) {
    const newProfileId =
      billerUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(billerUserId)
        ? billerUserId
        : crypto.randomUUID();

    const [newProfile] = await db
      .insert(profiles)
      .values({
        id: newProfileId,
        organizationId,
        branchId,
        email: `billing-${organizationId.slice(0, 8)}@apexclinic.local`,
        fullName: "Clinic Billing Desk",
        role: "receptionist",
      })
      .returning({ id: profiles.id });
    billerProfile = newProfile;
  }

  return {
    branchId,
    billerId: billerProfile.id,
  };
}

export class BillingDomainService {
  /**
   * Retrieves an invoice by ID with strict tenant isolation.
   */
  static async getInvoiceById(
    organizationId: string,
    invoiceId: string
  ): Promise<InvoiceEntity | null> {
    const [row] = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.organizationId, organizationId),
          eq(invoices.id, invoiceId)
        )
      )
      .limit(1);

    return row || null;
  }

  /**
   * Lists invoices for a clinic with optional filters.
   */
  static async listInvoices(
    organizationId: string,
    options: {
      patientId?: string;
      status?: "DRAFT" | "ISSUED" | "PAID" | "VOID";
      limit?: number;
    } = {}
  ): Promise<InvoiceEntity[]> {
    const conditions = [eq(invoices.organizationId, organizationId)];

    if (options.patientId) {
      conditions.push(eq(invoices.patientId, options.patientId));
    }
    if (options.status) {
      conditions.push(eq(invoices.status, options.status));
    }

    const limit = Math.max(1, Math.min(100, options.limit || 50));

    return db
      .select()
      .from(invoices)
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt))
      .limit(limit);
  }

  /**
   * Creates a draft invoice from extracted billable items with deterministic tariff grounding.
   * Official price ALWAYS comes from service_tariffs in DB (Pricing Law - Law 4.2).
   * Custom price is accepted only when doctor explicitly dictated it (priceSource = DOCTOR_OVERRIDE).
   * Calculates subtotal, taxTotal, and grandTotal deterministically.
   * Saves invoice with status: "DRAFT".
   */
  static async createDraftInvoiceFromItems(
    input: CreateDraftInvoiceInput
  ): Promise<InvoiceEntity> {
    const { organizationId, patientId, appointmentId, items, billerUserId, branchId: preferredBranchId, notes } = input;

    const { branchId, billerId } = await ensureBillingPrerequisites(
      organizationId,
      billerUserId,
      preferredBranchId
    );

    const groundedItems: GroundedInvoiceItem[] = [];
    let subtotalNum = 0;
    let taxTotalNum = 0;

    for (const item of items) {
      const matches = await fuzzyMatchTariffs(organizationId, item.spokenServiceName, 1);
      const topMatch = matches.length > 0 ? matches[0] : null;
      const matchScore = topMatch ? topMatch.score : 0;

      let unitPrice = 0;
      let taxRate = 0;
      let priceSource: "OFFICIAL_TARIFF" | "DOCTOR_OVERRIDE" = "OFFICIAL_TARIFF";
      let needsReview = false;

      if (item.customAmountIfStated !== null && item.customAmountIfStated !== undefined) {
        // Doctor explicitly spoke an amount override
        unitPrice = Number(item.customAmountIfStated);
        priceSource = "DOCTOR_OVERRIDE";
        needsReview = true;
        taxRate = topMatch ? parseFloat(topMatch.taxRate || "0.00") : 0;
      } else if (topMatch) {
        // Grounded official price
        unitPrice = parseFloat(topMatch.price);
        taxRate = parseFloat(topMatch.taxRate || "0.00");
        priceSource = "OFFICIAL_TARIFF";
        needsReview = topMatch.needsReview || item.confidence < 0.75;
      } else {
        // Unmatched item
        unitPrice = 0;
        priceSource = "OFFICIAL_TARIFF";
        needsReview = true;
      }

      const qty = Math.max(1, item.quantity || 1);
      const lineAmount = Math.round(qty * unitPrice * 100) / 100;
      const lineTax = Math.round(lineAmount * (taxRate / 100) * 100) / 100;
      const lineTotal = lineAmount + lineTax;

      subtotalNum += lineAmount;
      taxTotalNum += lineTax;

      groundedItems.push({
        id: topMatch?.id || crypto.randomUUID(),
        name: topMatch ? topMatch.name : item.spokenServiceName,
        quantity: qty,
        unitPrice,
        amount: lineAmount,
        taxRate,
        taxAmount: lineTax,
        total: lineTotal,
        tariffId: topMatch?.id || null,
        priceSource,
        confidence: item.confidence,
        matchScore,
        needsReview,
      });
    }

    const subtotalStr = subtotalNum.toFixed(2);
    const taxTotalStr = taxTotalNum.toFixed(2);
    const grandTotalNum = Math.round((subtotalNum + taxTotalNum) * 100) / 100;
    const grandTotalStr = grandTotalNum.toFixed(2);

    // Generate unique sequential invoice number
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(eq(invoices.organizationId, organizationId));

    const seqNumber = (countResult?.count || 0) + 1;
    const randomSuffix = Math.floor(Math.random() * 9000 + 1000);
    const invoiceNumber = formatSequenceNumber("INV", seqNumber * 10000 + randomSuffix);

    const [created] = await db
      .insert(invoices)
      .values({
        organizationId,
        invoiceNumber,
        branchId,
        patientId,
        appointmentId: appointmentId || null,
        billerId,
        status: "DRAFT",
        invoiceType: input.invoiceType || "opd",
        items: groundedItems as any,
        subtotal: subtotalStr,
        taxTotal: taxTotalStr,
        discountTotal: "0.00",
        grandTotal: grandTotalStr,
        amountPaid: "0.00",
        balanceDue: grandTotalStr,
        paymentStatus: "pending",
        notes: notes || null,
      })
      .returning();

    return created;
  }

  /**
   * Updates a draft invoice. Rejects modifications on finalized/issued invoices.
   */
  static async updateDraftInvoice(
    organizationId: string,
    invoiceId: string,
    updates: {
      items?: GroundedInvoiceItem[];
      notes?: string | null;
      discountTotal?: string;
    }
  ): Promise<InvoiceEntity> {
    const existing = await this.getInvoiceById(organizationId, invoiceId);
    if (!existing) {
      throw new InvoiceNotFoundError();
    }

    if (existing.status !== "DRAFT") {
      throw new CannotModifyIssuedInvoiceError();
    }

    const updateValues: Partial<NewInvoiceEntity> = {
      updatedAt: new Date(),
    };

    if (updates.notes !== undefined) updateValues.notes = updates.notes;

    if (updates.items) {
      let subtotal = 0;
      let taxTotal = 0;
      for (const it of updates.items) {
        subtotal += it.amount;
        taxTotal += it.taxAmount;
      }
      const discount = updates.discountTotal ? parseFloat(updates.discountTotal) : parseFloat(existing.discountTotal || "0.00");
      const grandTotal = Math.max(0, subtotal + taxTotal - discount);

      updateValues.items = updates.items as any;
      updateValues.subtotal = subtotal.toFixed(2);
      updateValues.taxTotal = taxTotal.toFixed(2);
      updateValues.discountTotal = discount.toFixed(2);
      updateValues.grandTotal = grandTotal.toFixed(2);
      updateValues.balanceDue = grandTotal.toFixed(2);
    }

    const [updated] = await db
      .update(invoices)
      .set(updateValues)
      .where(
        and(
          eq(invoices.organizationId, organizationId),
          eq(invoices.id, invoiceId)
        )
      )
      .returning();

    return updated;
  }

  /**
   * Transitions DRAFT invoice to ISSUED status and enqueues invoice.issued outbox event.
   */
  static async issueInvoice(options: {
    organizationId: string;
    invoiceId: string;
    issuedByUserId?: string;
  }): Promise<InvoiceEntity> {
    const { organizationId, invoiceId } = options;

    const existing = await this.getInvoiceById(organizationId, invoiceId);
    if (!existing) {
      throw new InvoiceNotFoundError();
    }

    if (existing.status === "ISSUED" || existing.status === "PAID") {
      return existing;
    }

    return await db.transaction(async (tx) => {
      const [issued] = await tx
        .update(invoices)
        .set({
          status: "ISSUED",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(invoices.organizationId, organizationId),
            eq(invoices.id, invoiceId)
          )
        )
        .returning();

      // Enqueue invoice.issued outbox event
      await enqueueWebhookEvent(tx, {
        organizationId,
        eventType: "invoice.issued",
        payload: {
          invoiceId: issued.id,
          invoiceNumber: issued.invoiceNumber,
          patientId: issued.patientId,
          appointmentId: issued.appointmentId,
          grandTotal: issued.grandTotal,
          balanceDue: issued.balanceDue,
          itemsCount: (issued.items as any[])?.length || 0,
        },
      });

      return issued;
    });
  }

  /**
   * Voids an invoice and enqueues invoice.voided outbox event.
   */
  static async voidInvoice(options: {
    organizationId: string;
    invoiceId: string;
    reason?: string;
  }): Promise<InvoiceEntity> {
    const { organizationId, invoiceId, reason } = options;

    const existing = await this.getInvoiceById(organizationId, invoiceId);
    if (!existing) {
      throw new InvoiceNotFoundError();
    }

    return await db.transaction(async (tx) => {
      const [voided] = await tx
        .update(invoices)
        .set({
          status: "VOID",
          notes: reason ? `${existing.notes ? existing.notes + " | " : ""}VOID REASON: ${reason}` : existing.notes,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(invoices.organizationId, organizationId),
            eq(invoices.id, invoiceId)
          )
        )
        .returning();

      await enqueueWebhookEvent(tx, {
        organizationId,
        eventType: "invoice.voided",
        payload: {
          invoiceId: voided.id,
          invoiceNumber: voided.invoiceNumber,
          patientId: voided.patientId,
          reason,
        },
      });

      return voided;
    });
  }
}
