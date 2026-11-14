import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BillingService } from "@/services/billing.service";

describe("Billing Service Calculations & Thermal Receipt Formatter", () => {
  it("calculates line items, subtotal, and grand total correctly", () => {
    const rawItems = [
      { description: "Doctor Consultation", category: "consultation" as const, quantity: 1, unitPrice: 800, gstRate: 0 },
      { description: "CBC Lab Test", category: "lab_test" as const, quantity: 1, unitPrice: 500, gstRate: 0 },
    ];

    const result = BillingService.calculateInvoiceTotals(rawItems);
    assert.equal(result.subtotal, 1300);
    assert.equal(result.taxTotal, 0);
    assert.equal(result.grandTotal, 1300);
  });

  it("handles line discounts accurately", () => {
    const rawItems = [
      { description: "X-Ray Chest", category: "procedure" as const, quantity: 1, unitPrice: 1000, gstRate: 0, discountPercent: 10 },
    ];

    const result = BillingService.calculateInvoiceTotals(rawItems);
    assert.equal(result.subtotal, 1000);
    assert.equal(result.discountTotal, 100);
    assert.equal(result.grandTotal, 900);
  });

  it("generates full invoice entity with paid status", () => {
    const invoice = BillingService.generateInvoice(
      {
        organizationId: "org-1",
        branchId: "br-1",
        patientId: "pat-1",
        patientName: "Ramesh Patel",
        patientPhone: "9823012345",
        invoiceType: "opd",
        items: [
          { description: "Consultation", category: "consultation", quantity: 1, unitPrice: 500, gstRate: 0 },
        ],
        amountPaid: 500,
        paymentMode: "upi",
      },
      101
    );

    assert.equal(invoice.invoiceNumber, "INV-2026-000101");
    assert.equal(invoice.grandTotal, 500);
    assert.equal(invoice.amountPaid, 500);
    assert.equal(invoice.balanceDue, 0);
    assert.equal(invoice.paymentStatus, "paid");
  });

  it("formats 80mm thermal receipt text without crashing", () => {
    const invoice = BillingService.generateInvoice(
      {
        organizationId: "org-1",
        branchId: "br-1",
        patientId: "pat-1",
        patientName: "Ramesh Patel",
        patientPhone: "9823012345",
        invoiceType: "opd",
        items: [
          { description: "Consultation", category: "consultation", quantity: 1, unitPrice: 500, gstRate: 0 },
        ],
        amountPaid: 500,
      },
      101
    );

    const receiptText = BillingService.generateThermalReceiptText(
      "Apex Superspeciality Hospital",
      invoice,
      "+91 20 2567 8900"
    );

    assert.ok(receiptText.includes("APEX SUPERSPECIALITY HOSPITAL"));
    assert.ok(receiptText.includes("INV-2026-000101"));
    assert.ok(receiptText.includes("Ramesh Patel"));
    assert.ok(receiptText.includes("Consultation"));
  });
});
