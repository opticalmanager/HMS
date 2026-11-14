"use client";

import * as React from "react";
import {
  RotateCcw,
  Search,
  X,
  Phone,
  Video,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Edit3,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Appointment } from "@/types/hms";

interface OpdPatientQueueDrawerProps {
  queue: Appointment[];
  activeAppointmentId?: string;
  onSelectAppointment: (appointment: Appointment) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function OpdPatientQueueDrawer({
  queue,
  activeAppointmentId,
  onSelectAppointment,
  collapsed,
  onToggleCollapse,
  selectedDate,
  onDateChange,
}: OpdPatientQueueDrawerProps) {
  const [consultMode, setConsultMode] = React.useState<"walk_in" | "teleconsult">("walk_in");
  const [queueFilter, setQueueFilter] = React.useState<"today" | "all">("all");
  const [search, setSearch] = React.useState("");
  const [clinicName, setClinicName] = React.useState("Visual Eyez");

  // Filter & sort queue appointments (prioritize active OPD token series V189, V188, V187...)
  const filteredQueue = React.useMemo(() => {
    const list = queue.filter((a) => {
      // Mode filter
      if (consultMode === "teleconsult") {
        if (a.source !== "online") return false;
      }

      // Date / Triage filter
      if (queueFilter === "today") {
        const todayStr = new Date().toISOString().split("T")[0];
        if (a.appointmentDate !== todayStr && a.appointmentDate !== selectedDate) return false;
      }

      // Text search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = a.patientName?.toLowerCase().includes(q);
        const matchesPhone = a.patientPhone?.includes(q);
        const matchesUhid = a.patientUhid?.toLowerCase().includes(q);
        const matchesToken = String(a.tokenNumber).includes(q);
        return matchesName || matchesPhone || matchesUhid || matchesToken;
      }

      return true;
    });

    return list.sort((a, b) => (b.tokenNumber || 0) - (a.tokenNumber || 0));
  }, [queue, consultMode, queueFilter, search, selectedDate]);

  // Today count
  const todayCount = React.useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return queue.filter((a) => a.appointmentDate === todayStr || a.appointmentDate === selectedDate).length;
  }, [queue, selectedDate]);

  if (collapsed) {
    return (
      <div className="w-10 bg-white border border-slate-200 rounded-lg shadow-2xs flex flex-col items-center py-3 select-none h-full shrink-0">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          title="Expand patient queue"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="mt-8 [writing-mode:vertical-rl] text-xs font-bold text-slate-600 tracking-wider flex items-center gap-2">
          <span>PATIENT QUEUE</span>
          <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-[#1976D2] text-[10px] font-mono">
            {filteredQueue.length}
          </span>
        </div>
      </div>
    );
  }

  return (
    <aside className="w-[260px] xl:w-[290px] bg-white border border-slate-200 rounded-lg shadow-2xs flex flex-col h-full shrink-0 overflow-hidden text-xs">
      {/* 1. Mode Switcher: Walk-In vs Teleconsult */}
      <div className="p-2 pb-1.5 border-b border-slate-100 flex items-center gap-1 bg-slate-50/50 shrink-0">
        <button
          onClick={() => setConsultMode("walk_in")}
          className={`flex-1 py-1 px-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            consultMode === "walk_in"
              ? "bg-[#1976D2] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          <span>Walk-In</span>
          <RotateCcw className="h-3 w-3 opacity-80 ml-0.5" />
        </button>

        <button
          onClick={() => setConsultMode("teleconsult")}
          className={`flex-1 py-1 px-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            consultMode === "teleconsult"
              ? "bg-[#1976D2] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Video className="h-3 w-3" />
          <span>Teleconsult</span>
        </button>

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer shrink-0"
          title="Collapse drawer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Clinic Selector & Calendar Date Trigger */}
      <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center gap-1.5 shrink-0">
        <div className="relative flex-1">
          <select
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            className="w-full h-7.5 appearance-none rounded-md border border-slate-200 bg-white px-2.5 pr-6 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="Visual Eyez">Visual Eyez (Lajpat Nagar)</option>
            <option value="Apex Cardiology">Apex Cardiology Center</option>
            <option value="Orthopedic Specialty">Orthopedic Specialty Wing</option>
          </select>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
        </div>

        <div className="relative shrink-0">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            title="Select date for queue"
          />
          <button
            type="button"
            className="h-7.5 w-7.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors pointer-events-none"
          >
            <Calendar className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Queue Tabs: Today (N) vs All */}
      <div className="px-2.5 py-1.5 flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => setQueueFilter("today")}
          className={`flex-1 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
            queueFilter === "today"
              ? "border-[#1976D2] bg-blue-50 text-[#1976D2]"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Today ({todayCount})
        </button>
        <button
          onClick={() => setQueueFilter("all")}
          className={`flex-1 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
            queueFilter === "all"
              ? "border-[#1976D2] bg-[#1976D2] text-white"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          All
        </button>
      </div>

      {/* 4. Live Search Input */}
      <div className="px-2.5 pb-1.5 shrink-0">
        <div className="relative">
          <Input
            placeholder="Search patient UHID, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7.5 pl-3 pr-7 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
          />
          {search ? (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            <Search className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
          )}
        </div>
      </div>

      {/* 5. Patient Queue Cards List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5 divide-y-0">
        {filteredQueue.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-1">
            <User className="h-7 w-7 mx-auto text-slate-300" />
            <div className="font-medium text-xs">No patients found</div>
            <div className="text-[10px]">No active tokens match your filter</div>
          </div>
        ) : (
          filteredQueue.map((apt) => {
            const isSelected = activeAppointmentId === apt.id;
            const ageDisplay = apt.patientId === "pat-vijay-189" ? "22Y" : apt.patientId === "pat-sreya-188" ? "24Y" : apt.patientId === "pat-vimal-187" ? "63Y" : apt.patientId === "pat-kushagra-186" ? "27Y" : apt.patientId === "pat-ashdik" ? "5Y" : "Adult";
            const genderDisplay = apt.patientId === "pat-sreya-188" ? "F" : "M";

            return (
              <div
                key={apt.id}
                onClick={() => onSelectAppointment(apt)}
                className={`p-2 rounded-lg border transition-all cursor-pointer relative group ${
                  isSelected
                    ? "border-blue-400 bg-blue-50/50 shadow-xs border-l-4 border-l-[#1976D2]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                }`}
              >
                {/* Top Row: Patient Name, Token */}
                <div className="flex items-center justify-between gap-1">
                  <div className="font-bold text-slate-900 text-xs truncate leading-tight uppercase flex-1">
                    {apt.patientName}
                  </div>
                  <span className="font-bold text-[#1976D2] font-mono text-[11px] shrink-0 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                    V{apt.tokenNumber}
                  </span>
                </div>

                {/* Middle Row: Gender & Age Tag + Status */}
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span className="font-medium text-slate-600">
                    {genderDisplay === "F" ? "Female" : "Male"} · {ageDisplay}
                  </span>
                  <span className="capitalize text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                    {apt.status === "in_consultation" ? "In Consult" : apt.status || "Confirmed"}
                  </span>
                </div>

                {/* Bottom Row: Phone number & Quick Note Edit Icon */}
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100/70">
                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                    <Phone className="h-2.5 w-2.5 text-slate-400" />
                    <span>{apt.patientPhone || "+91 9871900034"}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAppointment(apt);
                    }}
                    className="p-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-white transition-colors cursor-pointer"
                    title="Open Case Sheet"
                  >
                    <Edit3 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
