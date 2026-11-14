"use client";

import * as React from "react";
import type { Appointment } from "@/types/hms";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Stethoscope } from "lucide-react";

interface AppointmentMatrixGridProps {
  year: number;
  month: number; // 0 = Jan, 10 = Nov
  selectedDate: string; // "YYYY-MM-DD"
  appointments: Appointment[];
  selectedDoctorId?: string;
  onSelectDate: (dateStr: string) => void;
  onSelectAppointment?: (apt: Appointment) => void;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function AppointmentMatrixGrid({
  year,
  month,
  selectedDate,
  appointments,
  selectedDoctorId = "all",
  onSelectDate,
  onSelectAppointment,
}: AppointmentMatrixGridProps) {
  // Compute days in month and starting day of week
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday

  // Group appointments by date string
  const appointmentsByDate = React.useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      if (selectedDoctorId === "all" || a.doctorId === selectedDoctorId) {
        if (!map[a.appointmentDate]) {
          map[a.appointmentDate] = [];
        }
        map[a.appointmentDate].push(a);
      }
    }
    return map;
  }, [appointments, selectedDoctorId]);

  // Create grid cells (leading empty days + month days)
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
      {/* Weekday Header Columns */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-xs font-semibold text-slate-700 py-2">
        {WEEKDAYS.map((w) => (
          <div key={w} className="tracking-wide">
            {w}
          </div>
        ))}
      </div>

      {/* Matrix Cells Grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200 overflow-y-auto">
        {cells.map((cell, idx) => {
          if (!cell.isCurrentMonth) {
            return (
              <div key={idx} className="bg-slate-50/30 p-2 min-h-[110px] text-slate-300">
                <span className="text-xs font-medium"></span>
              </div>
            );
          }

          const dayApts = appointmentsByDate[cell.dateStr] || [];
          const isSelected = cell.dateStr === selectedDate;
          const isToday = cell.dateStr === new Date().toISOString().split("T")[0];

          // Compute count breakdown by status
          const totalCount = dayApts.length;
          const scheduledCount = dayApts.filter((a) => a.status === "scheduled").length;
          const waitingCount = dayApts.filter((a) => a.status === "arrived").length;
          const engagedCount = dayApts.filter((a) => a.status === "in_consultation").length;
          const completedCount = dayApts.filter((a) => a.status === "completed").length;

          return (
            <div
              key={cell.dateStr}
              onClick={() => onSelectDate(cell.dateStr)}
              className={`p-2 min-h-[115px] flex flex-col justify-between cursor-pointer transition-colors relative group ${
                isSelected
                  ? "bg-blue-50/40 ring-2 ring-inset ring-[#2563EB]"
                  : "bg-white hover:bg-slate-50/80"
              }`}
            >
              {/* Top Cell Header: Date Number + Circular Status Breakdown Badges */}
              <div className="flex items-start justify-between">
                {/* Circular Badges Breakdown (matching screenshot layout) */}
                <div className="flex flex-wrap items-center gap-1">
                  {/* Total / Brown Pill */}
                  {totalCount > 0 && (
                    <span
                      className="w-5 h-5 rounded-full bg-amber-800 text-white text-[10px] font-bold flex items-center justify-center shadow-2xs"
                      title={`${totalCount} Total Bookings`}
                    >
                      {totalCount}
                    </span>
                  )}

                  {/* Scheduled / Red Pill */}
                  {scheduledCount > 0 && (
                    <span
                      className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-2xs"
                      title={`${scheduledCount} Scheduled / Pending`}
                    >
                      {scheduledCount}
                    </span>
                  )}

                  {/* Waiting / Amber Pill */}
                  {waitingCount > 0 && (
                    <span
                      className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shadow-2xs"
                      title={`${waitingCount} Arrived in Waiting`}
                    >
                      {waitingCount}
                    </span>
                  )}

                  {/* Engaged / Blue Pill */}
                  {engagedCount > 0 && (
                    <span
                      className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shadow-2xs"
                      title={`${engagedCount} In Consultation`}
                    >
                      {engagedCount}
                    </span>
                  )}

                  {/* Completed / Green Pill */}
                  {completedCount > 0 && (
                    <span
                      className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shadow-2xs"
                      title={`${completedCount} Completed`}
                    >
                      {completedCount}
                    </span>
                  )}
                </div>

                {/* Day Number */}
                <span
                  className={`text-sm font-semibold px-1 rounded ${
                    isToday
                      ? "text-blue-600 font-extrabold"
                      : isSelected
                      ? "text-[#2563EB] font-bold"
                      : "text-slate-500"
                  }`}
                >
                  {cell.dayNumber}
                </span>
              </div>

              {/* Appointment Strips Container (matching screenshot strip layout) */}
              <div className="space-y-1 my-1 flex-1 overflow-hidden">
                {dayApts.slice(0, 3).map((apt) => {
                  const tokenLabel = apt.tokenNumber ? `V${apt.tokenNumber}` : `APT`;
                  const sourceTag = apt.source ? apt.source.toUpperCase() : "SYS";

                  return (
                    <div
                      key={apt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectAppointment) onSelectAppointment(apt);
                      }}
                      className="group/strip flex items-center justify-between px-1.5 py-1 bg-slate-50 hover:bg-slate-100 rounded border-l-4 border-amber-800 text-[11px] font-medium text-slate-800 shadow-2xs transition-all truncate"
                    >
                      <div className="truncate flex items-center gap-1">
                        <span className="font-bold text-slate-900">({tokenLabel})</span>
                        <span className="truncate">{apt.patientName}</span>
                        {apt.chiefComplaints && (
                          <span className="text-slate-500 text-[10px] truncate hidden xl:inline">
                            [{apt.chiefComplaints}]
                          </span>
                        )}
                      </div>

                      <span className="font-mono text-[9px] font-bold bg-white px-1 rounded border border-slate-200 text-blue-600 ml-1">
                        {sourceTag}
                      </span>
                    </div>
                  );
                })}

                {dayApts.length > 3 && (
                  <div className="text-[10px] font-semibold text-[#2563EB] hover:underline pt-0.5">
                    +{dayApts.length - 3} more...
                  </div>
                )}
              </div>

              {/* Bottom indicators */}
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                {isToday && (
                  <span className="text-[#2563EB] font-bold uppercase tracking-wider text-[9px]">
                    Today
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
