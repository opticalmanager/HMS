"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, X, SlidersHorizontal, ExternalLink } from "lucide-react";
import Link from "next/link";
import { PrintoutEngine, type MockPrintData } from "./PrintoutEngine";
import {
  DEFAULT_PRINT_CONFIGS,
  type DefaultPrintConfig,
} from "@/services/domain/print-service";
import type { PrintTemplateType } from "@/db/schema/print-settings";

interface UniversalPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateType: PrintTemplateType;
  title?: string;
  data?: Partial<MockPrintData>;
  availableTemplates?: Array<{ id: PrintTemplateType; label: string }>;
}

export function UniversalPrintModal({
  open,
  onOpenChange,
  templateType: initialTemplate,
  title,
  data,
  availableTemplates,
}: UniversalPrintModalProps) {
  const [activeTemplate, setActiveTemplate] = React.useState<PrintTemplateType>(initialTemplate);
  const [config, setConfig] = React.useState<DefaultPrintConfig>(
    () => DEFAULT_PRINT_CONFIGS[initialTemplate] || DEFAULT_PRINT_CONFIGS.opd_treatment
  );

  React.useEffect(() => {
    setActiveTemplate(initialTemplate);
  }, [initialTemplate]);

  React.useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`/api/crm/print-settings?templateType=${activeTemplate}`);
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
      setConfig(DEFAULT_PRINT_CONFIGS[activeTemplate] || DEFAULT_PRINT_CONFIGS.opd_treatment);
    }

    if (open) {
      fetchConfig();
    }
  }, [activeTemplate, open]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[94vh] overflow-hidden p-0 print:p-0 print:border-none print:shadow-none print:max-w-none">
        {/* Header Controls (Hidden during print) */}
        <DialogHeader className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-[#2563EB]" />
            <DialogTitle className="text-sm font-bold text-slate-900">
              {title || config.title || "Clinical Print Document"}
            </DialogTitle>
          </div>

          <div className="flex items-center gap-2 pr-6">
            {availableTemplates && availableTemplates.length > 1 && (
              <div className="flex items-center bg-slate-200/70 p-0.5 rounded-md text-xs">
                {availableTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTemplate(t.id)}
                    className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                      activeTemplate === t.id
                        ? "bg-white text-blue-700 font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            <Link
              href="/settings/printouts"
              target="_blank"
              className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-slate-200/50 transition-colors"
              title="Customize print layout in Settings"
            >
              <SlidersHorizontal className="h-3 w-3" />
              <span>Settings</span>
            </Link>

            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs gap-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-medium cursor-pointer shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Page
            </Button>
          </div>
        </DialogHeader>

        {/* Viewport Canvas */}
        <div className="p-6 bg-slate-100 overflow-y-auto max-h-[84vh] flex justify-center print:p-0 print:bg-white print:max-h-none print:overflow-visible">
          <PrintoutEngine
            templateType={activeTemplate}
            config={config}
            data={data}
            zoom={0.92}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
