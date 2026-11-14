import { formatSequenceNumber } from "@/utils/document-series";
import { calculateGstBreakdown } from "@/utils/gstin";
import { formatCurrencyINR, formatClinicalDate } from "@/utils/formatting";
import type { Invoice, InvoiceItem, InvoiceType, PaymentMode, PaymentStatus } from "@/types/hms";

export interface CreateInvoiceInput {
  organizationId: string;
  branchId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  invoiceType: InvoiceType;
  items: Array<{
    description: string;
    category: InvoiceItem["category"];
    quantity: number;
    unitPrice: number;
    gstRate: number;
    discountPercent?: number;
  }>;
  hospitalStateCode?: string;
  patientStateCode?: string;
  amountPaid?: number;
  paymentMode?: PaymentMode;
  transactionRef?: string;
}

export class BillingService {
  /**
   * Calculates subtotal, GST totals, discounts, and net payable
   */
  static calculateInvoiceTotals(
    rawItems: CreateInvoiceInput["items"],
    hospitalStateCode: string = "27",
    patientStateCode: string = "27"
  ): {
    items: InvoiceItem[];
    subtotal: number;
    taxTotal: number;
    discountTotal: number;
    grandTotal: number;
  } {
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    const items: InvoiceItem[] = rawItems.map((item) => {
      const lineBase = item.quantity * item.unitPrice;
      const discount = item.discountPercent ? (lineBase * item.discountPercent) / 100 : 0;
      const taxable = lineBase - discount;

      const gst = calculateGstBreakdown(taxable, item.gstRate, hospitalStateCode, patientStateCode);

      subtotal += lineBase;
      discountTotal += discount;
      taxTotal += gst.totalTax;

      return {
        description: item.description,
        category: item.category,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        gstRate: item.gstRate,
        discountPercent: item.discountPercent,
        amount: gst.totalWithTax,
      };
    });

    const grandTotal = Number((subtotal - discountTotal + taxTotal).toFixed(2));

    return {
      items,
      subtotal: Number(subtotal.toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      discountTotal: Number(discountTotal.toFixed(2)),
      grandTotal,
    };
  }

  /**
   * Generates a formal hospital invoice
   */
  static generateInvoice(input: CreateInvoiceInput, sequenceCounter: number): Invoice {
    const calc = this.calculateInvoiceTotals(
      input.items,
      input.hospitalStateCode,
      input.patientStateCode
    );

    const amountPaid = input.amountPaid || 0;
    const balanceDue = Number(Math.max(0, calc.grandTotal - amountPaid).toFixed(2));
    let paymentStatus: PaymentStatus = "pending";

    if (amountPaid >= calc.grandTotal) {
      paymentStatus = "paid";
    } else if (amountPaid > 0) {
      paymentStatus = "partially_paid";
    }

    return {
      id: formatSequenceNumber("INV", sequenceCounter),
      invoiceNumber: formatSequenceNumber("INV", sequenceCounter),
      organizationId: input.organizationId,
      branchId: input.branchId,
      patientId: input.patientId,
      patientName: input.patientName,
      patientPhone: input.patientPhone,
      invoiceType: input.invoiceType,
      items: calc.items,
      subtotal: calc.subtotal,
      taxTotal: calc.taxTotal,
      discountTotal: calc.discountTotal,
      grandTotal: calc.grandTotal,
      amountPaid,
      balanceDue,
      paymentStatus,
      paymentMode: input.paymentMode || "cash",
      transactionRef: input.transactionRef,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Generates formatted text layout for 80mm thermal receipt printers (POS slip)
   */
  static generateThermalReceiptText(
    hospitalName: string,
    invoice: Invoice,
    branchPhone: string
  ): string {
    const divider = "------------------------------------------";
    const lines: string[] = [];

    lines.push(hospitalName.toUpperCase());
    lines.push(`Ph: ${branchPhone}`);
    lines.push(divider);
    lines.push(`Inv #: ${invoice.invoiceNumber}`);
    lines.push(`Date : ${formatClinicalDate(invoice.createdAt)}`);
    lines.push(`Pt   : ${invoice.patientName}`);
    lines.push(divider);
    lines.push("Item                     Qty     Amount");
    lines.push(divider);

    for (const item of invoice.items) {
      const desc = item.description.padEnd(23).slice(0, 23);
      const qty = String(item.quantity).padStart(3);
      const amt = formatCurrencyINR(item.amount).padStart(12);
      lines.push(`${desc} ${qty} ${amt}`);
    }

    lines.push(divider);
    lines.push(`Subtotal     : ${formatCurrencyINR(invoice.subtotal)}`);
    lines.push(`GST / Tax    : ${formatCurrencyINR(invoice.taxTotal)}`);
    lines.push(`Grand Total  : ${formatCurrencyINR(invoice.grandTotal)}`);
    lines.push(`Paid         : ${formatCurrencyINR(invoice.amountPaid)}`);
    lines.push(`Balance Due  : ${formatCurrencyINR(invoice.balanceDue)}`);
    lines.push(divider);
    lines.push("Mode: " + (invoice.paymentMode || "cash").toUpperCase());
    lines.push("      Get Well Soon! Thank You!       ");
    lines.push(divider);

    return lines.join("\n");
  }
}
