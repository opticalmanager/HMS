"use client";

import * as React from "react";
import { Plus, Search, Calendar, Filter, Zap, CheckCircle2, Stethoscope, Clock, Phone, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AppointmentBookingModal } from "@/components/appointments/AppointmentBookingModal";
import { useClinicalStore, clinicalStore } from "@/services/clinical-store";
import { formatCurrencyINR } from "@/utils/formatting";
import type { Appointment, AppointmentStatus } from "@/types/hms";

export default function AppointmentsPage() {
  const store = useClinicalStore();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [isQuickWalkIn, setIsQuickWalkIn] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [doctorFilter, setDoctorFilter] = React.useState<string>("all");

  const appointmentsList = store.appointments;

  const handleOpenBooking = (quick: boolean = false) => {
    setIsQuickWalkIn(quick);
    setModalOpen(true);
  };

  const handleStatusTransition = (aptId: string, newStatus: AppointmentStatus) => {
    clinicalStore.updateAppointmentStatus(aptId, newStatus);
  };

  const filtered = appointmentsList.filter((a) => {
    const matchesSearch =
      a.patientName?.toLowerCase().includes(search.toLowerCase()) ||
      a.patientPhone?.includes(search) ||
      a.patientUhid?.toLowerCase().includes(search.toLowerCase()) ||
      a.doctorName?.toLowerCase().includes(search.toLowerCase()) ||
      String(a.tokenNumber).includes(search);

    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const matchesDoctor = doctorFilter === "all" || a.doctorId === doctorFilter || a.doctorName?.includes(doctorFilter);

    return matchesSearch && matchesStatus && matchesDoctor;
  });

  const stats = {
    total: appointmentsList.length,
    scheduled: appointmentsList.filter((a) => a.status === "scheduled").length,
    arrived: appointmentsList.filter((a) => a.status === "arrived").length,
    inConsult: appointmentsList.filter((a) => a.status === "in_consultation").length,
    completed: appointmentsList.filter((a) => a.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appointments & Scheduling</h1>
          <p className="text-xs text-slate-500">Doctor slots, token queue allocation, and patient check-ins</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleOpenBooking(true)}
            variant="outline"
            className="text-xs gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" /> Walk-In Token
          </Button>

          <Button
            onClick={() => handleOpenBooking(false)}
            className="bg-[#2563EB] hover:bg-blue-700 text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Book New Slot
          </Button>
        </div>
      </div>

      {/* Metric Quick Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-slate-200">
          <CardContent className="p-3">
            <span className="text-[11px] font-semibold text-slate-500">Total Bookings</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-3">
            <span className="text-[11px] font-semibold text-slate-500">Scheduled Slots</span>
            <div className="text-xl font-bold text-blue-600 mt-0.5">{stats.scheduled}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-3">
            <span className="text-[11px] font-semibold text-slate-500">Arrived in Waiting</span>
            <div className="text-xl font-bold text-amber-600 mt-0.5">{stats.arrived}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-3">
            <span className="text-[11px] font-semibold text-slate-500">In Consultation</span>
            <div className="text-xl font-bold text-purple-600 mt-0.5">{stats.inConsult}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-3">
            <span className="text-[11px] font-semibold text-slate-500">Completed Today</span>
            <div className="text-xl font-bold text-emerald-600 mt-0.5">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, UHID, phone, or doctor..."
            className="pl-9 text-xs h-9"
          />
        </div>

        {/* Doctor Filter */}
        <select
          value={doctorFilter}
          onChange={(e) => setDoctorFilter(e.target.value)}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700"
        >
          <option value="all">All Doctors</option>
          <option value="Dr. Gaurav Kumar">Dr. Gaurav Kumar (Cardiology)</option>
          <option value="Dr. Ananya Sharma">Dr. Ananya Sharma (General Med)</option>
          <option value="Dr. Rajesh Varma">Dr. Rajesh Varma (Orthopedics)</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700"
        >
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="arrived">Arrived (Waiting)</option>
          <option value="in_consultation">In Consultation</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Appointments List Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">Token</TableHead>
              <TableHead>Patient Details</TableHead>
              <TableHead>Doctor & Dept</TableHead>
              <TableHead>Date & Slot</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status Transition</TableHead>
              <TableHead className="text-right">Consultation Fee</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-xs text-slate-400">
                  No appointments match the search criteria.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-center font-mono font-bold text-base text-[#2563EB]">
                    #{item.tokenNumber}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-900 text-xs">{item.patientName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {item.patientUhid} • {item.patientPhone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900 text-xs">{item.doctorName}</div>
                    <div className="text-[11px] text-slate-500">{item.department}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-slate-900">{item.appointmentDate}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" /> {item.timeSlot}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.priority === "emergency" ? "danger" : item.priority === "urgent" ? "warning" : "outline"}>
                      {item.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {/* Interactive Status Transition Dropdown */}
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusTransition(item.id, e.target.value as AppointmentStatus)}
                      className={`h-7 px-2 rounded-md text-xs font-semibold border ${
                        item.status === "in_consultation"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : item.status === "arrived"
                          ? "bg-blue-50 text-[#2563EB] border-blue-200"
                          : item.status === "completed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="arrived">Arrived (Check-In)</option>
                      <option value="in_consultation">In Consultation</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-slate-900 text-xs">
                    {formatCurrencyINR(item.consultationFee)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AppointmentBookingModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        isQuickWalkIn={isQuickWalkIn}
      />
    </div>
  );
}
