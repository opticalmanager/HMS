"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { WabaService } from "@/services/waba.service";
import { Bell, Send, CheckCircle2, MessageSquare, Clock, Calendar } from "lucide-react";
import type { Appointment } from "@/types/hms";

interface FollowUpReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
}

export function FollowUpReminderModal({
  open,
  onOpenChange,
  appointment,
}: FollowUpReminderModalProps) {
  const [template, setTemplate] = React.useState<"followup" | "meds" | "lab">("followup");
  const [scheduledDate, setScheduledDate] = React.useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [reminderTime, setReminderTime] = React.useState<string>("10:00");
  const [isDispatched, setIsDispatched] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setIsDispatched(false);
    }
  }, [open]);

  if (!appointment) return null;

  const getMessagePreview = () => {
    const pName = appointment.patientName || "Patient";
    const dName = appointment.doctorName || "Doctor";
    if (template === "followup") {
      return `Dear ${pName}, this is a gentle reminder from Visual Eyez Hospital. Your follow-up appointment with ${dName} is scheduled on ${scheduledDate} at ${reminderTime} AM. Please confirm by replying YES.`;
    }
    if (template === "meds") {
      return `Hello ${pName}, please ensure you are taking your prescribed medications on time as directed by ${dName}. For any queries or refills, reach us at +91 9871900034.`;
    }
    return `Dear ${pName}, your diagnostic lab test results are ready for review. Kindly schedule your consultation with ${dName} at Visual Eyez Hospital.`;
  };

  const handleSendReminder = async () => {
    const phone = appointment.patientPhone?.replace(/\D/g, "") || "9871900034";
    WabaService.sendAppointmentConfirmation({
      phone,
      patientName: appointment.patientName || "Patient",
      doctorName: appointment.doctorName || "Doctor",
      appointmentDate: scheduledDate,
      timeSlot: reminderTime,
      tokenNumber: appointment.tokenNumber,
      hospitalName: "Visual Eyez Eye Care Hospital",
    });
    setIsDispatched(true);
    setTimeout(() => {
      onOpenChange(false);
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 flex flex-col">
        <DialogHeader className="p-4 border-b border-slate-100 bg-blue-50/50">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-300">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900">
                Schedule Automated Patient Reminder
              </DialogTitle>
              <p className="text-[11px] text-slate-500">
                Instant WhatsApp & SMS notification triggers for {appointment.patientName}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-3.5 text-xs">
          {/* Template Selection */}
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
              Notification Template
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setTemplate("followup")}
                className={`py-1.5 px-2 rounded-md border text-center transition-all cursor-pointer ${
                  template === "followup"
                    ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Follow-Up
              </button>
              <button
                type="button"
                onClick={() => setTemplate("meds")}
                className={`py-1.5 px-2 rounded-md border text-center transition-all cursor-pointer ${
                  template === "meds"
                    ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Med Refill
              </button>
              <button
                type="button"
                onClick={() => setTemplate("lab")}
                className={`py-1.5 px-2 rounded-md border text-center transition-all cursor-pointer ${
                  template === "lab"
                    ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Lab Results
              </button>
            </div>
          </div>

          {/* Date & Time Picker */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1">
                Target Date
              </label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1">
                Dispatch Time
              </label>
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Message Preview */}
          <div>
            <span className="text-[11px] font-semibold text-slate-700 block mb-1 flex items-center gap-1">
              <MessageSquare className="h-3 w-3 text-emerald-600" /> WhatsApp Message Body
            </span>
            <div className="p-3 rounded-lg border border-slate-200 bg-emerald-50/30 text-slate-800 text-[11px] leading-relaxed font-sans">
              {getMessagePreview()}
            </div>
          </div>

          {isDispatched && (
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 flex items-center gap-2 text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Automated reminder queued & dispatched successfully!
            </div>
          )}
        </div>

        <DialogFooter className="p-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isDispatched}
            onClick={handleSendReminder}
            className="text-xs h-8 gap-1.5 bg-[#1976D2] hover:bg-blue-700 text-white"
          >
            <Send className="h-3.5 w-3.5" /> Dispatch via WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
