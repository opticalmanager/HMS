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
import { clinicalStore } from "@/services/clinical-store";
import type { InventoryItem } from "@/types/hms";
import { AlertTriangle, SlidersHorizontal } from "lucide-react";

interface StockAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem: InventoryItem | null;
  onSuccess?: () => void;
}

export function StockAdjustmentModal({
  open,
  onOpenChange,
  selectedItem,
  onSuccess,
}: StockAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = React.useState<"deduct" | "add">("deduct");
  const [quantity, setQuantity] = React.useState<number>(10);
  const [reason, setReason] = React.useState<string>("Expired batch write-off");

  if (!selectedItem) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (quantity <= 0) return;

    const delta = adjustmentType === "deduct" ? -quantity : quantity;
    clinicalStore.adjustStock(selectedItem.sku, selectedItem.batchNumber, delta, reason);

    if (onSuccess) onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <SlidersHorizontal className="h-4 w-4 text-[#2563EB]" />
            Stock Adjustment — {selectedItem.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <div><span className="text-slate-500">SKU:</span> <span className="font-mono font-bold">{selectedItem.sku}</span></div>
            <div><span className="text-slate-500">Batch:</span> <span className="font-mono font-bold">{selectedItem.batchNumber}</span></div>
            <div><span className="text-slate-500">Current Stock:</span> <span className="font-bold text-slate-900">{selectedItem.quantityInStock} Units</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Adjustment Action</label>
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value as any)}
                className="w-full h-8 rounded border border-slate-200 bg-white px-2 text-xs font-medium"
              >
                <option value="deduct">Deduct Stock (-)</option>
                <option value="add">Add Stock (+)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Quantity Units</label>
              <Input
                type="number"
                value={quantity || ""}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                className="h-8 text-xs font-bold"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Adjustment Reason *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-8 rounded border border-slate-200 bg-white px-2 text-xs"
            >
              <option value="Expired batch write-off">Expired batch write-off</option>
              <option value="Physical audit count discrepancy">Physical audit count discrepancy</option>
              <option value="Damaged in transit / broken vials">Damaged in transit / broken vials</option>
              <option value="Supplier sample allocation">Supplier sample allocation</option>
            </select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#2563EB] hover:bg-blue-700">
              Apply Stock Correction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
