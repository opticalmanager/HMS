"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Copy, Check, SlidersHorizontal, ReceiptText } from "lucide-react";
import Link from "next/link";
import { PrintoutEngine, type MockPrintData } from "@/components/print/PrintoutEngine";
import {
  DEFAULT_PRINT_CONFIGS,
  type DefaultPrintConfig,
  type PrintTemplateType,
} from "@/lib/print-defaults";
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
  const [templateType, setTemplateType] = React.useState<PrintTemplateType>("thermal_print");
  const [config, setConfig] = React.useState<DefaultPrintConfig>(
    () => DEFAULT_PRINT_CONFIGS.thermal_print
  );
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`/api/crm/print-settings?templateType=${templateType}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setConfig(json.data);
            return;
          }
        }
      } catch {
        // Fallback
      }
      setConfig(DEFAULT_PRINT_CONFIGS[templateType] || DEFAULT_PRINT_CONFIGS.thermal_print);
    }

    if (open) {
      fetchConfig();
    }
  }, [templateType, open]);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const text = `${store.settings.hospitalName}\nInvoice: ${invoice.invoiceNumber}\nPatient: ${invoice.patientName}\nTotal: Rs ${invoice.grandTotal.toFixed(2)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Date(invoice.createdAt || Date.now()).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const billingItems = (invoice.items || []).map((it, idx) => ({
    srNo: idx + 1,
    description: it.description,
    hsn: "999312",
    qty: it.quantity,
    rate: it.unitPrice,
    discount: (it.unitPrice * (it.discountPercent || 0)) / 100,
    amount: it.amount,
  }));

  const invoiceData: MockPrintData = {
    clinicName: store.settings.hospitalName || "Visual Eyez India: RE-Vision Optometry",
    clinicAddress: store.settings.address || "Plot C-36, Sector 20, Gautam Buddha Nagar, Noida, UP - 201301",
    clinicPhone: store.settings.phone || "+91 98719 00034",
    uhid: invoice.patientId || "APX-2026-0042",
    patientName: invoice.patientName,
    phone: invoice.patientPhone,
    billNo: invoice.invoiceNumber,
    date: formattedDate,
    operatorName: "Cashier Counter 1",
    billingItems: billingItems.length > 0 ? billingItems : undefined,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`p-0 overflow-hidden print:max-w-none print:w-full print:border-none print:shadow-none print:p-0 ${
          templateType === "thermal_print" ? "max-w-md" : "max-w-4xl"
        }`}
      >
        <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-[#2563EB]" />
            <DialogTitle className="text-sm font-bold text-slate-900">
              {templateType === "thermal_print"
                ? "80mm POS Thermal Receipt"
                : "A4 OPD Billing Invoice"}
            </DialogTitle>
          </div>

          <div className="flex items-center gap-2 pr-6">
            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-md text-xs">
              <button
                type="button"
                onClick={() => setTemplateType("thermal_print")}
                className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  templateType === "thermal_print"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Thermal (3")
              </button>
              <button
                type="button"
                onClick={() => setTemplateType("opd_billing")}
                className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  templateType === "opd_billing"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                A4 Tax Bill
              </button>
            </div>

            <Link
              href="/settings/printouts"
              target="_blank"
              className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-slate-200/50 transition-colors"
              title="Customize print layout in Settings"
            >
              <SlidersHorizontal className="h-3 w-3" />
              <span>Layout Settings</span>
            </Link>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 text-xs gap-1 cursor-pointer"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs gap-1 bg-[#2563EB] hover:bg-blue-700 text-white font-medium cursor-pointer shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
          </div>
        </DialogHeader>

        {/* Viewport */}
        <div className="p-6 bg-slate-100 flex justify-center max-h-[82vh] overflow-y-auto print:p-0 print:bg-white print:max-h-none">
          <PrintoutEngine
            templateType={templateType}
            config={config}
            data={invoiceData}
            zoom={templateType === "thermal_print" ? 1 : 0.9}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
