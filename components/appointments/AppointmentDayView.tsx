"use client";

import * as React from "react";
import type { Appointment, DoctorBlock } from "@/types/hms";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, Coffee, AlertCircle } from "lucide-react";
import { useClinicalStore } from "@/services/clinical-store";

interface AppointmentDayViewProps {
  selectedDate: string;
  appointments: Appointment[];
  doctorBlocks: DoctorBlock[];
  selectedDoctorId?: string;
  onSlotClick: (doctorId: string, doctorName: string, timeSlot: string) => void;
  onSelectAppointment: (apt: Appointment) => void;
}

const HOURS = [
  "08:00 AM",
  "08:30 AM",
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
  "06:00 PM",
  "06:30 PM",
  "07:00 PM",
  "07:30 PM",
];

export function AppointmentDayView({
  selectedDate,
  appointments,
  doctorBlocks,
  selectedDoctorId = "all",
  onSlotClick,
  onSelectAppointment,
}: AppointmentDayViewProps) {
  const store = useClinicalStore();

  const doctorsList = React.useMemo(() => {
    const docs = store.staff.filter(
      (s) =>
        s.role === "doctor" ||
        s.role.includes("doctor") ||
        s.role.includes("consultant") ||
        s.role.includes("specialist")
    );
    if (docs.length === 0) {
      return [{ id: "doc-gen", name: "General Physician", dept: "General OPD" }];
    }
    return docs.map((d) => ({
      id: d.id,
      name: d.name,
      dept: d.department || "General",
    }));
  }, [store.staff]);

  const visibleDoctors = React.useMemo(() => {
    if (selectedDoctorId === "all") return doctorsList;
    return doctorsList.filter((d) => d.id === selectedDoctorId);
  }, [selectedDoctorId, doctorsList]);

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden border-t border-slate-200 select-none">
      {/* Doctor Columns Header */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <div className="w-24 border-r border-slate-200 p-2 text-center text-xs font-semibold text-slate-500">
          Time Slot
        </div>
        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${visibleDoctors.length}, minmax(0, 1fr))` }}>
          {visibleDoctors.map((doc) => (
            <div key={doc.id} className="p-2.5 text-center border-r border-slate-200 last:border-r-0">
              <div className="font-bold text-xs text-slate-900">{doc.name}</div>
              <div className="text-[10px] text-slate-500 font-medium">{doc.dept}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Hourly Grid Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {HOURS.map((slotTime) => (
          <div key={slotTime} className="flex min-h-[50px] group">
            {/* Time Axis Column */}
            <div className="w-24 border-r border-slate-200 p-2 text-[11px] font-mono text-slate-400 bg-slate-50/50 flex items-center justify-center">
              {slotTime}
            </div>

            {/* Doctor Columns Grid */}
            <div
              className="flex-1 grid divide-x divide-slate-200"
              style={{ gridTemplateColumns: `repeat(${visibleDoctors.length}, minmax(0, 1fr))` }}
            >
              {visibleDoctors.map((doc) => {
                // Check if slot has an appointment
                const apt = appointments.find(
                  (a) =>
                    a.appointmentDate === selectedDate &&
                    (a.doctorId === doc.id ||
                      a.doctorName?.toLowerCase() === doc.name.toLowerCase() ||
                      (doc.id === "usr-1" && a.doctorId === "doc-1") ||
                      (doc.id === "usr-2" && a.doctorId === "doc-2") ||
                      (doc.id === "usr-3" && a.doctorId === "doc-3")) &&
                    a.timeSlot === slotTime
                );

                // Check if slot is blocked (e.g. Lunch break or OT)
                const block = doctorBlocks.find(
                  (b) =>
                    (b.doctorId === "all" ||
                      b.doctorId === doc.id ||
                      b.doctorName?.toLowerCase() === doc.name.toLowerCase() ||
                      (doc.id === "usr-1" && b.doctorId === "doc-1") ||
                      (doc.id === "usr-2" && b.doctorId === "doc-2") ||
                      (doc.id === "usr-3" && b.doctorId === "doc-3")) &&
                    selectedDate >= b.startDate &&
                    selectedDate <= b.endDate &&
                    (!b.startTime || (slotTime >= b.startTime && slotTime <= (b.endTime || "")))
                );

                if (block) {
                  return (
                    <div
                      key={doc.id}
                      className="p-1.5 bg-amber-50/70 border-l-2 border-amber-500 flex items-center justify-between text-xs text-amber-800"
                    >
                      <div className="flex items-center gap-1.5">
                        <Coffee className="h-3.5 w-3.5 text-amber-600" />
                        <span className="font-semibold capitalize text-[11px]">
                          {block.reason.replace("_", " ")} Block
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-700 bg-white">
                        Unavailable
                      </Badge>
                    </div>
                  );
                }

                if (apt) {
                  return (
                    <div
                      key={doc.id}
                      onClick={() => onSelectAppointment(apt)}
                      className={`p-1.5 m-1 rounded-lg border text-xs cursor-pointer transition-all ${
                        apt.status === "in_consultation"
                          ? "bg-blue-50 border-blue-300 text-blue-900 shadow-xs"
                          : apt.status === "arrived"
                          ? "bg-amber-50 border-amber-300 text-amber-900 shadow-xs"
                          : apt.status === "completed"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                          : "bg-white border-slate-200 hover:border-blue-400 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">#{apt.tokenNumber} {apt.patientName}</span>
                        <Badge variant="outline" className="text-[9px] py-0 capitalize">
                          {apt.status}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {apt.patientUhid} • {apt.patientPhone}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={doc.id}
                    onClick={() => onSlotClick(doc.id, doc.name, slotTime)}
                    className="p-1 h-full hover:bg-blue-50/40 cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <span className="text-[10px] text-[#2563EB] font-semibold flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Book Slot
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
