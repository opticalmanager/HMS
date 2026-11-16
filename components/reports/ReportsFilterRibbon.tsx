"use client";

import * as React from "react";
import {
  Filter,
  RotateCcw,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Search,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useClinicalStore } from "@/services/clinical-store";
import type { ReportFilterOptions } from "@/services/reports.service";

interface ReportsFilterRibbonProps {
  filters: ReportFilterOptions;
  onFilterChange: (filters: ReportFilterOptions) => void;
  onApply: () => void;
  onReset: () => void;
  onExportCsv: () => void;
  onPrintPreview: () => void;
  onOpenBillingSummary: () => void;
}

export function ReportsFilterRibbon({
  filters,
  onFilterChange,
  onApply,
  onReset,
  onExportCsv,
  onPrintPreview,
  onOpenBillingSummary,
}: ReportsFilterRibbonProps) {
  const store = useClinicalStore();
  const [downloadMenuOpen, setDownloadMenuOpen] = React.useState(false);
  const downloadMenuRef = React.useRef<HTMLDivElement>(null);

  // Close download menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setDownloadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const doctors = React.useMemo(() => {
    return store.staff.filter(
      (s) =>
        s.role.includes("doctor") ||
        s.role.includes("consultant") ||
        s.role.includes("specialist")
    );
  }, [store.staff]);

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as ReportFilterOptions["duration"];
    let start = filters.startDate || "2026-11-01";
    let end = filters.endDate || "2026-11-30";

    if (val === "today") {
      start = "2026-11-14";
      end = "2026-11-14";
    } else if (val === "yesterday") {
      start = "2026-11-13";
      end = "2026-11-13";
    } else if (val === "last7") {
      start = "2026-11-08";
      end = "2026-11-14";
    } else if (val === "last30") {
      start = "2026-10-15";
      end = "2026-11-14";
    } else if (val === "month") {
      start = "2026-11-01";
      end = "2026-11-30";
    }

    onFilterChange({
      ...filters,
      duration: val,
      startDate: start,
      endDate: end,
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-3">
      {/* Top Filter Fields Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 items-end">
        {/* 1. Duration */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Duration
          </label>
          <select
            value={filters.duration || "month"}
            onChange={handleDurationChange}
            className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="month">This Month</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        {/* 2. Start Date */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Start Date
          </label>
          <Input
            type="date"
            value={filters.startDate || "2026-11-01"}
            onChange={(e) =>
              onFilterChange({ ...filters, startDate: e.target.value, duration: "custom" })
            }
            className="h-8 text-xs bg-slate-50/70 focus:bg-white px-2"
          />
        </div>

        {/* 3. Start Time */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Start Time
          </label>
          <Input
            type="time"
            value={filters.startTime || "00:00"}
            onChange={(e) =>
              onFilterChange({ ...filters, startTime: e.target.value, duration: "custom" })
            }
            className="h-8 text-xs bg-slate-50/70 focus:bg-white px-2"
          />
        </div>

        {/* 4. End Date */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            End Date
          </label>
          <Input
            type="date"
            value={filters.endDate || "2026-11-30"}
            onChange={(e) =>
              onFilterChange({ ...filters, endDate: e.target.value, duration: "custom" })
            }
            className="h-8 text-xs bg-slate-50/70 focus:bg-white px-2"
          />
        </div>

        {/* 5. End Time */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            End Time
          </label>
          <Input
            type="time"
            value={filters.endTime || "23:59"}
            onChange={(e) =>
              onFilterChange({ ...filters, endTime: e.target.value, duration: "custom" })
            }
            className="h-8 text-xs bg-slate-50/70 focus:bg-white px-2"
          />
        </div>

        {/* 6. Doctor Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Doctor
          </label>
          <select
            value={filters.doctorId || "all"}
            onChange={(e) =>
              onFilterChange({ ...filters, doctorId: e.target.value })
            }
            className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Doctors</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))}
          </select>
        </div>

        {/* 7. Department Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Department
          </label>
          <select
            value={filters.department || "all"}
            onChange={(e) =>
              onFilterChange({ ...filters, department: e.target.value })
            }
            className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Departments</option>
            <option value="OPD">OPD</option>
            <option value="Optometry">Optometry</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Radiology">Radiology</option>
            <option value="Pharmacy">Pharmacy</option>
            <option value="General Medicine">General Medicine</option>
          </select>
        </div>

        {/* 8. Payment Mode Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Payment Mode
          </label>
          <select
            value={filters.paymentMode || "all"}
            onChange={(e) =>
              onFilterChange({ ...filters, paymentMode: e.target.value })
            }
            className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Payment Modes</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI / QR</option>
            <option value="card">Card / POS</option>
            <option value="neft">NEFT / RTGS</option>
            <option value="insurance">TPA / Insurance</option>
          </select>
        </div>
      </div>

      {/* Secondary Controls: Search, Radio, Checkboxes, Action Buttons */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Text search & Encounter Radio */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Patient / UHID / Bill # */}
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={filters.searchQuery || ""}
              onChange={(e) =>
                onFilterChange({ ...filters, searchQuery: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") onApply();
              }}
              placeholder="Search Patient, UHID, or Bill No..."
              className="pl-8 h-8 text-xs bg-slate-50/70 focus:bg-white placeholder:text-slate-400"
            />
          </div>

          {/* Radio Group: All | OPD | IPD */}
          <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
            {(["all", "opd", "ipd"] as const).map((enc) => (
              <button
                key={enc}
                type="button"
                onClick={() => onFilterChange({ ...filters, encounterType: enc })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-all ${
                  (filters.encounterType || "all") === enc
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {enc}
              </button>
            ))}
          </div>

          {/* Checkboxes: Due Only, Cancelled, Settled */}
          <div className="flex items-center gap-3 text-xs font-medium text-slate-700">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(filters.dueOnly)}
                onChange={(e) =>
                  onFilterChange({ ...filters, dueOnly: e.target.checked })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
              />
              <span className="text-[12px]">Due Only</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(filters.cancelled)}
                onChange={(e) =>
                  onFilterChange({ ...filters, cancelled: e.target.checked })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
              />
              <span className="text-[12px]">Cancelled</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(filters.settled)}
                onChange={(e) =>
                  onFilterChange({ ...filters, settled: e.target.checked })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
              />
              <span className="text-[12px]">Settled</span>
            </label>
          </div>
        </div>

        {/* Right Side: Apply, Reset, Download Menu */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={onApply}
            className="h-8 px-3 text-xs font-semibold bg-[#2563EB] hover:bg-blue-700 text-white gap-1.5 shadow-xs"
          >
            <Filter className="h-3.5 w-3.5" /> Apply Filter
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            className="h-8 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50 gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>

          {/* Download Menu Dropdown */}
          <div className="relative" ref={downloadMenuRef}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDownloadMenuOpen((v) => !v)}
              className="h-8 px-3 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 gap-1.5 shadow-xs"
            >
              <Download className="h-3.5 w-3.5 text-blue-600" />
              Download
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </Button>

            {downloadMenuOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 text-xs animate-in fade-in-50 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setDownloadMenuOpen(false);
                    onExportCsv();
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <div>
                    <span className="font-semibold block">Download Excel (.csv / .xlsx)</span>
                    <span className="text-[10px] text-slate-400">Excel UTF-8 compatible format</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDownloadMenuOpen(false);
                    onPrintPreview();
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <Printer className="h-4 w-4 text-blue-600" />
                  <div>
                    <span className="font-semibold block">Download PDF / Print</span>
                    <span className="text-[10px] text-slate-400">Clean print chrome & A4 letterhead</span>
                  </div>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => {
                    setDownloadMenuOpen(false);
                    onOpenBillingSummary();
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <FileText className="h-4 w-4 text-amber-600" />
                  <div>
                    <span className="font-semibold block">Billing Summary</span>
                    <span className="text-[10px] text-slate-400">Financial executive scorecard</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
