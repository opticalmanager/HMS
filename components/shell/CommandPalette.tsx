"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Search,
  User,
  Calendar,
  Stethoscope,
  BedDouble,
  Receipt,
  Pill,
  Tv,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  const navigate = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const QUICK_ACTIONS = [
    { label: "OPD Clinical Console", desc: "Consultations & e-prescriptions", href: "/opd", icon: Stethoscope },
    { label: "IPD Ward & Bed Matrix", desc: "Live bed occupancy & admissions", href: "/ipd", icon: BedDouble },
    { label: "Token Queue TV Display", desc: "Full-screen kiosk callout board", href: "/token-board", icon: Tv },
    { label: "Book Patient Appointment", desc: "Doctor slots & token allocation", href: "/appointments", icon: Calendar },
    { label: "Billing & Cash Counter", desc: "OPD/IPD invoices & thermal receipts", href: "/billing", icon: Receipt },
    { label: "Pharmacy Stock & Expiry", desc: "Medicine batches & reorder alerts", href: "/inventory", icon: Pill },
  ];

  const filtered = QUICK_ACTIONS.filter(
    (a) =>
      a.label.toLowerCase().includes(query.toLowerCase()) ||
      a.desc.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-slate-100 flex-row items-center gap-3">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a clinical module, UHID, or patient name..."
            className="border-0 shadow-none focus-visible:ring-0 text-base h-10 px-0"
            autoFocus
          />
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Quick Navigation
          </div>
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              No matching clinical modules or records found.
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className="h-8 w-8 rounded-md bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 leading-tight">
                      {item.label}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{item.desc}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-400">
          <span>Navigate with <b>↑</b> <b>↓</b> keys</span>
          <span>Select with <b>Enter</b></span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
