"use client";

import * as React from "react";
import {
  FileSpreadsheet,
  Download,
  Printer,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClinicalStore } from "@/services/clinical-store";
import {
  ReportsService,
  HEALTHRAY_REPORT_CATEGORIES,
  type HealthrayCategory,
  type ReportFilterOptions,
  type ReportDataResult,
} from "@/services/reports.service";
import { ReportsCategoryDrawer } from "@/components/reports/ReportsCategoryDrawer";
import { ReportsFilterRibbon } from "@/components/reports/ReportsFilterRibbon";
import { ReportsKpiSummaryCards } from "@/components/reports/ReportsKpiSummaryCards";
import { ReportsDataTable } from "@/components/reports/ReportsDataTable";
import { ReportsPagination } from "@/components/reports/ReportsPagination";
import { ReportsPrintModal } from "@/components/reports/ReportsPrintModal";
import { exportToCsv } from "@/utils/csv-export";

export default function ReportsPage() {
  const store = useClinicalStore();

  // Active Category & Sub-tab State
  const [activeCategory, setActiveCategory] = React.useState<HealthrayCategory>(
    HEALTHRAY_REPORT_CATEGORIES[0]
  );
  const [activeSubTabId, setActiveSubTabId] = React.useState<string>(
    HEALTHRAY_REPORT_CATEGORIES[0].subTabs[0].id
  );
  const [drawerCollapsed, setDrawerCollapsed] = React.useState<boolean>(false);

  // Multi-Field Filter State
  const [filters, setFilters] = React.useState<ReportFilterOptions>({
    duration: "month",
    startDate: "2026-11-01",
    endDate: "2026-11-30",
    startTime: "00:00",
    endTime: "23:59",
    doctorId: "all",
    department: "all",
    paymentMode: "all",
    searchQuery: "",
    encounterType: "all",
    dueOnly: false,
    cancelled: false,
    settled: false,
  });

  // Applied Filter State (triggers re-computation on "Apply")
  const [appliedFilters, setAppliedFilters] = React.useState<ReportFilterOptions>(filters);

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);

  // Print & Summary Modal State
  const [printModalOpen, setPrintModalOpen] = React.useState<boolean>(false);
  const [printModalMode, setPrintModalMode] = React.useState<"print" | "summary">("print");
  const [selectedCardLabel, setSelectedCardLabel] = React.useState<string | undefined>();

  // Switch category and select first sub-tab
  const handleSelectCategory = (cat: HealthrayCategory) => {
    setActiveCategory(cat);
    setActiveSubTabId(cat.subTabs[0].id);
    setCurrentPage(1);
    setSelectedCardLabel(undefined);
  };

  // Switch sub-tab
  const handleSelectSubTab = (subTabId: string) => {
    setActiveSubTabId(subTabId);
    setCurrentPage(1);
    setSelectedCardLabel(undefined);
  };

  // Generate Report Data
  const reportData: ReportDataResult = React.useMemo(() => {
    return ReportsService.generateReport(activeSubTabId, store, appliedFilters);
  }, [activeSubTabId, store, appliedFilters]);

  // Apply Filter Action
  const handleApplyFilter = () => {
    setAppliedFilters({ ...filters });
    setCurrentPage(1);
  };

  // Reset Filter Action
  const handleResetFilter = () => {
    const defaultFilters: ReportFilterOptions = {
      duration: "month",
      startDate: "2026-11-01",
      endDate: "2026-11-30",
      startTime: "00:00",
      endTime: "23:59",
      doctorId: "all",
      department: "all",
      paymentMode: "all",
      searchQuery: "",
      encounterType: "all",
      dueOnly: false,
      cancelled: false,
      settled: false,
    };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setCurrentPage(1);
    setSelectedCardLabel(undefined);
  };

  // Interactive KPI Card Filter Toggle
  const handleSelectCard = (label: string) => {
    if (selectedCardLabel === label) {
      // Clear quick filter on second click
      setSelectedCardLabel(undefined);
      const updated = { ...filters, dueOnly: false, settled: false };
      setFilters(updated);
      setAppliedFilters(updated);
    } else {
      setSelectedCardLabel(label);
      const upper = label.toUpperCase();
      if (upper.includes("DUE") || upper.includes("OUTSTANDING")) {
        const updated = { ...filters, dueOnly: true, settled: false };
        setFilters(updated);
        setAppliedFilters(updated);
      } else if (upper.includes("PAID") || upper.includes("SETTLED")) {
        const updated = { ...filters, dueOnly: false, settled: true };
        setFilters(updated);
        setAppliedFilters(updated);
      }
    }
    setCurrentPage(1);
  };

  // CSV Export Action
  const handleExportCsv = () => {
    const filename = `${activeCategory.id}_${activeSubTabId}`;
    const columns = reportData.meta.columns.map((c) => ({
      header: c.header,
      accessor: c.key,
    }));
    exportToCsv(filename, columns, reportData.rows);
  };

  // Print Preview
  const handleOpenPrintPreview = () => {
    setPrintModalMode("print");
    setPrintModalOpen(true);
  };

  // Billing Summary Modal
  const handleOpenBillingSummary = () => {
    setPrintModalMode("summary");
    setPrintModalOpen(true);
  };

  // Paginated Rows
  const totalRecords = reportData.rows.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedRows = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return reportData.rows.slice(start, start + pageSize);
  }, [reportData.rows, currentPage, pageSize]);

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto">
      {/* Top Breadcrumb & Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-0.5">
            <span>Reports</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-700 font-semibold">{activeCategory.title}</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-[#2563EB] font-bold">
              {activeCategory.subTabs.find((t) => t.id === activeSubTabId)?.title || "Report"}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            {reportData.meta.title}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {reportData.meta.description}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenPrintPreview}
            className="h-8 text-xs font-semibold gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            Print Report
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 text-xs font-semibold gap-1.5 bg-[#2563EB] hover:bg-blue-700 text-white shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Export (.CSV / Excel)
          </Button>
        </div>
      </div>

      {/* Main Layout: Left Category Drawer + Right Data Canvas */}
      <div className="flex gap-4 items-start">
        {/* Left Collapsible Category Drawer */}
        <ReportsCategoryDrawer
          activeCategoryId={activeCategory.id}
          onSelectCategory={handleSelectCategory}
          collapsed={drawerCollapsed}
          onToggleCollapse={() => setDrawerCollapsed((v) => !v)}
        />

        {/* Right Main Content Canvas */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* 1. Horizontal Sub-Tabs Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs overflow-x-auto scrollbar-none flex items-center gap-1">
            {activeCategory.subTabs.map((tab) => {
              const isSelected = activeSubTabId === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectSubTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  {tab.title}
                </button>
              );
            })}
          </div>

          {/* 2. Multi-Field Filter Ribbon */}
          <ReportsFilterRibbon
            filters={filters}
            onFilterChange={setFilters}
            onApply={handleApplyFilter}
            onReset={handleResetFilter}
            onExportCsv={handleExportCsv}
            onPrintPreview={handleOpenPrintPreview}
            onOpenBillingSummary={handleOpenBillingSummary}
          />

          {/* 3. Top KPI Statistical Summary Cards */}
          <ReportsKpiSummaryCards
            cards={reportData.summaryCards}
            selectedCardLabel={selectedCardLabel}
            onSelectCard={handleSelectCard}
          />

          {/* 4. Enterprise High-Density Data Table */}
          <ReportsDataTable
            columns={reportData.meta.columns}
            rows={paginatedRows}
            totals={reportData.totals}
            emptyMessage="No records found matching current duration and filter criteria."
          />

          {/* 5. Bottom Summary & Pagination Bar */}
          <ReportsPagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalRecords={totalRecords}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Print Preview & Billing Summary Modal */}
      <ReportsPrintModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        reportData={reportData}
        filters={appliedFilters}
        mode={printModalMode}
      />
    </div>
  );
}
