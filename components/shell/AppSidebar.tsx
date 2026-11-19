"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Stethoscope,
  BedDouble,
  Tv,
  ReceiptText,
  Pill,
  BarChart3,
  MessageSquare,
  ShieldAlert,
  Settings,
  Users2,
  Activity,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Appointments", href: "/appointments", icon: CalendarDays },
  { label: "OPD Clinical", href: "/opd", icon: Stethoscope },
  { label: "IPD Wards & Beds", href: "/ipd", icon: BedDouble },
  { label: "Token Queue TV", href: "/token-board", icon: Tv },
  { label: "Billing & Invoicing", href: "/billing", icon: ReceiptText },
  { label: "Pharmacy Stock", href: "/inventory", icon: Pill },
  { label: "Reports & Analytics", href: "/reports", icon: BarChart3 },
  { label: "WhatsApp Alerts", href: "/whatsapp", icon: MessageSquare },
  { label: "Staff & Doctors", href: "/staff", icon: Users2 },
  { label: "Audit Logs", href: "/audit-logs", icon: ShieldAlert },
  { label: "System Settings", href: "/settings", icon: Settings },
];

interface AppSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AppSidebar({ collapsed = false, onToggleCollapse }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "border-r border-slate-200 bg-white flex flex-col shrink-0 min-h-screen transition-all duration-200 print:hidden select-none",
        collapsed ? "w-16" : "w-64"
      )}
      data-sidebar
    >
      <div
        className={cn(
          "h-14 flex items-center border-b border-slate-200 px-3",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <div className="h-8 w-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-xs shrink-0">
            <Activity className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-bold text-slate-900 leading-none block text-sm">Apex HMS</span>
              <span className="text-[10px] font-medium text-slate-500 block mt-0.5 truncate">
                Clinical Monolith
              </span>
            </div>
          )}
        </Link>
        {onToggleCollapse && !collapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Minimize navigation panel (Ctrl+B)"
            aria-label="Minimize navigation panel"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {collapsed && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="w-full mb-2 py-1.5 flex items-center justify-center rounded-md text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
            title="Maximize navigation panel (Ctrl+B)"
            aria-label="Maximize navigation panel"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-md text-xs font-medium transition-colors cursor-pointer",
                collapsed ? "justify-center p-2.5" : "gap-2.5 px-2.5 py-1.5",
                isActive
                  ? "bg-[#2563EB] text-white shadow-xs font-semibold"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-slate-500")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
        {collapsed ? (
          <button
            onClick={onToggleCollapse}
            className="w-full py-1.5 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded transition-colors cursor-pointer"
            title="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <div className="w-full flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>ABDM FHIR R4</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
              M1 & M2 Active
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
