"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Save, Printer, ArrowRight, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="sticky bottom-0 z-20 bg-white/90 backdrop-blur-md border-t border-slate-200/90 py-2.5 px-4 -mx-2 -mb-2 sm:-mx-6 sm:-mb-6 mt-6 flex flex-wrap items-center justify-between gap-3 shadow-md transition-all">
      <div className="flex items-center gap-2 text-xs">
        <span
          className={cn(
            "inline-block h-2 w-2 rounded-full",
            isApproved
              ? "bg-emerald-500 animate-pulse"
              : hasDrafts
              ? "bg-amber-500"
              : "bg-slate-400"
          )}
        />
        <span
          className={cn(
            "font-medium",
            isApproved
              ? "text-emerald-700 font-semibold"
              : hasDrafts
              ? "text-amber-800"
              : "text-slate-500"
          )}
        >
          {isApproved
            ? "Prescription APPROVED & LOCKED (Audit logged in webhook_outbox)"
            : hasDrafts
            ? "Unsaved clinical draft changes pending approval"
            : "Awaiting consultation dictation"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {hasDrafts && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenPrint}
            disabled={isSaving || isApproving}
            className="h-8 text-xs gap-1.5 border-slate-300 text-slate-700 hover:text-slate-900 active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
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
            className="h-8 text-xs gap-1.5 border-slate-300 text-slate-700 hover:text-slate-900 active:scale-95 transition-all cursor-pointer"
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
            className="h-8 text-xs gap-1.5 bg-emerald-600 text-white font-semibold cursor-default"
          >
            <Check className="h-3.5 w-3.5" />
            Prescription Approved
          </Button>
        ) : (
          canApprove && (
            <Button
              type="button"
              onClick={onApprove}
              disabled={isSaving || isApproving || !hasDrafts}
              className="h-8 px-4 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold shadow-xs transition-all cursor-pointer"
            >
              {isApproving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Approving Clinical Record...
                </>
              ) : isDoctorUser ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Approve Prescription & Send Bill to Desk
                  <ArrowRight className="h-3 w-3 ml-0.5" />
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Approve Prescription & Finalize Bill
                  <ArrowRight className="h-3 w-3 ml-0.5" />
                </>
              )}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
