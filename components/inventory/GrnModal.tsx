"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { handleEnterNavigation } from "@/utils/form-navigation";
import { clinicalStore, useClinicalStore } from "@/services/clinical-store";
import { PackagePlus, Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrencyINR } from "@/utils/formatting";

interface GrnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function GrnModal({ open, onOpenChange, onSuccess }: GrnModalProps) {
  const store = useClinicalStore();

  const [header, setHeader] = React.useState({
    supplierName: "MedPlus Direct Distributors",
    supplierInvoice: "INV-MP-99014",
    poNumber: "PO-2026-0051",
    receivedDate: new Date().toISOString().split("T")[0],
    verifiedBy: "Karan Johar (Pharmacist)",
  });

  const [items, setItems] = React.useState([
    {
      sku: "MED-TEL-40",
      itemName: "Telmisartan 40mg",
      batchNumber: "BTH-9988",
      expiryDate: "2027-12-31",
      quantity: 100,
      purchaseRate: 4.5,
      sellingRate: 9.0,
      gstRate: 12,
    },
  ]);

  const [newLine, setNewLine] = React.useState({
    sku: "MED-PCM-500",
    itemName: "Paracetamol 500mg",
    batchNumber: "BTH-7799",
    expiryDate: "2028-06-30",
    quantity: 200,
    purchaseRate: 0.9,
    sellingRate: 2.0,
    gstRate: 12,
  });

  const handleAddLine = () => {
    if (!newLine.itemName || newLine.quantity <= 0) return;
    setItems([...items, { ...newLine }]);
    setNewLine({
      sku: `MED-${Date.now().toString().slice(-4)}`,
      itemName: "",
      batchNumber: "",
      expiryDate: "2027-12-31",
      quantity: 50,
      purchaseRate: 5.0,
      sellingRate: 10.0,
      gstRate: 12,
    });
  };

  const handleRemoveLine = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const totalInvoice = items.reduce((sum, item) => {
    const base = item.quantity * item.purchaseRate;
    const tax = (base * item.gstRate) / 100;
    return sum + base + tax;
  }, 0);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (items.length === 0) return;

    const grnNumber = `GRN-2026-000${Math.floor(10 + Math.random() * 90)}`;

    clinicalStore.receiveGrn({
      id: `grn-${Date.now()}`,
      grnNumber,
      supplierName: header.supplierName,
      supplierInvoiceNumber: header.supplierInvoice,
      poNumber: header.poNumber,
      receivedDate: header.receivedDate,
      items: items.map((i) => ({
        ...i,
        totalAmount: i.quantity * i.purchaseRate * (1 + i.gstRate / 100),
      })),
      totalInvoiceAmount: totalInvoice,
      verifiedBy: header.verifiedBy,
    });

    if (onSuccess) onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <PackagePlus className="h-4 w-4 text-[#2563EB]" />
            Goods Received Note (GRN) — Inward Medicine Stock
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => handleEnterNavigation(e)}
          className="space-y-4 py-2"
        >
          {/* Header Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1">Supplier Name *</label>
              <Input
                value={header.supplierName}
                onChange={(e) => setHeader({ ...header, supplierName: e.target.value })}
                className="text-xs h-8 bg-white"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1">Supplier Invoice # *</label>
              <Input
                value={header.supplierInvoice}
                onChange={(e) => setHeader({ ...header, supplierInvoice: e.target.value })}
                className="text-xs h-8 bg-white"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1">PO Reference</label>
              <Input
                value={header.poNumber}
                onChange={(e) => setHeader({ ...header, poNumber: e.target.value })}
                className="text-xs h-8 bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1">Receiving Date</label>
              <Input
                type="date"
                value={header.receivedDate}
                onChange={(e) => setHeader({ ...header, receivedDate: e.target.value })}
                className="text-xs h-8 bg-white"
              />
            </div>
          </div>

          {/* Add Line Item Box */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
            <span className="text-xs font-bold text-slate-700">Add Item Line</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block">Medicine Name</label>
                <Input
                  value={newLine.itemName}
                  onChange={(e) => setNewLine({ ...newLine, itemName: e.target.value })}
                  placeholder="e.g. Paracetamol 500mg"
                  className="text-xs h-7 bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">Batch Number</label>
                <Input
                  value={newLine.batchNumber}
                  onChange={(e) => setNewLine({ ...newLine, batchNumber: e.target.value })}
                  placeholder="e.g. BTH-8899"
                  className="text-xs h-7 bg-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">Expiry Date</label>
                <Input
                  type="date"
                  value={newLine.expiryDate}
                  onChange={(e) => setNewLine({ ...newLine, expiryDate: e.target.value })}
                  className="text-xs h-7 bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">Qty Received</label>
                <Input
                  type="number"
                  value={newLine.quantity || ""}
                  onChange={(e) => setNewLine({ ...newLine, quantity: parseInt(e.target.value, 10) || 0 })}
                  className="text-xs h-7 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-slate-500 block">Purchase Rate (₹)</label>
                <Input
                  type="number"
                  value={newLine.purchaseRate || ""}
                  onChange={(e) => setNewLine({ ...newLine, purchaseRate: parseFloat(e.target.value) || 0 })}
                  className="text-xs h-7 bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">Selling MRP (₹)</label>
                <Input
                  type="number"
                  value={newLine.sellingRate || ""}
                  onChange={(e) => setNewLine({ ...newLine, sellingRate: parseFloat(e.target.value) || 0 })}
                  className="text-xs h-7 bg-white"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={handleAddLine}
                  size="sm"
                  className="w-full h-7 text-xs bg-[#2563EB] hover:bg-blue-700"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add to GRN
                </Button>
              </div>
            </div>
          </div>

          {/* Lines Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Purchase (₹)</TableHead>
                  <TableHead className="text-right">MRP (₹)</TableHead>
                  <TableHead className="w-10 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-semibold text-slate-900 text-xs">{i.itemName}</TableCell>
                    <TableCell className="font-mono text-xs">{i.batchNumber}</TableCell>
                    <TableCell className="text-xs">{i.expiryDate}</TableCell>
                    <TableCell className="text-right font-bold text-xs">{i.quantity}</TableCell>
                    <TableCell className="text-right text-xs">₹{i.purchaseRate}</TableCell>
                    <TableCell className="text-right text-xs">₹{i.sellingRate}</TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs">
            <span className="font-medium text-blue-900">Total Invoice Value (incl. GST):</span>
            <span className="font-bold text-base text-[#2563EB]">{formatCurrencyINR(totalInvoice)}</span>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#2563EB] hover:bg-blue-700">
              Process GRN & Increment Inventory
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
