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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { clinicalStore } from "@/services/clinical-store";
import { formatCurrencyINR } from "@/utils/formatting";
import type { Appointment, AppointmentStatus } from "@/types/hms";
import {
  Clock,
  User,
  Phone,
  Stethoscope,
  Receipt,
  Send,
  CheckCircle2,
  Calendar,
  XCircle,
  FileText,
} from "lucide-react";

interface AppointmentDetailsPopoverProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusTransition?: (aptId: string, status: AppointmentStatus) => void;
  onReschedule?: (aptId: string, date: string, slot: string) => void;
}

export function AppointmentDetailsPopover({
  appointment,
  open,
  onOpenChange,
  onStatusTransition,
  onReschedule,
}: AppointmentDetailsPopoverProps) {
  const [rescheduleMode, setRescheduleMode] = React.useState(false);
  const [newDate, setNewDate] = React.useState("");
  const [newSlot, setNewSlot] = React.useState("10:00 AM");

  React.useEffect(() => {
    if (appointment) {
      setNewDate(appointment.appointmentDate);
      setNewSlot(appointment.timeSlot);
      setRescheduleMode(false);
    }
  }, [appointment]);

  if (!appointment) return null;

  const handleStatusChange = async (status: AppointmentStatus) => {
    clinicalStore.updateAppointmentStatus(appointment.id, status);
    if (onStatusTransition) {
      onStatusTransition(appointment.id, status);
    }
    onOpenChange(false);

    try {
      await fetch(`/api/crm/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (e) {
      console.error("Failed to patch appointment status to DB:", e);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!newDate) return;
    clinicalStore.rescheduleAppointment(appointment.id, newDate, newSlot);
    if (onReschedule) {
      onReschedule(appointment.id, newDate, newSlot);
    }
    setRescheduleMode(false);
    onOpenChange(false);

    try {
      await fetch(`/api/crm/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentDate: newDate, timeSlot: newSlot }),
      });
    } catch (e) {
      console.error("Failed to patch rescheduled appointment to DB:", e);
    }
  };

  const handleCancelAppointment = async () => {
    clinicalStore.cancelAppointment(appointment.id, "Cancelled from calendar popover");
    if (onStatusTransition) {
      onStatusTransition(appointment.id, "cancelled");
    }
    onOpenChange(false);

    try {
      await fetch(`/api/crm/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
    } catch (e) {
      console.error("Failed to cancel appointment in DB:", e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm bg-blue-100 text-[#2563EB] px-2 py-0.5 rounded">
                Token #{appointment.tokenNumber}
              </span>
              <Badge
                variant={
                  appointment.status === "in_consultation"
                    ? "info"
                    : appointment.status === "arrived"
                    ? "warning"
                    : appointment.status === "completed"
                    ? "success"
                    : "outline"
                }
                className="capitalize text-xs"
              >
                {appointment.status.replace("_", " ")}
              </Badge>
            </div>
            <span className="text-xs font-semibold text-slate-500">{appointment.appointmentDate}</span>
          </div>
        </DialogHeader>

        {/* Patient & Doctor Details Card */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 mt-2">
          {/* Patient Details */}
          <div>
            <div className="text-sm font-bold text-slate-900">{appointment.patientName}</div>
            <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-2">
              <span>{appointment.patientUhid}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3 text-slate-400" />
                {appointment.patientPhone}
              </span>
            </div>
          </div>

          {/* Doctor Details */}
          <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Stethoscope className="h-4 w-4 text-[#2563EB]" />
              <span className="font-semibold">{appointment.doctorName}</span>
              <span className="text-slate-400">({appointment.department})</span>
            </div>
            <div className="flex items-center gap-1 font-semibold text-slate-800">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {appointment.timeSlot}
            </div>
          </div>

          {/* Chief Complaint */}
          {appointment.chiefComplaints && (
            <div className="border-t border-slate-200/80 pt-2 text-xs">
              <span className="font-semibold text-slate-600 block mb-0.5">Chief Complaints:</span>
              <p className="text-slate-700 italic bg-white p-2 rounded border border-slate-200">
                {appointment.chiefComplaints}
              </p>
            </div>
          )}

          {/* Fee & Billing */}
          <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">Consultation Fee</span>
            <span className="font-mono font-bold text-slate-900">
              {formatCurrencyINR(appointment.consultationFee)}
            </span>
          </div>
        </div>

        {/* Reschedule Drawer within Popover */}
        {rescheduleMode ? (
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-3 mt-2">
            <div className="text-xs font-bold text-blue-900">Reschedule Appointment Slot</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">New Date</label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">New Slot</label>
                <select
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                >
                  <option value="09:30 AM">09:30 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="10:30 AM">10:30 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="04:00 PM">04:00 PM</option>
                  <option value="04:30 PM">04:30 PM</option>
                  <option value="05:00 PM">05:00 PM</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRescheduleMode(false)}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmReschedule}
                className="h-7 text-xs bg-[#2563EB] hover:bg-blue-700"
              >
                Confirm Reschedule
              </Button>
            </div>
          </div>
        ) : (
          /* Operational Action Buttons */
          <div className="grid grid-cols-2 gap-2 pt-2">
            {appointment.status === "scheduled" && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleStatusChange("arrived")}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
              >
                Check In (Patient Arrived)
              </Button>
            )}

            {appointment.status === "arrived" && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleStatusChange("in_consultation")}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                Call to Doctor Cabin
              </Button>
            )}

            {appointment.status === "in_consultation" && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleStatusChange("completed")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Complete Visit
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRescheduleMode(true)}
              className="text-xs gap-1"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-500" /> Reschedule
            </Button>

            <a
              href={`/billing?patientId=${appointment.patientId}`}
              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 h-8 gap-1.5"
            >
              <Receipt className="h-3.5 w-3.5 text-slate-500" /> Create Bill
            </a>

            <a
              href={`/whatsapp?phone=${appointment.patientPhone}`}
              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 h-8 gap-1.5"
            >
              <Send className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp Slip
            </a>

            {appointment.status !== "cancelled" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelAppointment}
                className="col-span-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs gap-1"
              >
                <XCircle className="h-3.5 w-3.5" /> Cancel Appointment
              </Button>
            )}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
