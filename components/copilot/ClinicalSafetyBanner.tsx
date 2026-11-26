"use client";

import * as React from "react";
import { AlertTriangle, ShieldCheck, AlertOctagon } from "lucide-react";
import type { AllergyAlert } from "@/modules/ai/copilot/dictation-orchestrator";

interface ClinicalSafetyBannerProps {
  allergyAlerts?: AllergyAlert[];
}

export function ClinicalSafetyBanner({ allergyAlerts = [] }: ClinicalSafetyBannerProps) {
  const hasAllergies = allergyAlerts.length > 0;

  return (
    <div className="space-y-2 mb-3">
      {/* Critical Deterministic Drug Allergy Warning */}
      {hasAllergies && (
        <div className="p-3 rounded-lg bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs shadow-xs animate-in fade-in-50 duration-200">
          <div className="flex items-center gap-2 font-bold text-rose-800 uppercase tracking-wide mb-1">
            <AlertOctagon className="h-4 w-4 text-rose-600 shrink-0 animate-bounce" />
            <span>Critical Drug Allergy Conflict Detected ({allergyAlerts.length})</span>
          </div>
          <ul className="space-y-1 pl-6 list-disc text-rose-900 font-medium text-[11px]">
            {allergyAlerts.map((alert, idx) => (
              <li key={idx}>
                {alert.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lean HITL Guardrail Information Strip */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50/60 border border-amber-200/60 text-amber-900 text-[11px]">
        <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        <span className="font-semibold text-amber-950">HITL Clinical Safeguard:</span>
        <span className="text-amber-800 truncate">
          Prescriptions and invoices are generated as <strong>DRAFT</strong> records only. Review and adjust before clinical sign-off.
        </span>
      </div>
    </div>
  );
}
