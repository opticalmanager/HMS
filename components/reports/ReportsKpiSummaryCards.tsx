"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { SummaryCardItem } from "@/services/reports.service";

interface ReportsKpiSummaryCardsProps {
  cards: SummaryCardItem[];
  selectedCardLabel?: string;
  onSelectCard?: (label: string) => void;
}

export function ReportsKpiSummaryCards({
  cards,
  selectedCardLabel,
  onSelectCard,
}: ReportsKpiSummaryCardsProps) {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {cards.map((card) => {
        const isSelected = selectedCardLabel === card.label;

        // Custom Healthray Enterprise Styling for Paid and Due cards
        let containerStyle = "bg-white border-slate-200 text-slate-900";
        let labelStyle = "text-slate-500";
        let valueStyle = "text-slate-900";

        if (card.variant === "paid" || card.label.toLowerCase().includes("paid")) {
          containerStyle = "bg-[#e8f5e9] border-[#c8e6c9] shadow-xs";
          labelStyle = "text-[#2e7d32] font-bold";
          valueStyle = "text-[#1b5e20] font-black";
        } else if (
          card.variant === "due" ||
          card.label.toLowerCase().includes("due") ||
          card.label.toLowerCase().includes("outstanding")
        ) {
          containerStyle = "bg-[#ffebee] border-[#ffcdd2] shadow-xs";
          labelStyle = "text-[#c2185b] font-bold";
          valueStyle = "text-[#b71c1c] font-black";
        } else if (card.variant === "formula") {
          containerStyle =
            "col-span-2 sm:col-span-3 lg:col-span-3 bg-blue-50/90 border-blue-200 shadow-xs";
          labelStyle = "text-blue-700 font-bold";
          valueStyle = "text-blue-950 font-black text-lg";
        } else if (card.variant === "warning") {
          containerStyle = "bg-amber-50 border-amber-200 shadow-xs";
          labelStyle = "text-amber-700 font-bold";
          valueStyle = "text-amber-900 font-black";
        }

        return (
          <Card
            key={card.label}
            onClick={() => onSelectCard?.(card.label)}
            className={`border transition-all duration-150 rounded-xl cursor-pointer hover:shadow-md hover:scale-[1.01] ${containerStyle} ${
              isSelected ? "ring-2 ring-[#2563EB] border-[#2563EB]" : ""
            }`}
          >
            <CardContent className="p-3.5 flex flex-col justify-between h-full">
              <span className={`text-[11px] uppercase tracking-wider line-clamp-1 ${labelStyle}`}>
                {card.label}
              </span>
              <div className={`text-xl font-bold mt-1 tracking-tight truncate ${valueStyle}`}>
                {card.value}
              </div>
              {card.hint && (
                <span className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {card.hint}
                </span>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
