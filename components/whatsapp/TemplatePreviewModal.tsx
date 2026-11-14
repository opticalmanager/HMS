"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, CheckCheck, ExternalLink } from "lucide-react";
import type { WhatsAppLogItem } from "@/services/clinical-store";

interface TemplatePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: WhatsAppLogItem | null;
}

export function TemplatePreviewModal({
  open,
  onOpenChange,
  message,
}: TemplatePreviewModalProps) {
  if (!message) return null;

  const renderBubbleContent = () => {
    switch (message.templateName) {
      case "prescription_ready_v1":
        return (
          <div className="space-y-2 text-xs text-slate-800">
            <p className="font-semibold">Hello {message.patientName},</p>
            <p>
              Your digital clinical prescription for consultation{" "}
              <span className="font-mono font-bold text-blue-700">
                {message.params?.consultationNumber || "OPD-2026-000041"}
              </span>{" "}
              with {message.params?.doctorName || "Dr. Gaurav Kumar, MD"} is now ready.
            </p>
            <p>Please click the button below to download your signed PDF prescription.</p>
            <div className="pt-2 border-t border-emerald-100 flex justify-center">
              <span className="inline-flex items-center gap-1.5 text-[#2563EB] font-bold text-xs py-1">
                <ExternalLink className="h-3.5 w-3.5" /> View Digital Prescription PDF
              </span>
            </div>
          </div>
        );

      case "appointment_confirmation_v1":
        return (
          <div className="space-y-2 text-xs text-slate-800">
            <p className="font-semibold">Dear {message.patientName},</p>
            <p>
              Your appointment at Apex Superspeciality Hospital has been confirmed.
            </p>
            <div className="p-2.5 rounded bg-white/80 border border-slate-200 font-mono space-y-1">
              <div>Doctor: {message.params?.doctorName || "Dr. Ananya Sharma"}</div>
              <div>Date & Slot: {message.params?.dateTime || "14-Nov-2026 at 10:30 AM"}</div>
              <div className="font-bold text-[#2563EB]">Token: #{message.params?.token || "105"}</div>
            </div>
            <p className="text-[11px] text-slate-500">Please arrive 15 minutes prior to your slot.</p>
          </div>
        );

      case "bill_receipt_v1":
        return (
          <div className="space-y-2 text-xs text-slate-800">
            <p className="font-semibold">Payment Receipt Confirmation</p>
            <p>
              Thank you {message.patientName}. We have received your payment of{" "}
              <span className="font-bold text-slate-900">{message.params?.amountPaid || "₹1,250"}</span> for{" "}
              <span className="font-mono">{message.params?.invoiceNumber || "INV-2026-000104"}</span>.
            </p>
            <div className="pt-2 border-t border-emerald-100 flex justify-center">
              <span className="inline-flex items-center gap-1.5 text-[#2563EB] font-bold text-xs py-1">
                <ExternalLink className="h-3.5 w-3.5" /> Download Official Tax Invoice
              </span>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-2 text-xs text-slate-800">
            <p className="font-semibold">Apex Hospital Notification</p>
            <p>Template: {message.templateName}</p>
            <pre className="p-2 rounded bg-white text-[10px] font-mono overflow-x-auto">
              {JSON.stringify(message.params, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#2563EB]" />
            Meta WhatsApp Chat Bubble Preview
          </DialogTitle>
        </DialogHeader>

        {/* WhatsApp Chat Simulation Canvas */}
        <div className="p-6 bg-[#EFEAE2] min-h-[320px] flex flex-col justify-end">
          <div className="max-w-[85%] bg-[#DCF8C6] p-3 rounded-2xl rounded-tr-xs shadow-xs border border-emerald-200 self-end space-y-2">
            {renderBubbleContent()}

            <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 pt-1">
              <span>{message.timestamp}</span>
              <CheckCheck className={`h-3.5 w-3.5 ${message.status === "read" ? "text-blue-500" : "text-slate-400"}`} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
