"use client";

import { Search, Building2, Bell, Wifi, WifiOff, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AppTopbarProps {
  onOpenCommand?: () => void;
  isOffline?: boolean;
}

export function AppTopbar({ onOpenCommand, isOffline = false }: AppTopbarProps) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={onOpenCommand}
          className="flex items-center gap-2 w-full max-w-md px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-xs hover:border-slate-300 transition-colors text-left"
        >
          <Search className="h-4 w-4 text-slate-400" />
          <span className="flex-1">Search patient UHID, phone, or doctor...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono font-medium shadow-2xs">
            Ctrl+K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* Offline / Online Network Indicator */}
        {isOffline ? (
          <Badge variant="warning" className="flex items-center gap-1.5">
            <WifiOff className="h-3 w-3" />
            <span>Offline Cache Mode</span>
          </Badge>
        ) : (
          <Badge variant="success" className="flex items-center gap-1.5">
            <Wifi className="h-3 w-3" />
            <span>Connected (Supabase Pooler)</span>
          </Badge>
        )}

        {/* Branch Switcher Indicator */}
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-md">
          <Building2 className="h-3.5 w-3.5 text-slate-500" />
          <span>Main Hospital Campus</span>
        </div>

        {/* User Mini Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="h-8 w-8 rounded-full bg-blue-100 text-[#2563EB] flex items-center justify-center font-bold text-xs">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-slate-900 leading-tight">Dr. Gaurav Kumar</div>
            <div className="text-[10px] text-slate-500 leading-tight">Chief Consultant (MD)</div>
          </div>
        </div>
      </div>
    </header>
  );
}
