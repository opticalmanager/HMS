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
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // Global Keyboard Shortcut: Ctrl+B or Cmd+B to smartly toggle navigation sidebar
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
        // Do not intercept if actively typing in an input or textarea
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea") {
          return;
        }
        e.preventDefault();
        setSidebarCollapsed((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
        />
        <main
          className={cn(
            "flex-1 min-w-0",
            isOpd
              ? "h-[calc(100vh-3rem)] max-h-[calc(100vh-3rem)] overflow-hidden p-2 flex flex-col"
              : "overflow-y-auto p-6"
          )}
        >
          {children}
        </main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
