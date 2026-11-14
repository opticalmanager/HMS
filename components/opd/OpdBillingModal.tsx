"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { clinicalStore } from "@/services/clinical-store";
import { BillingService } from "@/services/billing.service";
import { formatCurrencyINR } from "@/utils/formatting";
import type { Appointment, Invoice, InvoiceItem, PaymentMode } from "@/types/hms";
import { Receipt, Printer, Plus, Trash2, Check, CreditCard, Banknote, Smartphone } from "lucide-react";

interface OpdBillingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  onInvoiceCreated?: (invoice: Invoice) => void;
}

export function OpdBillingModal({
  open,
  onOpenChange,
  appointment,
  onInvoiceCreated,
}: OpdBillingModalProps) {
  const [items, setItems] = React.useState<InvoiceItem[]>([]);
  const [discountPercent, setDiscountPercent] = React.useState<number>(0);
  const [paymentMode, setPaymentMode] = React.useState<PaymentMode>("cash");
  const [amountPaid, setAmountPaid] = React.useState<number>(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // New Line Item State
  const [newDesc, setNewDesc] = React.useState("");
  const [newPrice, setNewPrice] = React.useState("");
  const [newCat, setNewCat] = React.useState<InvoiceItem["category"]>("procedure");

  React.useEffect(() => {
    if (open && appointment) {
      const initialFee = appointment.consultationFee || 500;
      const initialItems: InvoiceItem[] = [
        {
          id: "item-consult",
          description: `OPD Consultation - ${appointment.doctorName}`,
          category: "consultation",
          quantity: 1,
          unitPrice: initialFee,
          gstRate: 0,
          amount: initialFee,
        },
      ];
      setItems(initialItems);
      setDiscountPercent(0);
      setAmountPaid(initialFee);
    }
  }, [open, appointment]);

  // Recalculate totals
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountTotal = (subtotal * discountPercent) / 100;
  const taxableAmount = subtotal - discountTotal;
  const grandTotal = Math.max(0, taxableAmount);
  const balanceDue = Math.max(0, grandTotal - amountPaid);

  const handleAddItem = () => {
    if (!newDesc.trim() || !newPrice) return;
    const price = parseFloat(newPrice) || 0;
    const item: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: newDesc.trim(),
      category: newCat,
      quantity: 1,
      unitPrice: price,
      gstRate: 0,
      amount: price,
    };
    setItems((prev) => [...prev, item]);
    setNewDesc("");
    setNewPrice("");
    setAmountPaid((prev) => prev + price);
  };

  const handleRemoveItem = (id?: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSaveInvoice = (printThermal: boolean = false) => {
    if (!appointment) return;
    setIsSubmitting(true);

    const invoiceNumber = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      organizationId: appointment.organizationId || "org-apex-001",
      branchId: appointment.branchId || "br-main-001",
      patientId: appointment.patientId,
      patientName: appointment.patientName || "Walk-In Patient",
      patientPhone: appointment.patientPhone || "",
      invoiceType: "opd",
      items,
      subtotal,
      taxTotal: 0,
      discountTotal,
      grandTotal,
      amountPaid,
      balanceDue,
      paymentStatus: balanceDue === 0 ? "paid" : amountPaid > 0 ? "partially_paid" : "pending",
      paymentMode,
      createdAt: new Date().toISOString(),
    };

    clinicalStore.addInvoice(invoice);

    if (printThermal) {
      const thermalText = BillingService.generateThermalReceiptText(
        "Visual Eyez Eye Care & Multispecialty Hospital",
        invoice,
        "+91 9871900034"
      );

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`<pre style="font-family: monospace; font-size: 11px;">${thermalText}</pre>`);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }

    if (onInvoiceCreated) {
      onInvoiceCreated(invoice);
    }

    setIsSubmitting(false);
    onOpenChange(false);
  };

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                <Receipt className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900">
                  Generate OPD Bill
                </DialogTitle>
                <p className="text-[11px] text-slate-500">
                  {appointment.patientName} • Token #{appointment.tokenNumber} • {appointment.doctorName}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {appointment.patientUhid}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Items Table */}
          <div>
            <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Billed Services & Procedures
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-2 text-center w-16">Qty</th>
                    <th className="py-2 px-3 text-right w-24">Price</th>
                    <th className="py-2 px-3 text-right w-24">Total</th>
                    <th className="py-2 px-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-medium text-slate-900">
                        {item.description}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-600">{item.quantity}</td>
                      <td className="py-2 px-3 text-right text-slate-600">
                        {formatCurrencyINR(item.unitPrice)}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900">
                        {formatCurrencyINR(item.quantity * item.unitPrice)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {items.length > 1 && (
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Add Custom Procedure */}
          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">Add Procedure or Investigation</span>
            <div className="flex items-center gap-2">
              <Input
                placeholder="e.g. Refraction / Ophthalmoscopy / IOP check"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="text-xs h-7 flex-1"
              />
              <Input
                placeholder="₹ Price"
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="text-xs h-7 w-20 text-right"
              />
              <Button
                onClick={handleAddItem}
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50 cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
          </div>

          {/* Payment & Discount Controls */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            {/* Left: Mode Selection */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-700">Payment Mode</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMode("cash")}
                  className={`py-1.5 px-2 rounded-md border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    paymentMode === "cash"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Banknote className="h-3.5 w-3.5" />
                  <span className="text-[10px]">Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode("upi")}
                  className={`py-1.5 px-2 rounded-md border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    paymentMode === "upi"
                      ? "border-blue-500 bg-blue-50 text-blue-800 font-semibold"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span className="text-[10px]">UPI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode("card")}
                  className={`py-1.5 px-2 rounded-md border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    paymentMode === "card"
                      ? "border-purple-500 bg-purple-50 text-purple-800 font-semibold"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span className="text-[10px]">Card</span>
                </button>
              </div>

              <div className="pt-2">
                <label className="text-[11px] text-slate-500 block mb-1">Discount (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => {
                    const pct = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                    setDiscountPercent(pct);
                    const disc = (subtotal * pct) / 100;
                    setAmountPaid(Math.max(0, subtotal - disc));
                  }}
                  className="h-7 text-xs w-24"
                />
              </div>
            </div>

            {/* Right: Totals Breakdown */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrencyINR(subtotal)}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount ({discountPercent}%):</span>
                  <span className="font-mono">-{formatCurrencyINR(discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="font-mono text-emerald-700">{formatCurrencyINR(grandTotal)}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-600">Amount Paid:</span>
                <Input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  className="h-6 w-24 text-right font-mono font-bold text-xs"
                />
              </div>
              {balanceDue > 0 && (
                <div className="flex justify-between text-amber-700 text-[11px] font-semibold pt-0.5">
                  <span>Balance Due:</span>
                  <span className="font-mono">{formatCurrencyINR(balanceDue)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleSaveInvoice(true)}
              className="text-xs h-8 gap-1.5 border-slate-300"
            >
              <Printer className="h-3.5 w-3.5" />
              Save & Print (80mm)
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleSaveInvoice(false)}
              className="text-xs h-8 gap-1.5 bg-[#1976D2] hover:bg-blue-700"
            >
              <Check className="h-3.5 w-3.5" />
              Save Bill
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
