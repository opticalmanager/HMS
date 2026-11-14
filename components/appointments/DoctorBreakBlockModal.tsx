"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clinicalStore, useClinicalStore } from "@/services/clinical-store";
import type { DoctorBlock } from "@/types/hms";
import { Coffee, Trash2, Clock, AlertTriangle } from "lucide-react";

interface DoctorBreakBlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: string;
}

const DOCTORS = [
  { id: "all", name: "All Hospital Doctors", dept: "All Departments" },
  { id: "doc-1", name: "Dr. Gaurav Kumar", dept: "Cardiology" },
  { id: "doc-2", name: "Dr. Ananya Sharma", dept: "General Medicine" },
  { id: "doc-3", name: "Dr. Rajesh Varma", dept: "Orthopedics" },
];

export function DoctorBreakBlockModal({
  open,
  onOpenChange,
  selectedDate = new Date().toISOString().split("T")[0],
}: DoctorBreakBlockModalProps) {
  const store = useClinicalStore();

  const [doctorId, setDoctorId] = React.useState<string>("all");
  const [startDate, setStartDate] = React.useState<string>(selectedDate);
  const [endDate, setEndDate] = React.useState<string>(selectedDate);
  const [isFullDay, setIsFullDay] = React.useState<boolean>(false);
  const [startTime, setStartTime] = React.useState<string>("01:00 PM");
  const [endTime, setEndTime] = React.useState<string>("02:00 PM");
  const [reason, setReason] = React.useState<DoctorBlock["reason"]>("lunch");
  const [notes, setNotes] = React.useState<string>("Scheduled Doctor Break");

  React.useEffect(() => {
    if (open && selectedDate) {
      setStartDate(selectedDate);
      setEndDate(selectedDate);
    }
  }, [open, selectedDate]);

  const existingBlocks = store.doctorBlocks || [];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const doctorObj = DOCTORS.find((d) => d.id === doctorId) || DOCTORS[0];

    const newBlock: DoctorBlock = {
      id: `blk-${Date.now().toString(36)}`,
      doctorId,
      doctorName: doctorObj.name,
      startDate,
      endDate: endDate || startDate,
      startTime: isFullDay ? undefined : startTime,
      endTime: isFullDay ? undefined : endTime,
      reason,
      notes,
      createdAt: new Date().toISOString(),
    };

    clinicalStore.addDoctorBlock(newBlock);
    onOpenChange(false);
  };

  const handleRemove = (blockId: string) => {
    clinicalStore.removeDoctorBlock(blockId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Coffee className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Break &amp; Schedule Blocking
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Block out consultation slots for doctor breaks, OT surgeries, rounds, or leave
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {/* Doctor Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Doctor</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800"
            >
              {DOCTORS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.dept})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* Full Day Toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="fullDayCheck"
              checked={isFullDay}
              onChange={(e) => setIsFullDay(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="fullDayCheck" className="text-xs text-slate-700 font-medium">
              Block Entire Working Day (Full Leave / Conference)
            </label>
          </div>

          {/* Time Window (if not full day) */}
          {!isFullDay && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Start Time Slot
                </label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800"
                >
                  <option value="12:00 PM">12:00 PM</option>
                  <option value="12:30 PM">12:30 PM</option>
                  <option value="01:00 PM">01:00 PM (Lunch)</option>
                  <option value="01:30 PM">01:30 PM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="02:30 PM">02:30 PM</option>
                  <option value="03:00 PM">03:00 PM</option>
                  <option value="03:30 PM">03:30 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                  <option value="04:30 PM">04:30 PM</option>
                  <option value="05:00 PM">05:00 PM</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  End Time Slot
                </label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800"
                >
                  <option value="12:30 PM">12:30 PM</option>
                  <option value="01:00 PM">01:00 PM</option>
                  <option value="01:30 PM">01:30 PM</option>
                  <option value="02:00 PM">02:00 PM (Lunch End)</option>
                  <option value="02:30 PM">02:30 PM</option>
                  <option value="03:00 PM">03:00 PM</option>
                  <option value="03:30 PM">03:30 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                  <option value="04:30 PM">04:30 PM</option>
                  <option value="05:00 PM">05:00 PM</option>
                  <option value="06:00 PM">06:00 PM</option>
                </select>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Blocking</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as DoctorBlock["reason"])}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800"
              >
                <option value="lunch">Lunch Break</option>
                <option value="ot_surgery">OT / Surgical Procedure</option>
                <option value="meeting">Hospital Meeting / Grand Rounds</option>
                <option value="ward_duty">IPD Ward Duty / Emergency Duty</option>
                <option value="leave">Personal Leave / Vacation</option>
                <option value="other">Other Official Assignment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Instructions</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Total Hip Replacement in OT-2"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-[#2563EB] hover:bg-blue-700 text-xs">
              Confirm &amp; Block Slots
            </Button>
          </DialogFooter>
        </form>

        {/* List of Active Schedule Blocks */}
        <div className="mt-6 border-t border-slate-200 pt-4">
          <div className="text-xs font-bold text-slate-900 mb-2 flex items-center justify-between">
            <span>Active Blocks for This Month ({existingBlocks.length})</span>
          </div>

          {existingBlocks.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No doctor break or block records found.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {existingBlocks.map((blk) => (
                <div
                  key={blk.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-xs hover:border-slate-300"
                >
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>{blk.doctorName}</span>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {blk.reason.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>📅 {blk.startDate}</span>
                      <span>
                        <Clock className="inline h-3 w-3 mr-0.5" />
                        {blk.startTime ? `${blk.startTime} - ${blk.endTime}` : "Full Day"}
                      </span>
                      {blk.notes && <span className="italic text-slate-400">• {blk.notes}</span>}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(blk.id)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 w-7 p-0"
                    title="Remove Block"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
