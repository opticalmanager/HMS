"use client";

import { Search, Building2, Bell, Wifi, WifiOff, User, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AppTopbarProps {
  onOpenCommand?: () => void;
  isOffline?: boolean;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function AppTopbar({
  onOpenCommand,
  isOffline = false,
  sidebarCollapsed,
  onToggleSidebar,
}: AppTopbarProps) {
  return (
    <header className="h-12 border-b border-slate-200 bg-white px-4 flex items-center justify-between gap-4 sticky top-0 z-30 print:hidden select-none" data-topbar>
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onOpenCommand}
          className="flex items-center gap-2 w-full max-w-md px-3 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-xs hover:border-slate-300 transition-colors text-left"
        >
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <span className="flex-1 truncate">Search patient UHID, phone, or doctor...</span>
          <kbd className="px-1.5 py-0.2 rounded bg-white border border-slate-200 text-[10px] font-mono font-medium shadow-2xs">
            Ctrl+K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-3">
        {/* Offline / Online Network Indicator */}
        {isOffline ? (
          <Badge variant="warning" className="flex items-center gap-1.5 text-[11px] py-0.5">
            <WifiOff className="h-3 w-3" />
            <span>Offline</span>
          </Badge>
        ) : (
          <Badge variant="success" className="flex items-center gap-1.5 text-[11px] py-0.5">
            <Wifi className="h-3 w-3" />
            <span>Connected</span>
          </Badge>
        )}

        {/* Branch Switcher Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
          <Building2 className="h-3 w-3 text-slate-500" />
          <span>Main Hospital</span>
        </div>

        {/* User Mini Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="h-7 w-7 rounded-full bg-blue-100 text-[#2563EB] flex items-center justify-center font-bold text-xs">
            <User className="h-3.5 w-3.5" />
          </div>
          <div className="hidden md:block text-left">
            <div className="text-[11px] font-semibold text-slate-900 leading-tight">Dr. Gaurav Kumar</div>
            <div className="text-[9px] text-slate-500 leading-tight">Chief Consultant</div>
          </div>
        </div>
      </div>
    </header>
  );
}
