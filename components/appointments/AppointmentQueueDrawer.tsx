"use client";

import * as React from "react";
import {
  RotateCcw,
  SlidersHorizontal,
  Search,
  X,
  Clock,
  Phone,
  User,
  CheckCircle2,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CalendarPlus,
  Send,
  Receipt,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clinicalStore } from "@/services/clinical-store";
import type { Appointment, AppointmentStatus } from "@/types/hms";

interface AppointmentQueueDrawerProps {
  selectedDate: string;
  appointments: Appointment[];
  selectedDoctorId?: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenBooking: () => void;
}

export function AppointmentQueueDrawer({
  selectedDate,
  appointments,
  selectedDoctorId = "all",
  collapsed,
  onToggleCollapse,
  onOpenBooking,
}: AppointmentQueueDrawerProps) {
  const [activeTab, setActiveTab] = React.useState<"appointments" | "followups">("appointments");
  const [search, setSearch] = React.useState("");
  const [activeStatusFilter, setActiveStatusFilter] = React.useState<string>("all");
  const [filterMenuOpen, setFilterMenuOpen] = React.useState(false);
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");

  // Filter appointments for the selected date
  const dateAppointments = React.useMemo(() => {
    return appointments.filter((a) => {
      const matchesDate = a.appointmentDate === selectedDate;
      const matchesDoctor = selectedDoctorId === "all" || a.doctorId === selectedDoctorId;
      const matchesTab =
        activeTab === "appointments"
          ? a.appointmentType !== "follow_up" || true
          : a.appointmentType === "follow_up";

      return matchesDate && matchesDoctor && matchesTab;
    });
  }, [appointments, selectedDate, selectedDoctorId, activeTab]);

  // Compute live counter badge numbers
  const counts = React.useMemo(() => {
    const total = dateAppointments.length;
    const waiting = dateAppointments.filter((a) => a.status === "arrived").length;
    const engaged = dateAppointments.filter((a) => a.status === "in_consultation").length;
    const done = dateAppointments.filter((a) => a.status === "completed").length;
    return { total, waiting, engaged, done };
  }, [dateAppointments]);

  // Apply search and status filter to the visible list
  const filteredList = React.useMemo(() => {
    return dateAppointments.filter((a) => {
      const matchesStatus =
        activeStatusFilter === "all" || a.status === activeStatusFilter;

      const matchesPriority =
        priorityFilter === "all" || a.priority === priorityFilter;

      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        a.patientName?.toLowerCase().includes(q) ||
        a.patientPhone?.includes(q) ||
        a.patientUhid?.toLowerCase().includes(q) ||
        a.doctorName?.toLowerCase().includes(q) ||
        String(a.tokenNumber).includes(q);

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [dateAppointments, activeStatusFilter, priorityFilter, search]);

  const handleStatusChange = (aptId: string, newStatus: AppointmentStatus) => {
    clinicalStore.updateAppointmentStatus(aptId, newStatus);
  };

  if (collapsed) {
    return (
      <div className="w-10 bg-white border-r border-slate-200 flex flex-col items-center py-3 select-none">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 mb-4"
          title="Expand Queue Drawer"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div
          className="text-[11px] font-bold text-slate-500 tracking-wider uppercase rotate-90 whitespace-nowrap mt-12 cursor-pointer"
          onClick={onToggleCollapse}
        >
          Appointment Queue ({counts.total})
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden select-none">
      {/* Drawer Top Header: Tabs & Quick Action Controls */}
      <div className="p-3 border-b border-slate-200">
        <div className="flex items-center justify-between">
          {/* Appointment vs Follow Up Tabs */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("appointments")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeTab === "appointments"
                  ? "bg-blue-50 text-[#2563EB]"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Appointment
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("followups")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeTab === "followups"
                  ? "bg-blue-50 text-[#2563EB]"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Follow up
            </button>
          </div>

          {/* Action Icons: Refresh, Filter, Collapse */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSearch("")}
              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
              title="Refresh Roster"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>

            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFilterMenuOpen((v) => !v)}
                className={`h-7 w-7 p-0 ${
                  priorityFilter !== "all" ? "text-[#2563EB] bg-blue-50" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Filter Priority"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </Button>

              {filterMenuOpen && (
                <div className="absolute right-0 top-8 z-30 w-44 bg-white rounded-lg shadow-lg border border-slate-200 p-2 text-xs">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Priority Filter
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPriorityFilter("all");
                      setFilterMenuOpen(false);
                    }}
                    className="w-full text-left px-2 py-1 rounded hover:bg-slate-50 font-medium"
                  >
                    All Priorities
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPriorityFilter("normal");
                      setFilterMenuOpen(false);
                    }}
                    className="w-full text-left px-2 py-1 rounded hover:bg-slate-50 text-slate-700"
                  >
                    Normal Routine
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPriorityFilter("urgent");
                      setFilterMenuOpen(false);
                    }}
                    className="w-full text-left px-2 py-1 rounded hover:bg-slate-50 text-amber-700"
                  >
                    Urgent Priority
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPriorityFilter("emergency");
                      setFilterMenuOpen(false);
                    }}
                    className="w-full text-left px-2 py-1 rounded hover:bg-slate-50 text-rose-700"
                  >
                    Emergency Priority
                  </button>
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-900"
              title="Collapse Drawer"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status Counter Pills Row */}
        <div className="grid grid-cols-4 gap-1.5 mt-2.5">
          {/* Today / All */}
          <button
            type="button"
            onClick={() => setActiveStatusFilter("all")}
            className={`p-1.5 rounded-lg border text-center transition-all ${
              activeStatusFilter === "all"
                ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span className="block text-[10px] uppercase font-semibold">Today</span>
            <span className="block text-sm font-extrabold leading-tight">{counts.total}</span>
          </button>

          {/* Waiting */}
          <button
            type="button"
            onClick={() => setActiveStatusFilter("arrived")}
            className={`p-1.5 rounded-lg border text-center transition-all ${
              activeStatusFilter === "arrived"
                ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
            }`}
          >
            <span className="block text-[10px] uppercase font-semibold">Waiting</span>
            <span className="block text-sm font-extrabold leading-tight">{counts.waiting}</span>
          </button>

          {/* Engaged */}
          <button
            type="button"
            onClick={() => setActiveStatusFilter("in_consultation")}
            className={`p-1.5 rounded-lg border text-center transition-all ${
              activeStatusFilter === "in_consultation"
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
            }`}
          >
            <span className="block text-[10px] uppercase font-semibold">Engaged</span>
            <span className="block text-sm font-extrabold leading-tight">{counts.engaged}</span>
          </button>

          {/* Done */}
          <button
            type="button"
            onClick={() => setActiveStatusFilter("completed")}
            className={`p-1.5 rounded-lg border text-center transition-all ${
              activeStatusFilter === "completed"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            <span className="block text-[10px] uppercase font-semibold">Done</span>
            <span className="block text-sm font-extrabold leading-tight">{counts.done}</span>
          </button>
        </div>

        {/* Live Search Input */}
        <div className="relative mt-2.5">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Appointment..."
            className="pl-8 pr-7 h-8 text-xs bg-slate-50 border-slate-200"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Appointment Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredList.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-2 text-slate-300">
              <Clock className="h-6 w-6" />
            </div>
            <div className="text-xs font-bold text-slate-700">No appointment available.</div>
            <p className="text-[11px] text-slate-400 mt-0.5">There is no data available to display.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenBooking}
              className="mt-3 text-xs gap-1 border-blue-200 text-[#2563EB] hover:bg-blue-50"
            >
              <CalendarPlus className="h-3 w-3" /> Book First Appointment
            </Button>
          </div>
        ) : (
          filteredList.map((apt) => (
            <div
              key={apt.id}
              className={`p-3 rounded-xl border text-xs transition-all relative ${
                apt.status === "in_consultation"
                  ? "bg-blue-50/50 border-blue-200 shadow-xs"
                  : apt.status === "arrived"
                  ? "bg-amber-50/50 border-amber-200 shadow-xs"
                  : apt.status === "completed"
                  ? "bg-emerald-50/40 border-emerald-200"
                  : "bg-white border-slate-200 shadow-2xs hover:border-slate-300"
              }`}
            >
              {/* Card Top: Token # & Time */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-xs text-[#2563EB] bg-blue-100/70 px-1.5 py-0.5 rounded">
                    #{apt.tokenNumber}
                  </span>
                  <Badge
                    variant={
                      apt.status === "in_consultation"
                        ? "info"
                        : apt.status === "arrived"
                        ? "warning"
                        : apt.status === "completed"
                        ? "success"
                        : "outline"
                    }
                    className="text-[10px] capitalize py-0"
                  >
                    {apt.status.replace("_", " ")}
                  </Badge>
                </div>

                <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  {apt.timeSlot}
                </div>
              </div>

              {/* Patient Info */}
              <div className="font-bold text-slate-900 text-xs">
                {apt.patientName}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {apt.patientUhid} • {apt.patientPhone}
              </div>

              {/* Doctor Info */}
              <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1">
                <Stethoscope className="h-3 w-3 text-slate-400" />
                <span className="font-medium">{apt.doctorName}</span>
                <span className="text-slate-400">({apt.department})</span>
              </div>

              {/* Complaint snippet if any */}
              {apt.chiefComplaints && (
                <div className="text-[10px] text-slate-500 italic mt-1 line-clamp-1 bg-slate-50 px-1.5 py-0.5 rounded">
                  {apt.chiefComplaints}
                </div>
              )}

              {/* 1-Click Action Buttons */}
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200/80">
                {apt.status === "scheduled" && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleStatusChange(apt.id, "arrived")}
                    className="h-6 text-[10px] bg-amber-600 hover:bg-amber-700 text-white px-2 rounded"
                  >
                    Check In (Arrived)
                  </Button>
                )}

                {apt.status === "arrived" && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleStatusChange(apt.id, "in_consultation")}
                    className="h-6 text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2 rounded"
                  >
                    Call to Cabin
                  </Button>
                )}

                {apt.status === "in_consultation" && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleStatusChange(apt.id, "completed")}
                    className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 rounded"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                  </Button>
                )}

                {apt.status === "completed" && (
                  <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Consultation Done
                  </span>
                )}

                {/* Secondary Actions */}
                <div className="flex items-center gap-1">
                  <a
                    href={`/billing?patientId=${apt.patientId}`}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                    title="Generate Bill"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={`/whatsapp?phone=${apt.patientPhone}`}
                    className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                    title="Send WhatsApp Alert"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
