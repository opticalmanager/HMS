"use client";

import * as React from "react";
import { Building2, ChevronDown, Check } from "lucide-react";

export interface Branch {
  id: string;
  name: string;
  code: string;
  isMain: boolean;
}

const DEFAULT_BRANCHES: Branch[] = [
  { id: "b1", name: "Apex Main Campus & Trauma Centre", code: "AMC-01", isMain: true },
  { id: "b2", name: "Apex City OPD Clinic & Diagnostics", code: "AOPD-02", isMain: false },
  { id: "b3", name: "Apex Super Speciality Eye & ENT Wing", code: "ASE-03", isMain: false },
];

export function BranchSwitcher() {
  const [branches] = React.useState<Branch[]>(DEFAULT_BRANCHES);
  const [selectedBranch, setSelectedBranch] = React.useState<Branch>(DEFAULT_BRANCHES[0]);
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors"
      >
        <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
        <span className="truncate max-w-[140px] md:max-w-[200px]">{selectedBranch.name}</span>
        <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-64 rounded-md border border-slate-200 bg-white py-1 shadow-lg z-50">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
              Active Hospital Branches
            </div>
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setSelectedBranch(b);
                  setIsOpen(false);
                }}
                className="flex items-center justify-between w-full px-3 py-2 text-xs text-left hover:bg-slate-50 text-slate-700"
              >
                <div>
                  <div className="font-medium text-slate-900">{b.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{b.code} {b.isMain ? "• Primary HQ" : ""}</div>
                </div>
                {selectedBranch.id === b.id && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
