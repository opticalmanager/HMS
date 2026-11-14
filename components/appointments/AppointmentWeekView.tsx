"use client";

import * as React from "react";
import type { Appointment, DoctorBlock } from "@/types/hms";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface AppointmentWeekViewProps {
  selectedDate: string; // "YYYY-MM-DD"
  appointments: Appointment[];
  doctorBlocks: DoctorBlock[];
  selectedDoctorId?: string;
  onSelectDate: (dateStr: string) => void;
  onSelectAppointment: (apt: Appointment) => void;
}

const HOURS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
  "07:00 PM",
];

export function AppointmentWeekView({
  selectedDate,
  appointments,
  selectedDoctorId = "all",
  onSelectDate,
  onSelectAppointment,
}: AppointmentWeekViewProps) {
  // Compute start of current week (Sunday)
  const current = new Date(selectedDate);
  const dayOfWeek = current.getDay(); // 0 = Sunday
  const startOfWeek = new Date(current);
  startOfWeek.setDate(current.getDate() - dayOfWeek);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayNum = d.getDate();
    return { dateStr, dayName, dayNum };
  });

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden border-t border-slate-200 select-none">
      {/* 7-Day Header */}
      <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50">
        <div className="p-2 border-r border-slate-200 text-center text-xs font-semibold text-slate-500">
          Time
        </div>
        {weekDays.map((d) => {
          const isSelected = d.dateStr === selectedDate;
          return (
            <div
              key={d.dateStr}
              onClick={() => onSelectDate(d.dateStr)}
              className={`p-2 text-center border-r border-slate-200 cursor-pointer transition-colors ${
                isSelected ? "bg-blue-50/70 border-b-2 border-b-[#2563EB]" : "hover:bg-slate-100"
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-500">{d.dayName}</div>
              <div className={`text-sm font-bold ${isSelected ? "text-[#2563EB]" : "text-slate-900"}`}>
                {d.dayNum}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hourly Grid Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {HOURS.map((h) => (
          <div key={h} className="grid grid-cols-8 min-h-[55px]">
            <div className="border-r border-slate-200 p-2 text-[11px] font-mono text-slate-400 bg-slate-50/40 flex items-center justify-center">
              {h}
            </div>

            {weekDays.map((d) => {
              const hourPrefix = h.split(":")[0];
              const hourPeriod = h.split(" ")[1];

              const apts = appointments.filter((a) => {
                const matchesDate = a.appointmentDate === d.dateStr;
                const matchesDoctor = selectedDoctorId === "all" || a.doctorId === selectedDoctorId;
                const matchesHour = a.timeSlot?.includes(hourPeriod) && a.timeSlot?.startsWith(hourPrefix);
                return matchesDate && matchesDoctor && matchesHour;
              });

              return (
                <div
                  key={d.dateStr}
                  className="p-1 border-r border-slate-200 space-y-1 hover:bg-slate-50/50"
                >
                  {apts.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => onSelectAppointment(a)}
                      className="p-1 rounded bg-blue-50/70 border border-blue-200 text-[10px] cursor-pointer hover:bg-blue-100/70 truncate"
                    >
                      <span className="font-bold text-blue-900">#{a.tokenNumber}</span> {a.patientName}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
