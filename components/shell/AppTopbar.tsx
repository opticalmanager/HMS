"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, User, LogOut, ChevronDown } from "lucide-react";
import { useSession, useActiveOrganization, signOut } from "@/lib/auth-client";

interface AppTopbarProps {
  onOpenCommand?: () => void;
  isOffline?: boolean;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function AppTopbar({ onOpenCommand }: AppTopbarProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: activeOrg } = useActiveOrganization();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Fallback
    }
    router.push("/login");
  };

  const userName = session?.user?.name || "Dr. Gaurav Kumar";
  const orgName = activeOrg?.name || "Apex Super Specialty";

  return (
    <header
      className="h-12 border-b border-slate-200 bg-white px-4 flex items-center justify-between gap-4 sticky top-0 z-30 print:hidden select-none"
      data-topbar
    >
      <div className="flex items-center gap-3 flex-1 max-w-xl">
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

      <div className="flex items-center gap-3 relative">
        {/* Branch / Clinic Switcher Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
          <Building2 className="h-3.5 w-3.5 text-[#2563EB]" />
          <span className="max-w-[140px] truncate">{orgName}</span>
        </div>

        {/* User Mini Profile with Sign Out Toggle */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-80 transition-opacity text-left cursor-pointer"
          >
            <div className="h-7 w-7 rounded-full bg-blue-100 text-[#2563EB] flex items-center justify-center font-bold text-xs">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-[11px] font-semibold text-slate-900 leading-tight truncate max-w-[120px]">
                {userName}
              </div>
              <div className="text-[9px] text-slate-500 leading-tight">Staff / Consultant</div>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400 ml-0.5" />
          </button>

          {/* Quick Dropdown Menu */}
          {menuOpen && (
            <div
              className="absolute right-0 top-10 w-48 bg-white border border-slate-200 shadow-lg rounded-lg py-1.5 z-50 text-xs"
              onClick={() => setMenuOpen(false)}
            >
              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px]">
                <div className="font-semibold text-slate-900 truncate">{userName}</div>
                <div className="text-slate-400 truncate font-mono text-[10px]">
                  {session?.user?.email || "doctor@apexhospital.org"}
                </div>
              </div>

              <button
                onClick={() => router.push("/settings/team")}
                className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50 text-xs flex items-center gap-2"
              >
                <span>Team & Roles</span>
              </button>

              <button
                onClick={() => router.push("/onboarding")}
                className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50 text-xs flex items-center gap-2"
              >
                <span>Create / Switch Clinic</span>
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 text-xs flex items-center gap-2 font-medium"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
