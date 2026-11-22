"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, User, LogOut, ChevronDown, Check, Plus, Settings } from "lucide-react";
import { useSession, useActiveOrganization, signOut, authClient } from "@/lib/auth-client";

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
  const [orgDropdownOpen, setOrgDropdownOpen] = React.useState(false);
  const [userOrgs, setUserOrgs] = React.useState<Array<{ id: string; name: string; slug?: string }>>([]);
  const [switchingOrg, setSwitchingOrg] = React.useState(false);

  const loadOrganizations = React.useCallback(async () => {
    try {
      const res = await authClient.organization.list();
      if (res.data) {
        setUserOrgs(res.data);
      }
    } catch {
      // Ignore
    }
  }, []);

  React.useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const handleSwitchOrg = async (orgId: string) => {
    if (orgId === activeOrg?.id) {
      setOrgDropdownOpen(false);
      return;
    }
    try {
      setSwitchingOrg(true);
      await authClient.organization.setActive({ organizationId: orgId });
      setOrgDropdownOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Failed to switch clinic organization:", err);
    } finally {
      setSwitchingOrg(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Fallback
    }
    router.push("/login");
  };

  const userName = session?.user?.name || "Staff User";
  const orgName = activeOrg?.name || "Clinic Portal";

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
        {/* Interactive Clinic Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setOrgDropdownOpen(!orgDropdownOpen);
              if (!orgDropdownOpen) loadOrganizations();
            }}
            className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-md border border-slate-200 transition-colors cursor-pointer"
            title="Switch Clinic Organization"
          >
            <Building2 className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
            <span className="max-w-[130px] truncate">{orgName}</span>
            <ChevronDown className="h-3 w-3 text-slate-500 shrink-0" />
          </button>

          {orgDropdownOpen && (
            <div
              className="absolute left-0 sm:right-0 sm:left-auto top-10 w-56 bg-white border border-slate-200 shadow-xl rounded-lg py-1 z-50 text-xs"
              onMouseLeave={() => setOrgDropdownOpen(false)}
            >
              <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Switch Clinic Tenant
              </div>
              <div className="max-h-48 overflow-y-auto py-1">
                {userOrgs.length === 0 ? (
                  <div className="px-3 py-2 text-slate-400 text-[11px]">No other clinics found</div>
                ) : (
                  userOrgs.map((org) => {
                    const isActive = org.id === activeOrg?.id;
                    return (
                      <button
                        key={org.id}
                        onClick={() => handleSwitchOrg(org.id)}
                        disabled={switchingOrg}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 text-xs ${
                          isActive ? "font-semibold text-[#2563EB] bg-blue-50/50" : "text-slate-700"
                        }`}
                      >
                        <span className="truncate max-w-[170px]">{org.name}</span>
                        {isActive && <Check className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={() => {
                    setOrgDropdownOpen(false);
                    router.push("/onboarding");
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-1.5 font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Register New Clinic</span>
                </button>
              </div>
            </div>
          )}
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
                {session?.user?.email && (
                  <div className="text-slate-400 truncate font-mono text-[10px]">
                    {session.user.email}
                  </div>
                )}
              </div>

              <button
                onClick={() => router.push("/settings")}
                className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50 text-xs flex items-center gap-2 cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5 text-slate-400" />
                <span>Clinic Settings</span>
              </button>

              <button
                onClick={() => router.push("/onboarding")}
                className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50 text-xs flex items-center gap-2 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-slate-400" />
                <span>Register New Clinic</span>
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
