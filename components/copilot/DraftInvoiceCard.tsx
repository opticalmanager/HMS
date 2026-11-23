"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, Plus, Trash2, ShieldCheck, Tag, Stethoscope } from "lucide-react";
import type { GroundedInvoiceItem } from "@/services/domain/billing-service";

interface DraftInvoiceCardProps {
  invoiceId?: string;
  invoiceNumber?: string;
  items: GroundedInvoiceItem[];
  onChangeItems: (items: GroundedInvoiceItem[]) => void;
  notes?: string | null;
  onChangeNotes?: (notes: string) => void;
  readOnly?: boolean;
}

export function DraftInvoiceCard({
  invoiceId,
  invoiceNumber,
  items,
  onChangeItems,
  notes,
  onChangeNotes,
  readOnly = false,
}: DraftInvoiceCardProps) {
  const handleItemChange = (index: number, field: keyof GroundedInvoiceItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    // Recalculate line total deterministically
    const qty = Math.max(1, Number(item.quantity) || 1);
    const price = Math.max(0, Number(item.unitPrice) || 0);
    const taxRate = Math.max(0, Number(item.taxRate) || 0);
    const amount = Math.round(qty * price * 100) / 100;
    const taxAmount = Math.round(amount * (taxRate / 100) * 100) / 100;
    const total = Math.round((amount + taxAmount) * 100) / 100;

    item.quantity = qty;
    item.unitPrice = price;
    item.amount = amount;
    item.taxAmount = taxAmount;
    item.total = total;

    updated[index] = item;
    onChangeItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index);
    onChangeItems(updated);
  };

  const handleAddItem = () => {
    const newItem: GroundedInvoiceItem = {
      id: crypto.randomUUID(),
      name: "Custom Clinical Service",
      quantity: 1,
      unitPrice: 200,
      amount: 200,
      taxRate: 0,
      taxAmount: 0,
      total: 200,
      priceSource: "DOCTOR_OVERRIDE",
      confidence: 1.0,
      matchScore: 1.0,
      needsReview: false,
    };
    onChangeItems([...items, newItem]);
  };

  const handleAddConsultationChip = () => {
    const hasConsultation = items.some((i) => /consult|opd/i.test(i.name));
    if (hasConsultation) return;

    const consultationItem: GroundedInvoiceItem = {
      id: crypto.randomUUID(),
      name: "General OPD Consultation",
      quantity: 1,
      unitPrice: 500,
      amount: 500,
      taxRate: 0,
      taxAmount: 0,
      total: 500,
      priceSource: "OFFICIAL_TARIFF",
      confidence: 1.0,
      matchScore: 1.0,
      needsReview: false,
    };
    onChangeItems([consultationItem, ...items]);
  };

  const subtotal = items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  const taxTotal = items.reduce((acc, it) => acc + (Number(it.taxAmount) || 0), 0);
  const grandTotal = subtotal + taxTotal;

  const hasConsultation = items.some((i) => /consult|opd/i.test(i.name));

  return (
    <Card className="border border-slate-200 shadow-2xs bg-white mb-4">
      <CardHeader className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/60 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-[#2563EB]" />
          <CardTitle className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            2. Grounded Billable Items & OPD Invoice Draft
          </CardTitle>
          {invoiceNumber && (
            <Badge variant="outline" className="text-[10px] font-mono py-0 h-4 bg-slate-100 text-slate-600 border-slate-200">
              {invoiceNumber}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!hasConsultation && !readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddConsultationChip}
              className="h-7 text-[11px] gap-1 border-blue-200 bg-blue-50/50 text-[#2563EB] hover:bg-blue-100 cursor-pointer"
            >
              <Stethoscope className="h-3 w-3" />
              + Add OPD Consultation (₹500)
            </Button>
          )}
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="h-7 text-xs gap-1 border-slate-200 hover:border-[#2563EB] hover:text-[#2563EB] cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              Add Service
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-200">
                <th className="py-2 px-3 w-8">#</th>
                <th className="py-2 px-3 min-w-[200px]">Service / Investigation / Procedure</th>
                <th className="py-2 px-2.5 w-20 text-center">Qty</th>
                <th className="py-2 px-2.5 w-28 text-right">Unit Price (₹)</th>
                <th className="py-2 px-2.5 w-24 text-center">Price Source</th>
                <th className="py-2 px-3 w-28 text-right">Line Total (₹)</th>
                {!readOnly && <th className="py-2 px-2 w-10 text-center"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                    No billable items added yet. Click "+ Add OPD Consultation" or "+ Add Service".
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 text-slate-400 font-semibold">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <Input
                        value={it.name}
                        onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                        className="h-7 text-xs font-semibold text-slate-900 border-transparent hover:border-slate-300 focus:border-[#2563EB] bg-transparent p-1"
                        disabled={readOnly}
                      />
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      <Input
                        type="number"
                        min={1}
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", parseInt(e.target.value, 10) || 1)}
                        className="h-7 text-xs text-center border-slate-200 bg-white w-14 mx-auto"
                        disabled={readOnly}
                      />
                    </td>
                    <td className="py-2 px-2.5 text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={it.unitPrice}
                        onChange={(e) => handleItemChange(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="h-7 text-xs text-right border-slate-200 bg-white w-24 ml-auto tabular-nums"
                        disabled={readOnly}
                      />
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      {it.priceSource === "OFFICIAL_TARIFF" ? (
                        <Badge variant="outline" className="text-[9px] font-semibold bg-blue-50 text-[#2563EB] border-blue-200 py-0 h-5">
                          Official Tariff
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-semibold bg-amber-50 text-amber-800 border-amber-200 py-0 h-5">
                          Doctor Spoken
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                      ₹{it.total.toFixed(2)}
                    </td>
                    {!readOnly && (
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Invoice Summary & Notes */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-4 pt-2">
          <div className="flex-1 w-full space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Billing Desk Notes
            </label>
            <Input
              value={notes || ""}
              onChange={(e) => onChangeNotes && onChangeNotes(e.target.value)}
              placeholder="e.g. Follow-up consultation fee waived, collecting lab charges at desk"
              className="h-8 text-xs bg-slate-50/50"
              disabled={readOnly}
            />
          </div>

          <div className="w-full md:w-64 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5 self-end">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="tabular-nums font-medium">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax Total:</span>
              <span className="tabular-nums font-medium">₹{taxTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1.5 text-sm">
              <span>Grand Total:</span>
              <span className="tabular-nums text-[#2563EB]">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
