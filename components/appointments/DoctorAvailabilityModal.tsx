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
import type { DoctorWeeklySchedule } from "@/types/hms";
import { CalendarCheck, Clock, Check, Save } from "lucide-react";

interface DoctorAvailabilityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DOCTORS = [
  { id: "doc-1", name: "Dr. Gaurav Kumar", dept: "Cardiology" },
  { id: "doc-2", name: "Dr. Ananya Sharma", dept: "General Medicine" },
  { id: "doc-3", name: "Dr. Rajesh Varma", dept: "Orthopedics" },
];

const DAYS = [
  { index: 1, name: "Monday" },
  { index: 2, name: "Tuesday" },
  { index: 3, name: "Wednesday" },
  { index: 4, name: "Thursday" },
  { index: 5, name: "Friday" },
  { index: 6, name: "Saturday" },
  { index: 0, name: "Sunday" },
];

export function DoctorAvailabilityModal({
  open,
  onOpenChange,
}: DoctorAvailabilityModalProps) {
  const store = useClinicalStore();

  const [selectedDoctorId, setSelectedDoctorId] = React.useState<string>("doc-1");
  const [schedule, setSchedule] = React.useState<DoctorWeeklySchedule | null>(null);

  // Load active schedule whenever doctor changes or modal opens
  React.useEffect(() => {
    if (!open) return;
    const existing = store.doctorAvailabilities?.[selectedDoctorId];
    if (existing) {
      setSchedule(JSON.parse(JSON.stringify(existing)));
    } else {
      const doc = DOCTORS.find((d) => d.id === selectedDoctorId) || DOCTORS[0];
      setSchedule({
        doctorId: doc.id,
        doctorName: doc.name,
        department: doc.dept,
        slotDurationMinutes: 15,
        maxOverbookingSlots: 5,
        days: {
          0: { isActive: false, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
          1: { isActive: true, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
          2: { isActive: true, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
          3: { isActive: true, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
          4: { isActive: true, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
          5: { isActive: true, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
          6: { isActive: true, morningStart: "09:00", morningEnd: "14:00", eveningStart: "16:00", eveningEnd: "18:00" },
        },
      });
    }
  }, [open, selectedDoctorId, store.doctorAvailabilities]);

  if (!schedule) return null;

  const handleToggleDay = (dayIndex: number) => {
    setSchedule((prev) => {
      if (!prev) return prev;
      const current = prev.days[dayIndex];
      return {
        ...prev,
        days: {
          ...prev.days,
          [dayIndex]: {
            ...current,
            isActive: !current.isActive,
          },
        },
      };
    });
  };

  const handleTimeChange = (
    dayIndex: number,
    field: "morningStart" | "morningEnd" | "eveningStart" | "eveningEnd",
    value: string
  ) => {
    setSchedule((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: {
          ...prev.days,
          [dayIndex]: {
            ...prev.days[dayIndex],
            [field]: value,
          },
        },
      };
    });
  };

  const handleSave = () => {
    if (!schedule) return;
    clinicalStore.updateDoctorAvailability(schedule);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Doctor Availability &amp; Slot Matrix
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Configure weekly working days, morning/evening shifts, and consultation slot intervals
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Doctor Selector + Slot Duration Ribbon */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Doctor</label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800"
              >
                {DOCTORS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.dept})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Slot Interval Duration</label>
              <select
                value={schedule.slotDurationMinutes}
                onChange={(e) =>
                  setSchedule((prev) => prev && { ...prev, slotDurationMinutes: Number(e.target.value) })
                }
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes (Standard)</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes (Comprehensive)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Daily Overbooking</label>
              <Input
                type="number"
                min={0}
                max={20}
                value={schedule.maxOverbookingSlots}
                onChange={(e) =>
                  setSchedule((prev) => prev && { ...prev, maxOverbookingSlots: Number(e.target.value) })
                }
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Weekly Days Schedule Matrix */}
          <div>
            <div className="text-xs font-bold text-slate-900 mb-2">Weekly Working Shifts (Mon - Sun)</div>
            <div className="space-y-2">
              {DAYS.map((d) => {
                const dayConfig = schedule.days[d.index] || {
                  isActive: true,
                  morningStart: "09:00",
                  morningEnd: "13:00",
                  eveningStart: "16:00",
                  eveningEnd: "20:00",
                };

                return (
                  <div
                    key={d.index}
                    className={`p-3 rounded-lg border text-xs transition-colors ${
                      dayConfig.isActive
                        ? "bg-white border-slate-200 shadow-2xs"
                        : "bg-slate-50 border-slate-200/60 opacity-60"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-[120px]">
                        <input
                          type="checkbox"
                          id={`day-${d.index}`}
                          checked={dayConfig.isActive}
                          onChange={() => handleToggleDay(d.index)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <label
                          htmlFor={`day-${d.index}`}
                          className={`font-semibold cursor-pointer ${
                            dayConfig.isActive ? "text-slate-900" : "text-slate-400"
                          }`}
                        >
                          {d.name}
                        </label>
                      </div>

                      {dayConfig.isActive ? (
                        <div className="flex flex-wrap items-center gap-4 flex-1">
                          {/* Morning Shift */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-500">Morning:</span>
                            <Input
                              type="time"
                              value={dayConfig.morningStart}
                              onChange={(e) => handleTimeChange(d.index, "morningStart", e.target.value)}
                              className="h-7 w-24 text-[11px] px-1.5"
                            />
                            <span className="text-slate-400">to</span>
                            <Input
                              type="time"
                              value={dayConfig.morningEnd}
                              onChange={(e) => handleTimeChange(d.index, "morningEnd", e.target.value)}
                              className="h-7 w-24 text-[11px] px-1.5"
                            />
                          </div>

                          {/* Evening Shift */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-500">Evening:</span>
                            <Input
                              type="time"
                              value={dayConfig.eveningStart}
                              onChange={(e) => handleTimeChange(d.index, "eveningStart", e.target.value)}
                              className="h-7 w-24 text-[11px] px-1.5"
                            />
                            <span className="text-slate-400">to</span>
                            <Input
                              type="time"
                              value={dayConfig.eveningEnd}
                              onChange={(e) => handleTimeChange(d.index, "eveningEnd", e.target.value)}
                              className="h-7 w-24 text-[11px] px-1.5"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] font-semibold text-slate-400 italic">
                          Off Duty / Clinic Closed
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-slate-200 mt-4">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            className="bg-[#2563EB] hover:bg-blue-700 text-xs gap-1.5"
          >
            <Save className="h-3.5 w-3.5" /> Save Weekly Availability
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
