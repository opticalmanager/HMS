"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Copy, Check, FileText, CheckCircle2 } from "lucide-react";
import { useClinicalStore } from "@/services/clinical-store";
import type { ReportDataResult, ReportFilterOptions } from "@/services/reports.service";

interface ReportsPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportData: ReportDataResult;
  filters: ReportFilterOptions;
  mode?: "print" | "summary";
}

export function ReportsPrintModal({
  open,
  onOpenChange,
  reportData,
  filters,
  mode = "print",
}: ReportsPrintModalProps) {
  const store = useClinicalStore();
  const [copied, setCopied] = React.useState(false);

  const handleCopySummary = () => {
    let summaryText = `========================================\n`;
    summaryText += `${store.settings.hospitalName.toUpperCase()}\n`;
    summaryText += `Address: ${store.settings.address} | Ph: ${store.settings.phone}\n`;
    summaryText += `========================================\n`;
    summaryText += `REPORT: ${reportData.meta.title}\n`;
    summaryText += `Generated: ${new Date().toLocaleString("en-IN")}\n`;
    summaryText += `Period: ${filters.startDate || "2026-11-01"} ${filters.startTime || "00:00"} to ${filters.endDate || "2026-11-30"} ${filters.endTime || "23:59"}\n`;
    summaryText += `Doctor: ${filters.doctorId || "All"} | Department: ${filters.department || "All"} | Mode: ${filters.paymentMode || "All"}\n\n`;

    summaryText += `KEY STATISTICAL METRICS:\n`;
    reportData.summaryCards.forEach((c) => {
      summaryText += `  • ${c.label}: ${c.value}\n`;
    });

    if (reportData.totals) {
      summaryText += `\nGRAND TOTALS:\n`;
      Object.entries(reportData.totals).forEach(([k, v]) => {
        summaryText += `  • ${k.toUpperCase()}: ${v}\n`;
      });
    }

    summaryText += `\nTotal Records: ${reportData.rows.length}\n`;
    summaryText += `========================================\n`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 flex flex-col overflow-hidden print:max-w-none print:w-full print:h-auto print:border-none print:shadow-none print:p-0">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#2563EB]" />
            <DialogTitle className="text-sm font-bold text-slate-900">
              {mode === "summary" ? "Financial Billing Summary Scorecard" : "Official Report Print Preview"}
            </DialogTitle>
          </div>

          <div className="flex items-center gap-2 pr-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="h-8 text-xs gap-1.5 font-semibold text-slate-700"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy Summary
                </>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs gap-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" /> Print / Save PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Viewport */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 print:bg-white print:p-0">
          <div className="max-w-4xl mx-auto bg-white p-6 shadow-sm border border-slate-200 rounded-lg print:border-none print:shadow-none print:p-0 text-slate-800">
            {/* Hospital Letterhead Header */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center">
              <h2 className="text-xl font-black uppercase tracking-wide text-slate-950">
                {store.settings.hospitalName}
              </h2>
              <p className="text-xs text-slate-600">
                {store.settings.address} • Ph: {store.settings.phone} • Email: {store.settings.email}
              </p>
              <div className="mt-2 inline-flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200 text-slate-800">
                  {reportData.meta.title}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Period: {filters.startDate || "01-Nov-2026"} ({filters.startTime || "00:00"}) to {filters.endDate || "30-Nov-2026"} ({filters.endTime || "23:59"})
                </span>
              </div>
            </div>

            {/* Mode: Summary Scorecard */}
            {mode === "summary" ? (
              <div className="space-y-4">
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    Executive Financial Summary Scorecard
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {reportData.summaryCards.map((c) => (
                      <div key={c.label} className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block truncate">
                          {c.label}
                        </span>
                        <span className="text-base font-black text-slate-900 block mt-1">
                          {c.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {reportData.totals && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Grand Column Totals
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(reportData.totals).map(([k, v]) => (
                        <div key={k} className="p-2 bg-white rounded border border-slate-200">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                            {k}
                          </span>
                          <span className="text-sm font-bold text-slate-900 block font-mono">
                            {String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Mode: Full Report Print with All Columns */
              <>
                {/* KPI Summary Block */}
                <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                    Key Performance Indicators
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {reportData.summaryCards.map((c) => (
                      <div key={c.label} className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                          {c.label}
                        </span>
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {c.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Printable Full Table with ALL Columns */}
                <div className="overflow-x-auto max-w-full">
                  <table className="w-full text-[11px] border border-slate-200 border-collapse mb-4">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300">
                        {reportData.meta.columns.map((col) => (
                          <th
                            key={col.key}
                            className={`p-1.5 text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap ${
                              col.align === "right"
                                ? "text-right"
                                : col.align === "center"
                                ? "text-center"
                                : "text-left"
                            }`}
                          >
                            {col.header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportData.rows.slice(0, 40).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          {reportData.meta.columns.map((col) => (
                            <td
                              key={col.key}
                              className={`p-1.5 text-slate-800 whitespace-nowrap text-[11px] ${
                                col.align === "right"
                                ? "text-right font-mono"
                                : col.align === "center"
                                ? "text-center"
                                : "text-left"
                              }`}
                            >
                              {String(row[col.key] ?? "—")}
                            </td>
                          ))}
                        </tr>
                      ))}

                      {/* Grand Total Row in Print View */}
                      {reportData.totals && reportData.rows.length > 0 && (
                        <tr className="bg-slate-100 font-black border-t-2 border-slate-400">
                          {reportData.meta.columns.map((col, idx) => {
                            if (idx === 0) {
                              return (
                                <td key={col.key} className="p-1.5 text-[11px] uppercase">
                                  Grand Total
                                </td>
                              );
                            }
                            const val = reportData.totals?.[col.key];
                            return (
                              <td
                                key={col.key}
                                className={`p-1.5 text-[11px] font-mono ${
                                  col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                                }`}
                              >
                                {val !== undefined ? String(val) : ""}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {reportData.rows.length > 40 && (
                  <p className="text-[10px] text-slate-400 text-center italic mb-4">
                    Showing first 40 records of {reportData.rows.length} total rows. Full dataset is exported via CSV / Excel.
                  </p>
                )}
              </>
            )}

            {/* Verification Signatures */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                <p className="font-semibold text-slate-700">Prepared By:</p>
                <p>Meenakshi Sundaram (Cashier)</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-700">Authorized Signature:</p>
                <p className="mt-4 border-t border-slate-300 pt-1">Medical Director / Admin</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}