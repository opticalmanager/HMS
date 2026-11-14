"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Copy, Check } from "lucide-react";
import { BillingService } from "@/services/billing.service";
import type { Invoice } from "@/types/hms";
import { useClinicalStore } from "@/services/clinical-store";

interface ThermalReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
}

export function ThermalReceiptModal({
  open,
  onOpenChange,
  invoice,
}: ThermalReceiptModalProps) {
  const store = useClinicalStore();
  const [copied, setCopied] = React.useState(false);

  if (!invoice) return null;

  const receiptText = BillingService.generateThermalReceiptText(
    store.settings.hospitalName,
    invoice,
    store.settings.phone
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(receiptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Printer className="h-4 w-4 text-[#2563EB]" />
            80mm ESC/POS Thermal Receipt Preview
          </DialogTitle>
          <div className="flex items-center gap-1.5 pr-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-7 text-xs gap-1"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="h-7 text-xs gap-1 bg-[#2563EB] hover:bg-blue-700"
            >
              <Printer className="h-3 w-3" /> Print
            </Button>
          </div>
        </DialogHeader>

        {/* 80mm Mono POS Viewport */}
        <div className="p-6 bg-slate-100 flex justify-center">
          <div
            id="thermal-receipt-print-area"
            className="w-[300px] bg-white p-4 shadow-sm border border-slate-300 rounded font-mono text-[11px] leading-tight text-slate-900 whitespace-pre"
          >
            {receiptText}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
