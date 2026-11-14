"use client";

import * as React from "react";
import {
  BarChart3,
  Download,
  TrendingUp,
  FileSpreadsheet,
  Filter,
  Calendar,
  Search,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useClinicalStore } from "@/services/clinical-store";
import { ReportsService, REPORTS_CATALOG, type ReportDataResult } from "@/services/reports.service";
import { exportToCsv } from "@/utils/csv-export";

export default function ReportsPage() {
  const store = useClinicalStore();
  const [selectedReportId, setSelectedReportId] = React.useState<string>("rep-doc-share");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [dateRange, setDateRange] = React.useState<string>("mtd"); // Month-to-date

  const reportData: ReportDataResult = React.useMemo(() => {
    return ReportsService.generateReport(selectedReportId, store);
  }, [selectedReportId, store]);

  const filteredCatalog = REPORTS_CATALOG.filter(
    (r) => categoryFilter === "all" || r.category === categoryFilter
  );

  const handleExportCsv = () => {
    const columns = reportData.meta.columns.map((col) => ({
      header: col.header,
      accessor: col.key,
    }));
    exportToCsv(reportData.meta.id, columns, reportData.rows);
  };

  const filteredRows = reportData.rows.filter((row) => {
    if (!searchQuery.trim()) return true;
    const clean = searchQuery.toLowerCase();
    return Object.values(row).some((val) => String(val).toLowerCase().includes(clean));
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinical & Financial Reports (16 Modules)</h1>
          <p className="text-xs text-slate-500">
            Real-time analytics for Doctor payouts, GSTR-1/3B, Bed ALOS, cashier registers, and pharmacy margins
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleExportCsv}
            className="bg-[#2563EB] hover:bg-blue-700 text-xs gap-1.5 font-semibold"
          >
            <Download className="h-3.5 w-3.5" /> Export Report (CSV / Excel)
          </Button>
        </div>
      </div>

      {/* Report Selector Ribbon & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left List of 16 Reports */}
        <div className="space-y-3">
          <Card className="border-slate-200">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                <span>Reports Catalog (16)</span>
                <Badge variant="outline" className="text-[10px] font-mono">{filteredCatalog.length}</Badge>
              </CardTitle>

              {/* Category pills */}
              <div className="grid grid-cols-2 gap-1 pt-2">
                {[
                  { id: "all", label: "All" },
                  { id: "financial", label: "Financial" },
                  { id: "clinical", label: "Clinical" },
                  { id: "statutory", label: "Statutory" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryFilter(c.id)}
                    className={`py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                      categoryFilter === c.id
                        ? "bg-[#2563EB] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[580px] overflow-y-auto">
              <div className="divide-y divide-slate-100 text-xs">
                {filteredCatalog.map((rep) => {
                  const isSelected = selectedReportId === rep.id;
                  return (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => setSelectedReportId(rep.id)}
                      className={`w-full p-2.5 text-left transition-colors flex flex-col gap-0.5 ${
                        isSelected
                          ? "bg-blue-50/80 border-l-4 border-l-[#2563EB]"
                          : "hover:bg-slate-50 border-l-4 border-l-transparent"
                      }`}
                    >
                      <span className={`font-semibold text-xs ${isSelected ? "text-[#2563EB]" : "text-slate-900"}`}>
                        {rep.title}
                      </span>
                      <span className="text-[10px] text-slate-500 capitalize">{rep.category}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Active Report Canvas (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Active Report Header Bar */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{reportData.meta.title}</h2>
                <Badge variant="outline" className="capitalize text-[10px] bg-slate-50">
                  {reportData.meta.category}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{reportData.meta.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative max-w-xs">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter table rows..."
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="h-8 px-2 rounded border border-slate-200 bg-slate-50 text-xs font-medium"
              >
                <option value="today">Today</option>
                <option value="wtd">Week to Date</option>
                <option value="mtd">Month to Date</option>
                <option value="ytd">Year to Date (FY 2026-27)</option>
              </select>
            </div>
          </div>

          {/* Report Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {reportData.summaryCards.map((card) => (
              <Card key={card.label} className="border-slate-200">
                <CardContent className="p-3.5">
                  <span className="text-[11px] font-semibold text-slate-500">{card.label}</span>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">{card.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Report High-Density Tabular View */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  {reportData.meta.columns.map((col) => (
                    <TableHead key={col.key}>{col.header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={reportData.meta.columns.length} className="text-center py-8 text-xs text-slate-400">
                      No records found for this report and search filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row, idx) => (
                    <TableRow key={idx}>
                      {reportData.meta.columns.map((col) => (
                        <TableCell key={col.key} className="text-xs">
                          {String(row[col.key] ?? "—")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
