"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { AppTopbar } from "@/components/shell/AppTopbar";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOpd = pathname === "/opd";
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [isOffline, setIsOffline] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // Auto-collapse sidebar on OPD clinical desk to provide doctors maximum horizontal workspace
  React.useEffect(() => {
    if (isOpd) {
      setSidebarCollapsed(true);
    }
  }, [isOpd]);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F6F7F9]">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <AppTopbar
          onOpenCommand={() => setCommandOpen(true)}
          isOffline={isOffline}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        />
        <main className={cn("flex-1 overflow-y-auto", isOpd ? "p-2" : "p-6")}>
          {children}
        </main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
