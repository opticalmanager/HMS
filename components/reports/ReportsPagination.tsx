"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportsPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function ReportsPagination({
  currentPage,
  totalPages,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
}: ReportsPaginationProps) {
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  // Generate page numbers array (with compact window)
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxButtons = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs select-none">
      {/* Left: Row Counter & Records per page */}
      <div className="flex items-center gap-3 text-slate-600">
        <span>
          Showing <strong className="text-slate-900 font-bold">{startRecord}</strong> to{" "}
          <strong className="text-slate-900 font-bold">{endRecord}</strong> of{" "}
          <strong className="text-slate-900 font-bold">{totalRecords}</strong> records
        </span>

        <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
          <span className="text-[11px] text-slate-500">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-7 px-2 rounded-md border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Right: Page Switcher Buttons */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title="First Page"
          className="h-7 w-7 text-slate-600 border-slate-200 disabled:opacity-40"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>

        {/* Prev Page */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Previous Page"
          className="h-7 w-7 text-slate-600 border-slate-200 disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        {/* Numbered Pills */}
        {getPageNumbers().map((p) => (
          <Button
            key={p}
            type="button"
            variant={p === currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(p)}
            className={`h-7 min-w-[28px] px-2 text-xs font-bold transition-all ${
              p === currentPage
                ? "bg-[#2563EB] hover:bg-blue-700 text-white"
                : "text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            {p}
          </Button>
        ))}

        {/* Next Page */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || totalPages === 0}
          title="Next Page"
          className="h-7 w-7 text-slate-600 border-slate-200 disabled:opacity-40"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        {/* Last Page */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages || totalPages === 0}
          title="Last Page"
          className="h-7 w-7 text-slate-600 border-slate-200 disabled:opacity-40"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
