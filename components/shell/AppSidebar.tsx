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

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 min-h-screen">
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-200">
        <div className="h-9 w-9 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-xs">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <span className="font-bold text-slate-900 leading-none block text-base">Apex HMS</span>
          <span className="text-[11px] font-medium text-slate-500 block mt-0.5">Clinical EMR Monolith</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Clinical Modules (12)
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#2563EB] text-white shadow-sm font-semibold"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-slate-500")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>ABDM FHIR R4</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
            M1 & M2 Active
          </span>
        </div>
      </div>
    </aside>
  );
}
