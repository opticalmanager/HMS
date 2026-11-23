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
      {/* Mandatory HITL Clinical Safety Banner */}
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-amber-50/90 border border-amber-200 text-amber-900 text-xs shadow-2xs">
        <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="font-semibold">Human-in-the-Loop (HITL) Medical Guardrail:</span>{" "}
          <span className="text-amber-800">
            AI-dictated prescriptions and bills are generated as <strong>DRAFT</strong> records only. Review, adjust dosages, and confirm clinical approval before finalizing.
          </span>
        </div>
      </div>

      {/* Critical Deterministic Drug Allergy Warning */}
      {hasAllergies && (
        <div className="p-3 rounded-lg bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs shadow-sm animate-pulse-once">
          <div className="flex items-center gap-2 font-bold text-rose-800 uppercase tracking-wide mb-1.5">
            <AlertOctagon className="h-4 w-4 text-rose-600 shrink-0 animate-bounce" />
            <span>CRITICAL DRUG ALLERGY CONFLICT DETECTED ({allergyAlerts.length})</span>
          </div>
          <ul className="space-y-1 pl-6 list-disc text-rose-900 font-medium">
            {allergyAlerts.map((alert, idx) => (
              <li key={idx}>
                {alert.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
