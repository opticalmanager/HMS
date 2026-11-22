"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  BookOpen,
  Users,
  Printer,
  ChevronRight,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SettingsTabItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  badge?: string;
}

export const SETTINGS_TABS: SettingsTabItem[] = [
  {
    id: "clinic",
    label: "Clinic Profile",
    href: "/settings/clinic",
    icon: Building2,
    description: "Timezone, slot durations, WABA ID & webhook secrets",
  },
  {
    id: "schedules",
    label: "Doctor Schedules",
    href: "/settings/schedules",
    icon: CalendarDays,
    description: "Weekly consultation shifts & slot block reservations",
  },
  {
    id: "catalog",
    label: "Master Catalog",
    href: "/settings/catalog",
    icon: BookOpen,
    description: "Prescription drug master (pg_trgm) & service tariffs",
  },
  {
    id: "team",
    label: "Staff & RBAC",
    href: "/settings/team",
    icon: Users,
    description: "Team members, roles, invitations & permissions",
  },
  {
    id: "letterhead",
    label: "Letterhead & Print",
    href: "/settings",
    icon: Printer,
    description: "Branding, letterhead designer & document sequences",
  },
];

interface SettingsNavProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function SettingsNav({ title, description, action }: SettingsNavProps) {
  const pathname = usePathname();

  // Find current active tab
  const activeTab =
    SETTINGS_TABS.find((tab) => {
      if (tab.href === "/settings") {
        return pathname === "/settings";
      }
      return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
    }) || SETTINGS_TABS[4]; // Default to letterhead/settings

  const Icon = activeTab.icon;

  return (
    <div className="space-y-3 pb-3 border-b border-slate-200">
      {/* Breadcrumb & Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 mb-0.5">
            <Link
              href="/settings"
              className="hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <Settings className="h-3 w-3" />
              <span>Settings</span>
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <span className="text-slate-800 font-semibold">{activeTab.label}</span>
          </div>

          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Icon className="h-5 w-5 text-[#2563EB] shrink-0" />
            <span>{title || activeTab.label}</span>
          </h1>

          {description && (
            <p className="text-xs text-slate-500 mt-0.5 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
      </div>

      {/* High-Density Tab Switcher Strip */}
      <div className="flex items-center gap-1 overflow-x-auto py-1 border-t border-slate-100 scrollbar-none">
        {SETTINGS_TABS.map((tab) => {
          const isSelected =
            tab.href === "/settings"
              ? pathname === "/settings"
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          const TabIcon = tab.icon;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer",
                isSelected
                  ? "bg-[#2563EB] text-white shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
              title={tab.description}
            >
              <TabIcon
                className={cn("h-3.5 w-3.5", isSelected ? "text-white" : "text-slate-500")}
              />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={cn(
                    "ml-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold",
                    isSelected
                      ? "bg-blue-700 text-white"
                      : "bg-slate-200 text-slate-700"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
