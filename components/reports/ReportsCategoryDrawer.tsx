"use client";

import * as React from "react";
import {
  Receipt,
  Coins,
  PieChart,
  Share2,
  Users,
  Pill,
  Stethoscope,
  CreditCard,
  SlidersHorizontal,
  Timer,
  RotateCcw,
  Landmark,
  Clock,
  History,
  ShieldAlert,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Search,
  FileSpreadsheet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HEALTHRAY_REPORT_CATEGORIES,
  type HealthrayCategory,
} from "@/services/reports.service";

interface ReportsCategoryDrawerProps {
  activeCategoryId: string;
  onSelectCategory: (category: HealthrayCategory) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function ReportsCategoryDrawer({
  activeCategoryId,
  onSelectCategory,
  collapsed,
  onToggleCollapse,
}: ReportsCategoryDrawerProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredCategories = React.useMemo(() => {
    if (!searchQuery.trim()) return HEALTHRAY_REPORT_CATEGORIES;
    const clean = searchQuery.toLowerCase().trim();
    return HEALTHRAY_REPORT_CATEGORIES.filter(
      (cat) =>
        cat.title.toLowerCase().includes(clean) ||
        cat.subTabs.some((tab) => tab.title.toLowerCase().includes(clean))
    );
  }, [searchQuery]);

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case "Receipt":
        return <Receipt className="h-4 w-4 shrink-0" />;
      case "Coins":
        return <Coins className="h-4 w-4 shrink-0" />;
      case "PieChart":
        return <PieChart className="h-4 w-4 shrink-0" />;
      case "Share2":
        return <Share2 className="h-4 w-4 shrink-0" />;
      case "Users":
        return <Users className="h-4 w-4 shrink-0" />;
      case "Pill":
        return <Pill className="h-4 w-4 shrink-0" />;
      case "Stethoscope":
        return <Stethoscope className="h-4 w-4 shrink-0" />;
      case "CreditCard":
        return <CreditCard className="h-4 w-4 shrink-0" />;
      case "SlidersHorizontal":
        return <SlidersHorizontal className="h-4 w-4 shrink-0" />;
      case "Timer":
        return <Timer className="h-4 w-4 shrink-0" />;
      case "RotateCcw":
        return <RotateCcw className="h-4 w-4 shrink-0" />;
      case "Landmark":
        return <Landmark className="h-4 w-4 shrink-0" />;
      case "Clock":
        return <Clock className="h-4 w-4 shrink-0" />;
      case "History":
        return <History className="h-4 w-4 shrink-0" />;
      case "ShieldAlert":
        return <ShieldAlert className="h-4 w-4 shrink-0" />;
      case "ShieldCheck":
        return <ShieldCheck className="h-4 w-4 shrink-0" />;
      default:
        return <FileSpreadsheet className="h-4 w-4 shrink-0" />;
    }
  };

  if (collapsed) {
    return (
      <aside className="w-12 shrink-0 bg-white border-r border-slate-200 flex flex-col items-center py-3 select-none transition-all duration-200 rounded-xl shadow-xs">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          title="Expand Reports Drawer"
          className="h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100 mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <div className="flex-1 w-full space-y-1 overflow-y-auto px-1 scrollbar-none">
          {HEALTHRAY_REPORT_CATEGORIES.map((cat) => {
            const isActive = activeCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat)}
                title={`${cat.number}. ${cat.title} (${cat.subTabs.length} sub-reports)`}
                className={`w-full h-8 flex items-center justify-center rounded-lg transition-colors ${
                  isActive
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {getCategoryIcon(cat.icon)}
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-56 shrink-0 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-xs select-none transition-all duration-200">
      {/* Drawer Header & Collapse Toggle */}
      <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            Reports (16)
          </span>
          <Badge
            variant="outline"
            className="text-[10px] font-mono px-1.5 py-0 h-4 bg-white text-slate-500 border-slate-200"
          >
            {filteredCategories.length}
          </Badge>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          title="Collapse Reports Drawer (<)"
          className="h-6 w-6 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Real-time Category Search Input */}
      <div className="p-2 border-b border-slate-100 bg-white">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Reports..."
            className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Scrollable Categories List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-50 py-1 max-h-[calc(100vh-220px)] scrollbar-thin">
        {filteredCategories.map((cat) => {
          const isActive = activeCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`w-full px-2.5 py-2 text-left text-xs transition-colors flex items-center justify-between gap-2 border-l-2 ${
                isActive
                  ? "bg-blue-50/90 text-[#2563EB] font-semibold border-l-[#2563EB]"
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-l-transparent"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={isActive ? "text-[#2563EB]" : "text-slate-400"}>
                  {getCategoryIcon(cat.icon)}
                </span>
                <span className="truncate text-[12px] leading-tight">
                  {cat.title}
                </span>
              </div>
              <Badge
                variant="outline"
                className={`text-[9px] px-1 py-0 h-4 border-none font-mono ${
                  isActive
                    ? "bg-[#2563EB] text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {cat.subTabs.length}
              </Badge>
            </button>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="p-4 text-center text-xs text-slate-400">
            No matching reports found
          </div>
        )}
      </div>
    </aside>
  );
}
