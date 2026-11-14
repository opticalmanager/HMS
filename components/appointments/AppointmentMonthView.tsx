"use client";

import * as React from "react";
import type { Appointment } from "@/types/hms";
import { Badge } from "@/components/ui/badge";

interface AppointmentMonthViewProps {
  year: number;
  month: number;
  selectedDate: string;
  appointments: Appointment[];
  selectedDoctorId?: string;
  onSelectDate: (dateStr: string) => void;
  onSelectAppointment: (apt: Appointment) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AppointmentMonthView({
  year,
  month,
  selectedDate,
  appointments,
  selectedDoctorId = "all",
  onSelectDate,
  onSelectAppointment,
}: AppointmentMonthViewProps) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNumber = i - firstDayIndex + 1;
    const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
    const dateStr = isCurrentMonth
      ? `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`
      : "";
    return { dayNumber, isCurrentMonth, dateStr };
  });

  return (
    <div className="flex-1 flex flex-col bg-white border-t border-slate-200 overflow-hidden select-none">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-700 py-2">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200 overflow-y-auto">
        {cells.map((cell, idx) => {
          if (!cell.isCurrentMonth) {
            return <div key={idx} className="bg-slate-50/30 p-2 min-h-[90px]" />;
          }

          const dayApts = appointments.filter(
            (a) =>
              a.appointmentDate === cell.dateStr &&
              (selectedDoctorId === "all" || a.doctorId === selectedDoctorId)
          );
          const isSelected = cell.dateStr === selectedDate;

          return (
            <div
              key={cell.dateStr}
              onClick={() => onSelectDate(cell.dateStr)}
              className={`p-2 min-h-[95px] flex flex-col justify-between cursor-pointer transition-colors ${
                isSelected ? "bg-blue-50/50 ring-2 ring-inset ring-[#2563EB]" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isSelected ? "text-[#2563EB]" : "text-slate-700"}`}>
                  {cell.dayNumber}
                </span>
                {dayApts.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] py-0 px-1">
                    {dayApts.length} appts
                  </Badge>
                )}
              </div>

              <div className="space-y-1 my-1 overflow-hidden">
                {dayApts.slice(0, 2).map((a) => (
                  <div
                    key={a.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAppointment(a);
                    }}
                    className="p-1 rounded bg-slate-100 text-[10px] truncate hover:bg-slate-200"
                  >
                    <span className="font-semibold text-slate-900">#{a.tokenNumber}</span> {a.patientName}
                  </div>
                ))}
                {dayApts.length > 2 && (
                  <span className="text-[9px] text-blue-600 font-semibold block">
                    +{dayApts.length - 2} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
