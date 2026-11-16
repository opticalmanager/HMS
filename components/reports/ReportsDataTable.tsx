"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReportColumn } from "@/services/reports.service";

interface ReportsDataTableProps {
  columns: ReportColumn[];
  rows: Array<Record<string, any>>;
  totals?: Record<string, string | number>;
  emptyMessage?: string;
}

export function ReportsDataTable({
  columns,
  rows,
  totals,
  emptyMessage = "No records found matching current criteria.",
}: ReportsDataTableProps) {
  // Compute sticky column metrics dynamically based on contiguous sticky columns from the left
  const stickyMap = React.useMemo(() => {
    const map = new Map<
      number,
      { left: number; width: number; isSticky: boolean; isLastSticky: boolean }
    >();
    let currentLeft = 0;
    const stickyIndices: number[] = [];

    // Sticky candidate keys from task requirements: No., UHID, Patient Name, Bill #
    const candidateKeys = [
      "no",
      "uhid",
      "patientname",
      "patient",
      "name",
      "billno",
      "invoicenumber",
      "receiptno",
      "voucher",
      "token",
      "id",
    ];

    for (let idx = 0; idx < columns.length; idx++) {
      const col = columns[idx];
      const keyLower = col.key.toLowerCase();
      const shouldStick =
        (col.sticky || candidateKeys.includes(keyLower)) &&
        stickyIndices.length < 4 &&
        (idx === 0 || stickyIndices.includes(idx - 1));

      if (shouldStick) {
        stickyIndices.push(idx);
        let colWidth = 130;
        if (keyLower === "no") colWidth = 48;
        else if (keyLower === "uhid") colWidth = 115;
        else if (["patientname", "patient", "name"].includes(keyLower)) colWidth = 150;
        else if (["billno", "invoicenumber", "receiptno", "voucher"].includes(keyLower)) colWidth = 130;

        map.set(idx, {
          left: currentLeft,
          width: colWidth,
          isSticky: true,
          isLastSticky: false,
        });
        currentLeft += colWidth;
      } else {
        break; // sticky columns must be contiguous from left edge
      }
    }

    if (stickyIndices.length > 0) {
      const last = stickyIndices[stickyIndices.length - 1];
      const lastInfo = map.get(last);
      if (lastInfo) lastInfo.isLastSticky = true;
    }

    return map;
  }, [columns]);

  const renderStatusBadge = (val: string) => {
    const upper = String(val).toUpperCase();
    if (
      upper === "PAID" ||
      upper === "COMPLETED" ||
      upper === "VERIFIED" ||
      upper === "LINKED" ||
      upper === "OPTIMAL" ||
      upper === "SUCCESS" ||
      upper === "STRONG" ||
      upper === "HEALTHY"
    ) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f5e9] text-[#2e7d32] border border-[#c8e6c9]">
          {upper}
        </span>
      );
    }
    if (
      upper === "DUE" ||
      upper === "UNPAID" ||
      upper === "PENDING" ||
      upper.includes("CRITICAL") ||
      upper === "FAILED"
    ) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ffebee] text-[#c2185b] border border-[#ffcdd2]">
          {upper}
        </span>
      );
    }
    if (
      upper === "PARTIAL" ||
      upper === "PARTIALLY_PAID" ||
      upper.includes("WARNING") ||
      upper.includes("ATTENTION")
    ) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          {upper}
        </span>
      );
    }
    if (upper === "CANCELLED" || upper === "REFUNDED" || upper === "OMITTED") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
          {upper}
        </span>
      );
    }
    return <span className="font-medium text-slate-800">{String(val)}</span>;
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
      <div className="overflow-x-auto max-h-[580px] scrollbar-thin">
        <Table className="w-full text-xs border-collapse">
          {/* Sticky Table Header */}
          <TableHeader className="sticky top-0 z-30 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 shadow-xs">
            <TableRow className="hover:bg-transparent">
              {columns.map((col, idx) => {
                const sticky = stickyMap.get(idx);
                const isSticky = Boolean(sticky?.isSticky);
                const stickyStyle = isSticky
                  ? { left: `${sticky!.left}px`, minWidth: `${sticky!.width}px` }
                  : undefined;
                const stickyClass = isSticky
                  ? `sticky z-30 bg-slate-100/95 ${
                      sticky!.isLastSticky
                        ? "shadow-[2px_0_5px_-1px_rgba(0,0,0,0.12)] border-r border-slate-300"
                        : "border-r border-slate-200"
                    }`
                  : "";

                return (
                  <TableHead
                    key={col.key}
                    style={stickyStyle}
                    className={`h-9 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-700 select-none whitespace-nowrap ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left"
                    } ${stickyClass}`}
                  >
                    {col.header}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-12 text-xs text-slate-400 font-medium"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, rowIdx) => (
                <TableRow
                  key={rowIdx}
                  className="hover:bg-blue-50/40 transition-colors group"
                >
                  {columns.map((col, colIdx) => {
                    const sticky = stickyMap.get(colIdx);
                    const isSticky = Boolean(sticky?.isSticky);
                    const stickyStyle = isSticky
                      ? { left: `${sticky!.left}px`, minWidth: `${sticky!.width}px` }
                      : undefined;
                    const stickyClass = isSticky
                      ? `sticky z-10 bg-white group-hover:bg-blue-50/90 ${
                          sticky!.isLastSticky
                            ? "shadow-[2px_0_5px_-1px_rgba(0,0,0,0.12)] border-r border-slate-200"
                            : "border-r border-slate-100"
                        }`
                      : "";

                    const rawVal = row[col.key];
                    const isStatusColumn =
                      col.key.toLowerCase().includes("status") ||
                      col.key.toLowerCase().includes("sla") ||
                      col.key.toLowerCase().includes("risk");

                    return (
                      <TableCell
                        key={col.key}
                        style={stickyStyle}
                        className={`py-2 px-3 whitespace-nowrap text-[12px] text-slate-700 font-normal ${
                          col.align === "right"
                            ? "text-right font-mono"
                            : col.align === "center"
                            ? "text-center"
                            : "text-left"
                        } ${stickyClass}`}
                      >
                        {rawVal === undefined || rawVal === null
                          ? "—"
                          : isStatusColumn
                          ? renderStatusBadge(String(rawVal))
                          : String(rawVal)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}

            {/* Grand Total Row at Bottom */}
            {totals && rows.length > 0 && (
              <TableRow className="bg-slate-100/95 font-bold border-t-2 border-slate-300">
                {columns.map((col, colIdx) => {
                  const sticky = stickyMap.get(colIdx);
                  const isSticky = Boolean(sticky?.isSticky);
                  const stickyStyle = isSticky
                    ? { left: `${sticky!.left}px`, minWidth: `${sticky!.width}px` }
                    : undefined;
                  const stickyClass = isSticky
                    ? `sticky z-20 bg-slate-100 ${
                        sticky!.isLastSticky
                          ? "shadow-[2px_0_5px_-1px_rgba(0,0,0,0.12)] border-r border-slate-300"
                          : "border-r border-slate-200"
                      }`
                    : "";

                  if (colIdx === 0) {
                    return (
                      <TableCell
                        key={col.key}
                        style={stickyStyle}
                        className={`py-2.5 px-3 text-xs font-black uppercase text-slate-900 ${stickyClass}`}
                      >
                        Grand Total
                      </TableCell>
                    );
                  }

                  const totalVal = totals[col.key];

                  return (
                    <TableCell
                      key={col.key}
                      style={stickyStyle}
                      className={`py-2.5 px-3 text-xs font-black text-slate-900 ${
                        col.align === "right"
                          ? "text-right font-mono"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left"
                      } ${stickyClass}`}
                    >
                      {totalVal !== undefined ? String(totalVal) : ""}
                    </TableCell>
                  );
                })}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}