"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Save, Printer, ArrowRight, Loader2, Check } from "lucide-react";

interface StickyActionBarProps {
  onSaveDraft: () => Promise<void>;
  onApprove: () => Promise<void>;
  onOpenPrint: () => void;
  isSaving: boolean;
  isApproving: boolean;
  isApproved: boolean;
  canApprove: boolean;
  isDoctorUser: boolean;
  hasDrafts: boolean;
}

export function StickyActionBar({
  onSaveDraft,
  onApprove,
  onOpenPrint,
  isSaving,
  isApproving,
  isApproved,
  canApprove,
  isDoctorUser,
  hasDrafts,
}: StickyActionBarProps) {
  return (
    <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-xs border-t border-slate-200 py-3 px-4 -mx-2 -mb-2 sm:-mx-6 sm:-mb-6 mt-6 flex flex-wrap items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>
          {isApproved
            ? "Prescription APPROVED & LOCKED (Audit logged in webhook_outbox)"
            : hasDrafts
            ? "Unsaved or pending clinical draft changes"
            : "Awaiting consultation dictation"}
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        {hasDrafts && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenPrint}
            disabled={isSaving || isApproving}
            className="h-9 text-xs gap-1.5 border-slate-300 text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            Print / Preview Rx
          </Button>
        )}

        {hasDrafts && !isApproved && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            disabled={isSaving || isApproving}
            className="h-9 text-xs gap-1.5 border-slate-300 text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 text-slate-500" />
            )}
            Save Draft
          </Button>
        )}

        {isApproved ? (
          <Button
            type="button"
            disabled
            className="h-9 text-xs gap-1.5 bg-emerald-600 text-white font-semibold cursor-default"
          >
            <Check className="h-4 w-4" />
            Prescription Approved
          </Button>
        ) : (
          canApprove && (
            <Button
              type="button"
              onClick={onApprove}
              disabled={isSaving || isApproving || !hasDrafts}
              className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs cursor-pointer"
            >
              {isApproving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Approving Clinical Record...
                </>
              ) : isDoctorUser ? (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Approve Prescription & Send Bill to Desk
                  <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Approve Prescription & Finalize Bill
                  <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                </>
              )}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
