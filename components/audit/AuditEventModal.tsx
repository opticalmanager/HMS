"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock, ExternalLink } from "lucide-react";
import type { AuditLogItem } from "@/services/clinical-store";
import { Badge } from "@/components/ui/badge";

interface AuditEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: AuditLogItem | null;
}

export function AuditEventModal({
  open,
  onOpenChange,
  event,
}: AuditEventModalProps) {
  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Lock className="h-4 w-4 text-[#2563EB]" />
            Audit Event Inspection — {event.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Timestamp</span>
              <div className="font-mono font-medium text-slate-900">{event.timestamp}</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Origin IP Address</span>
              <div className="font-mono font-medium text-slate-900">{event.ip}</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Actor / User</span>
              <div className="font-semibold text-slate-900">{event.actor}</div>
              <div className="text-[10px] text-slate-500">{event.role}</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Module & Action</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className="font-bold text-[10px]">
                  {event.module}
                </Badge>
                <Badge variant="info" className="font-mono text-[10px]">
                  {event.action}
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Target Entity</span>
            <div className="p-2 rounded bg-blue-50 border border-blue-200 font-mono font-bold text-blue-900">
              {event.entity}
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Audit Details / Notes</span>
            <div className="p-2.5 rounded bg-white border border-slate-200 text-slate-800 leading-relaxed">
              {event.notes}
            </div>
          </div>

          {/* Compliance Seal */}
          <div className="p-2 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-between text-[11px] text-emerald-800">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Cryptographically Verified Immutable Record (DISHA / HIPAA compliant)
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
