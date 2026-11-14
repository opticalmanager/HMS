"use client";

import * as React from "react";
import { Plus, Trash2, Printer, CheckCircle, QrCode, CreditCard, Banknote, ShieldAlert, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrencyINR } from "@/utils/formatting";
import { BillingService } from "@/services/billing.service";
import { clinicalStore, useClinicalStore } from "@/services/clinical-store";
import { ThermalReceiptModal } from "@/components/billing/ThermalReceiptModal";
import type { InvoiceItem, Invoice, PaymentMode } from "@/types/hms";

interface InvoiceBuilderProps {
  patientName?: string;
  patientPhone?: string;
  uhid?: string;
  onInvoiceCreated?: (invoice: Invoice) => void;
}

export function InvoiceBuilder({
  patientName = "Ramesh Patel",
  patientPhone = "9823012345",
  uhid = "UHID-2026-0041",
  onInvoiceCreated,
}: InvoiceBuilderProps) {
  const store = useClinicalStore();

  const [items, setItems] = React.useState<InvoiceItem[]>([
    {
      description: "Specialist OPD Consultation",
      category: "consultation",
      quantity: 1,
      unitPrice: 800,
      gstRate: 0,
      amount: 800,
    },
    {
      description: "Complete Blood Count (CBC) with ESR",
      category: "lab_test",
      quantity: 1,
      unitPrice: 450,
      gstRate: 0,
      amount: 450,
    },
  ]);

  const [newItem, setNewItem] = React.useState<InvoiceItem>({
    description: "",
    category: "consultation",
    quantity: 1,
    unitPrice: 0,
    gstRate: 0,
    amount: 0,
  });

  // State code for GST (Hospital is 27 Maharashtra)
  const [patientStateCode, setPatientStateCode] = React.useState<string>("27");

  // Discount handler
  const [discountType, setDiscountType] = React.useState<"none" | "percent" | "flat">("none");
  const [discountValue, setDiscountValue] = React.useState<number>(0);
  const [discountReason, setDiscountReason] = React.useState<string>("Senior citizen concession");

  // Payment collection
  const [paymentMode, setPaymentMode] = React.useState<PaymentMode>("upi");
  const [amountPaid, setAmountPaid] = React.useState<number>(1250);
  const [transactionRef, setTransactionRef] = React.useState<string>("UPI-ICICI-9920148");

  // Thermal receipt modal
  const [thermalModalOpen, setThermalModalOpen] = React.useState(false);
  const [createdInvoice, setCreatedInvoice] = React.useState<Invoice | null>(null);
  const [successToast, setSuccessToast] = React.useState("");

  // Calculate totals using BillingService
  const totals = React.useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;

    items.forEach((item) => {
      const lineBase = item.quantity * item.unitPrice;
      const gst = (lineBase * item.gstRate) / 100;
      subtotal += lineBase;
      taxTotal += gst;
    });

    let discountTotal = 0;
    if (discountType === "percent") {
      discountTotal = (subtotal * discountValue) / 100;
    } else if (discountType === "flat") {
      discountTotal = Math.min(discountValue, subtotal);
    }

    const grandTotal = Math.max(0, subtotal - discountTotal + taxTotal);

    return {
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      isInterState: patientStateCode !== store.settings.stateCode,
    };
  }, [items, discountType, discountValue, patientStateCode, store.settings.stateCode]);

  React.useEffect(() => {
    setAmountPaid(totals.grandTotal);
  }, [totals.grandTotal]);

  const addItem = () => {
    if (!newItem.description.trim() || newItem.unitPrice <= 0) return;
    const lineBase = newItem.quantity * newItem.unitPrice;
    const gst = (lineBase * newItem.gstRate) / 100;
    const amount = lineBase + gst;

    setItems([...items, { ...newItem, amount }]);
    setNewItem({
      description: "",
      category: "consultation",
      quantity: 1,
      unitPrice: 0,
      gstRate: 0,
      amount: 0,
    });
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleCreateAndCollect = () => {
    const invNumber = `INV-2026-000${Math.floor(100 + Math.random() * 900)}`;
    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invNumber,
      organizationId: "org-apex-001",
      branchId: "br-main-001",
      patientId: "pat-1",
      patientName,
      patientPhone,
      invoiceType: "opd",
      items,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      discountTotal: totals.discountTotal,
      grandTotal: totals.grandTotal,
      amountPaid,
      balanceDue: Math.max(0, totals.grandTotal - amountPaid),
      paymentStatus: amountPaid >= totals.grandTotal ? "paid" : amountPaid > 0 ? "partially_paid" : "pending",
      paymentMode,
      transactionRef,
      createdAt: new Date().toISOString(),
    };

    clinicalStore.addInvoice(invoice);
    setCreatedInvoice(invoice);
    setSuccessToast(`Invoice ${invoice.invoiceNumber} created and collected successfully!`);
    if (onInvoiceCreated) onInvoiceCreated(invoice);
  };

  // Dynamic UPI string
  const upiQrString = `upi://pay?pa=apex@icici&pn=ApexHospital&am=${totals.grandTotal}&cu=INR&tn=InvoicePayment`;

  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Billed Patient Details
          </span>
          <div className="text-base font-bold text-slate-900">{patientName}</div>
          <div className="text-xs text-slate-500 font-mono">
            UHID: {uhid} | Mobile: {patientPhone}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label className="text-[11px] font-medium text-slate-600 block mb-0.5">Place of Supply (GST)</label>
            <select
              value={patientStateCode}
              onChange={(e) => setPatientStateCode(e.target.value)}
              className="h-8 px-2 rounded border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800"
            >
              <option value="27">27 - Maharashtra (Intra-state CGST+SGST)</option>
              <option value="07">07 - Delhi (Inter-state IGST)</option>
              <option value="29">29 - Karnataka (Inter-state IGST)</option>
              <option value="24">24 - Gujarat (Inter-state IGST)</option>
            </select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (createdInvoice) {
                setThermalModalOpen(true);
              } else {
                handleCreateAndCollect();
                setThermalModalOpen(true);
              }
            }}
            className="h-8 text-xs gap-1.5 border-slate-300"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" /> 80mm Thermal POS Slip
          </Button>
        </div>
      </div>

      {/* Add Line Item Row */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50">
        <div className="md:col-span-2">
          <label className="text-[11px] font-medium text-slate-600 block mb-1">Service / Item Description *</label>
          <Input
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            placeholder="e.g. Bed Charge, Nursing, X-Ray, Dressing"
            className="text-xs h-8 bg-white"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-600 block mb-1">Category</label>
          <select
            value={newItem.category}
            onChange={(e) => setNewItem({ ...newItem, category: e.target.value as any })}
            className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800"
          >
            <option value="consultation">Consultation</option>
            <option value="procedure">Procedure</option>
            <option value="lab_test">Lab Test</option>
            <option value="room_rent">Room / Bed</option>
            <option value="medicine">Pharmacy</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-600 block mb-1">Unit Rate (₹)</label>
          <Input
            type="number"
            value={newItem.unitPrice || ""}
            onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
            className="text-xs h-8 bg-white"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-600 block mb-1">GST Tax Slab</label>
          <select
            value={newItem.gstRate}
            onChange={(e) => setNewItem({ ...newItem, gstRate: parseInt(e.target.value, 10) || 0 })}
            className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800"
          >
            <option value={0}>0% (Exempt)</option>
            <option value={5}>5%</option>
            <option value={12}>12%</option>
            <option value={18}>18%</option>
          </select>
        </div>

        <div className="flex items-end">
          <Button
            type="button"
            onClick={addItem}
            size="sm"
            className="w-full h-8 text-xs bg-[#2563EB] hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Charge
          </Button>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Rate</TableHead>
              <TableHead className="text-right">GST %</TableHead>
              <TableHead className="text-right">Amount (₹)</TableHead>
              <TableHead className="w-12 text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-semibold text-slate-900 text-xs">{item.description}</TableCell>
                <TableCell className="capitalize text-slate-500 text-xs">{item.category}</TableCell>
                <TableCell className="text-right text-xs font-mono">{item.quantity}</TableCell>
                <TableCell className="text-right text-xs font-mono">{formatCurrencyINR(item.unitPrice)}</TableCell>
                <TableCell className="text-right text-xs font-mono">{item.gstRate}%</TableCell>
                <TableCell className="text-right font-bold text-slate-900 text-xs">
                  {formatCurrencyINR(item.amount)}
                </TableCell>
                <TableCell className="text-center">
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Invoice Summary & Tax Engine Split */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Discount & GST Controls */}
          <div className="space-y-3">
            <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                Discount / Concession
              </span>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="h-8 rounded border border-slate-200 bg-white px-2 text-xs"
                >
                  <option value="none">No Discount</option>
                  <option value="percent">Percentage (%)</option>
                  <option value="flat">Flat INR (₹)</option>
                </select>
                {discountType !== "none" && (
                  <Input
                    type="number"
                    value={discountValue || ""}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    placeholder={discountType === "percent" ? "e.g. 10%" : "e.g. 200"}
                    className="h-8 text-xs"
                  />
                )}
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                Payment Collection Mode
              </span>
              <div className="grid grid-cols-4 gap-2">
                {(["upi", "cash", "card", "insurance"] as PaymentMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                      paymentMode === mode
                        ? "bg-[#2563EB] text-white border-blue-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {paymentMode === "upi" && (
                <div className="p-2 rounded bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-[#2563EB]" />
                    <span className="font-mono text-[11px] text-blue-900 font-semibold truncate max-w-[200px]">
                      {upiQrString}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-white text-blue-700 font-mono">
                    apex@icici
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Grand Totals Tally */}
          <div className="flex flex-col justify-between space-y-2 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-500">
                <span>Gross Subtotal:</span>
                <span className="font-semibold text-slate-900">{formatCurrencyINR(totals.subtotal)}</span>
              </div>

              {totals.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Authorized Discount:</span>
                  <span>- {formatCurrencyINR(totals.discountTotal)}</span>
                </div>
              )}

              {/* GST Engine Breakdown */}
              {totals.isInterState ? (
                <div className="flex justify-between text-slate-600">
                  <span>Inter-state IGST:</span>
                  <span className="font-semibold text-slate-900">{formatCurrencyINR(totals.taxTotal)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Central GST (CGST):</span>
                    <span className="font-semibold text-slate-900">{formatCurrencyINR(totals.taxTotal / 2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>State GST (SGST):</span>
                    <span className="font-semibold text-slate-900">{formatCurrencyINR(totals.taxTotal / 2)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                <span>Net Payable:</span>
                <span className="text-lg text-[#2563EB]">{formatCurrencyINR(totals.grandTotal)}</span>
              </div>
            </div>

            <div className="pt-3">
              {successToast ? (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-600" /> {successToast}
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={handleCreateAndCollect}
                  className="w-full bg-[#2563EB] hover:bg-blue-700 h-9 font-bold text-xs gap-1.5"
                >
                  <CheckCircle className="h-4 w-4" /> Collect & Generate Tax Invoice
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 80mm ESC/POS Thermal Receipt Modal */}
      <ThermalReceiptModal
        open={thermalModalOpen}
        onOpenChange={setThermalModalOpen}
        invoice={createdInvoice}
      />
    </div>
  );
}
