"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Plus,
  Zap,
  Coffee,
  Clock,
  Users,
  UserPlus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileSpreadsheet,
  Table as TableIcon,
  LayoutGrid,
  CalendarDays,
  CalendarRange,
  Columns,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClinicalStore, clinicalStore } from "@/services/clinical-store";
import { formatCurrencyINR } from "@/utils/formatting";
import type { Appointment, CalendarViewType, Patient, AppointmentStatus } from "@/types/hms";

// Sub-components
import { AppointmentQueueDrawer } from "@/components/appointments/AppointmentQueueDrawer";
import { AppointmentMatrixGrid } from "@/components/appointments/AppointmentMatrixGrid";
import { AppointmentDayView } from "@/components/appointments/AppointmentDayView";
import { AppointmentWeekView } from "@/components/appointments/AppointmentWeekView";
import { AppointmentMonthView } from "@/components/appointments/AppointmentMonthView";

// Modals
import { DoctorBreakBlockModal } from "@/components/appointments/DoctorBreakBlockModal";
import { DoctorAvailabilityModal } from "@/components/appointments/DoctorAvailabilityModal";
import { QuickPatientDirectoryModal } from "@/components/appointments/QuickPatientDirectoryModal";
import { QuickPatientRegistrationModal } from "@/components/appointments/QuickPatientRegistrationModal";
import { AppointmentBookingModal } from "@/components/appointments/AppointmentBookingModal";
import { PrintDayScheduleModal } from "@/components/appointments/PrintDayScheduleModal";
import { AppointmentDetailsPopover } from "@/components/appointments/AppointmentDetailsPopover";

export default function AppointmentsPage() {
  const router = useRouter();
  const store = useClinicalStore();

  const doctorList = React.useMemo(() => {
    const docs = store.staff.filter(
      (s) =>
        s.role === "doctor" ||
        s.role.includes("doctor") ||
        s.role.includes("consultant") ||
        s.role.includes("specialist")
    );
    return [
      { id: "all", name: "All Doctors & Clinics" },
      ...docs.map((d) => ({
        id: d.id,
        name: `${d.name} (${d.department})`,
      })),
    ];
  }, [store.staff]);

  // Calendar Navigation State (Default to Nov 14, 2026 to match screenshot)
  const [selectedDate, setSelectedDate] = React.useState<string>("2026-11-14");
  const [currentYear, setCurrentYear] = React.useState<number>(2026);
  const [currentMonth, setCurrentMonth] = React.useState<number>(10); // 0-indexed (10 = November)
  const [viewMode, setViewMode] = React.useState<CalendarViewType>("matrix");
  const [selectedDoctorId, setSelectedDoctorId] = React.useState<string>("all");
  const [drawerCollapsed, setDrawerCollapsed] = React.useState<boolean>(false);
  const [showTableView, setShowTableView] = React.useState<boolean>(false);

  // Modals state
  const [breakBlockModalOpen, setBreakBlockModalOpen] = React.useState(false);
  const [availabilityModalOpen, setAvailabilityModalOpen] = React.useState(false);
  const [patientDirModalOpen, setPatientDirModalOpen] = React.useState(false);
  const [addPatientModalOpen, setAddPatientModalOpen] = React.useState(false);
  const [bookingModalOpen, setBookingModalOpen] = React.useState(false);
  const [isQuickWalkIn, setIsQuickWalkIn] = React.useState(false);
  const [selectedPatientForBooking, setSelectedPatientForBooking] = React.useState<Patient | null>(null);
  const [printModalOpen, setPrintModalOpen] = React.useState(false);
  const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment | null>(null);
  const [detailsPopoverOpen, setDetailsPopoverOpen] = React.useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false);

  // Format header strings
  const formattedSelectedDate = React.useMemo(() => {
    try {
      const parts = selectedDate.split("-");
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d);
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const formattedMonthYear = React.useMemo(() => {
    const d = new Date(currentYear, currentMonth, 1);
    return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(d);
  }, [currentYear, currentMonth]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = String(today.getDate()).padStart(2, "0");
    setCurrentYear(y);
    setCurrentMonth(m);
    setSelectedDate(`${y}-${String(m + 1).padStart(2, "0")}-${d}`);
  };

  // Quick action openers
  const handleOpenWalkIn = () => {
    setSelectedPatientForBooking(null);
    setIsQuickWalkIn(true);
    setBookingModalOpen(true);
  };

  const handleOpenNewBooking = () => {
    setSelectedPatientForBooking(null);
    setIsQuickWalkIn(false);
    setBookingModalOpen(true);
  };

  const handlePatientSelectedForBooking = (patient: Patient) => {
    setPatientDirModalOpen(false);
    setSelectedPatientForBooking(patient);
    setIsQuickWalkIn(false);
    setBookingModalOpen(true);
  };

  const handlePatientCreatedForBooking = (patient: Patient) => {
    setAddPatientModalOpen(false);
    setSelectedPatientForBooking(patient);
    setIsQuickWalkIn(false);
    setBookingModalOpen(true);
  };

  const handleSlotClickToBook = (docId: string, _docName: string, _timeSlot: string) => {
    setSelectedDoctorId(docId);
    setSelectedPatientForBooking(null);
    setIsQuickWalkIn(false);
    setBookingModalOpen(true);
  };

  const handleAppointmentClick = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setDetailsPopoverOpen(true);
  };

  const handleStatusTransition = (aptId: string, newStatus: AppointmentStatus) => {
    clinicalStore.updateAppointmentStatus(aptId, newStatus);
  };

  const handleExportCsv = () => {
    const list = store.appointments.filter(
      (a) => a.appointmentDate === selectedDate && (selectedDoctorId === "all" || a.doctorId === selectedDoctorId)
    );
    if (list.length === 0) {
      alert("No appointments found for the selected date and doctor.");
      return;
    }
    const headers = "Token,UHID,Patient Name,Phone,Doctor,Department,Date,Time,Priority,Status,Fee,Source\n";
    const rows = list
      .map(
        (a) =>
          `"${a.tokenNumber}","${a.patientUhid}","${a.patientName}","${a.patientPhone}","${a.doctorName}","${a.department}","${a.appointmentDate}","${a.timeSlot}","${a.priority}","${a.status}","${a.consultationFee}","${a.source || "sys"}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Schedule_${selectedDate}.csv`;
    link.click();
    setMoreMenuOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-8 space-y-3">
      {/* =========================================================================
          TOP HEALTHRAY BLUE HEADER BAR
          Exact styling matching the screenshot with rounded pill buttons
         ========================================================================= */}
      <header className="bg-[#1976D2] text-white px-4 py-2.5 shadow-sm rounded-lg flex flex-wrap items-center justify-between gap-3">
        {/* Left Branding / Title */}
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-md bg-white/20 flex items-center justify-center border border-white/30 shadow-xs">
            <CalendarIcon className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white select-none">Calendar</h1>
        </div>

        {/* Right Action Button Pills */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Break & Block */}
          <button
            onClick={() => setBreakBlockModalOpen(true)}
            className="px-3 py-1.5 rounded-full border border-white/70 bg-transparent text-white font-medium hover:bg-white/15 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Block doctor hours for lunch, OT surgeries, or leave"
          >
            <Coffee className="h-3.5 w-3.5" />
            <span>Break & Block</span>
          </button>

          {/* Doctor Availability */}
          <button
            onClick={() => setAvailabilityModalOpen(true)}
            className="px-3 py-1.5 rounded-full border border-white/70 bg-transparent text-white font-medium hover:bg-white/15 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Configure weekly doctor shifts and slot durations"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Doctor Availability</span>
          </button>

          {/* Patient Queue */}
          <button
            onClick={() => {
              if (drawerCollapsed) setDrawerCollapsed(false);
            }}
            className="px-3 py-1.5 rounded-full border border-white/70 bg-transparent text-white font-medium hover:bg-white/15 transition-colors cursor-pointer flex items-center gap-1.5"
            title="View waiting queue in the left drawer"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Patient Queue</span>
          </button>

          {/* Clinic / Doctor Dropdown */}
          <div className="relative">
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="appearance-none px-3.5 py-1.5 pr-7 rounded-full border border-white/70 bg-[#1565C0] text-white font-medium text-xs hover:bg-[#0D47A1] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {doctorList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <ChevronRight className="h-3 w-3 text-white absolute right-2.5 top-2.5 rotate-90 pointer-events-none" />
          </div>

          {/* Patients Directory */}
          <button
            onClick={() => setPatientDirModalOpen(true)}
            className="px-3 py-1.5 rounded-full border border-white/70 bg-transparent text-white font-medium hover:bg-white/15 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Quick patient directory"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Patients</span>
          </button>

          {/* Add Patient */}
          <button
            onClick={() => setAddPatientModalOpen(true)}
            className="px-3 py-1.5 rounded-full border border-white/70 bg-transparent text-white font-medium hover:bg-white/15 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Fast 30-second patient registration"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add Patient</span>
          </button>

          {/* Add Walk-In Appointment */}
          <button
            onClick={handleOpenWalkIn}
            className="px-3.5 py-1.5 rounded-full bg-white text-[#1976D2] font-semibold hover:bg-white/90 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            title="Book immediate walk-in consultation token"
          >
            <Zap className="h-3.5 w-3.5 fill-[#1976D2]" />
            <span>Add Walk-In Appointment</span>
          </button>

          {/* More Menu (Three Dots) */}
          <div className="relative">
            <button
              onClick={() => setMoreMenuOpen((v) => !v)}
              className="p-1.5 rounded-full border border-white/70 text-white hover:bg-white/15 transition-colors cursor-pointer"
              title="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {moreMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-slate-800"
                onClick={() => setMoreMenuOpen(false)}
              >
                <button
                  onClick={() => setPrintModalOpen(true)}
                  className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-slate-600" />
                  <span>Print Cabin Day Roster</span>
                </button>
                <button
                  onClick={handleExportCsv}
                  className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>Export to Excel/CSV</span>
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button
                  onClick={() => setShowTableView((v) => !v)}
                  className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <TableIcon className="h-4 w-4 text-blue-600" />
                  <span>{showTableView ? "Hide Classic Table" : "Show Classic Table"}</span>
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button
                  onClick={() => router.push("/settings/schedules")}
                  className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-slate-700"
                >
                  <CalendarDays className="h-4 w-4 text-blue-600" />
                  <span>Doctor Schedules & Leaves</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          SUBHEADER ROW: Date indicator, Month Navigator, Doctor Filter, View Switchers
         ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Selected Date Indicator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerCollapsed((c) => !c)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={drawerCollapsed ? "Expand queue drawer" : "Collapse queue drawer"}
          >
            {drawerCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <span className="text-sm font-semibold text-slate-800">{formattedSelectedDate}</span>
        </div>

        {/* Center: Month Navigator (< November 2026 >) & Today */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
            title="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold text-slate-800 min-w-[130px] text-center select-none">
            {formattedMonthYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
            title="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={handleGoToday}
            className="text-[11px] font-medium px-2 py-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer ml-1"
          >
            Today
          </button>
        </div>

        {/* Right: Doctor Filter Dropdown + 4 View Mode Switchers */}
        <div className="flex items-center gap-3">
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {doctorList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* 4 View Switcher Icons: Day, Week, Month, Matrix */}
          <div className="flex items-center border border-slate-200 rounded-md p-0.5 bg-slate-50/70">
            {/* Day */}
            <button
              onClick={() => setViewMode("day")}
              className={`p-1.5 rounded transition-all cursor-pointer ${
                viewMode === "day"
                  ? "bg-white text-blue-600 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Day view (Hourly slot grid)"
            >
              <CalendarDays className="h-4 w-4" />
            </button>

            {/* Week */}
            <button
              onClick={() => setViewMode("week")}
              className={`p-1.5 rounded transition-all cursor-pointer ${
                viewMode === "week"
                  ? "bg-white text-blue-600 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Week view (7-day timeline)"
            >
              <CalendarRange className="h-4 w-4" />
            </button>

            {/* Month */}
            <button
              onClick={() => setViewMode("month")}
              className={`p-1.5 rounded transition-all cursor-pointer ${
                viewMode === "month"
                  ? "bg-white text-blue-600 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Month cards view"
            >
              <Columns className="h-4 w-4 rotate-90" />
            </button>

            {/* Matrix (Active in Screenshot) */}
            <button
              onClick={() => setViewMode("matrix")}
              className={`p-1.5 rounded transition-all cursor-pointer ${
                viewMode === "matrix"
                  ? "bg-white text-blue-600 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Matrix view (Healthray grid matrix)"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN CALENDAR VIEWPORT: Left Queue Drawer + Right Calendar Surface
         ========================================================================= */}
      <div className="flex items-start gap-3 w-full">
        {/* Left Drawer Panel */}
        <AppointmentQueueDrawer
          selectedDate={selectedDate}
          appointments={store.appointments}
          selectedDoctorId={selectedDoctorId}
          collapsed={drawerCollapsed}
          onToggleCollapse={() => setDrawerCollapsed((c) => !c)}
          onOpenBooking={handleOpenNewBooking}
        />

        {/* Right Calendar Grid Container */}
        <div className="flex-1 min-w-0 transition-all">
          {viewMode === "matrix" && (
            <AppointmentMatrixGrid
              year={currentYear}
              month={currentMonth}
              selectedDate={selectedDate}
              appointments={store.appointments}
              selectedDoctorId={selectedDoctorId}
              onSelectDate={(newDate) => setSelectedDate(newDate)}
              onSelectAppointment={handleAppointmentClick}
            />
          )}

          {viewMode === "day" && (
            <AppointmentDayView
              selectedDate={selectedDate}
              appointments={store.appointments}
              doctorBlocks={store.doctorBlocks}
              selectedDoctorId={selectedDoctorId}
              onSlotClick={handleSlotClickToBook}
              onSelectAppointment={handleAppointmentClick}
            />
          )}

          {viewMode === "week" && (
            <AppointmentWeekView
              selectedDate={selectedDate}
              appointments={store.appointments}
              doctorBlocks={store.doctorBlocks}
              selectedDoctorId={selectedDoctorId}
              onSelectDate={(newDate) => setSelectedDate(newDate)}
              onSelectAppointment={handleAppointmentClick}
            />
          )}

          {viewMode === "month" && (
            <AppointmentMonthView
              year={currentYear}
              month={currentMonth}
              selectedDate={selectedDate}
              appointments={store.appointments}
              selectedDoctorId={selectedDoctorId}
              onSelectDate={(newDate) => setSelectedDate(newDate)}
              onSelectAppointment={handleAppointmentClick}
            />
          )}
        </div>
      </div>

      {/* =========================================================================
          OPTIONAL CLASSIC TABLE VIEW (Toggled from ⋮ More Menu)
         ========================================================================= */}
      {showTableView && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs mt-6 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Classic Schedule Ledger View</h2>
              <p className="text-[11px] text-slate-500">
                Detailed table for {formattedSelectedDate}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTableView(false)}
              className="text-xs h-7"
            >
              Close Table View
            </Button>
          </div>

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
              {store.appointments
                .filter(
                  (a) =>
                    a.appointmentDate === selectedDate &&
                    (selectedDoctorId === "all" || a.doctorId === selectedDoctorId)
                )
                .map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center font-mono font-bold text-base text-[#1976D2]">
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
                      <Badge
                        variant={
                          item.priority === "emergency"
                            ? "danger"
                            : item.priority === "urgent"
                            ? "warning"
                            : "outline"
                        }
                      >
                        {item.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <select
                        value={item.status}
                        onChange={(e) =>
                          handleStatusTransition(item.id, e.target.value as AppointmentStatus)
                        }
                        className={`h-7 px-2 rounded-md text-xs font-semibold border ${
                          item.status === "in_consultation"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : item.status === "arrived"
                            ? "bg-blue-50 text-[#1976D2] border-blue-200"
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
                ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* =========================================================================
          ALL MODAL DIALOGS
         ========================================================================= */}
      {/* 1. Doctor Break & Slot Block */}
      <DoctorBreakBlockModal
        open={breakBlockModalOpen}
        onOpenChange={setBreakBlockModalOpen}
        selectedDate={selectedDate}
      />

      {/* 2. Doctor Availability Shifts */}
      <DoctorAvailabilityModal
        open={availabilityModalOpen}
        onOpenChange={setAvailabilityModalOpen}
      />

      {/* 3. Quick Patient Directory */}
      <QuickPatientDirectoryModal
        open={patientDirModalOpen}
        onOpenChange={setPatientDirModalOpen}
        onBookAppointment={handlePatientSelectedForBooking}
      />

      {/* 4. Quick Patient Registration */}
      <QuickPatientRegistrationModal
        open={addPatientModalOpen}
        onOpenChange={setAddPatientModalOpen}
        onPatientCreated={handlePatientCreatedForBooking}
      />

      {/* 5. Appointment Booking Dialog (Walk-in or Slot) */}
      <AppointmentBookingModal
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
        isQuickWalkIn={isQuickWalkIn}
        initialPatient={selectedPatientForBooking}
        initialDate={selectedDate}
        onBookSuccess={() => setSelectedPatientForBooking(null)}
      />

      {/* 6. Printable Cabin Day Schedule Sheet */}
      <PrintDayScheduleModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        selectedDate={selectedDate}
        selectedDoctorId={selectedDoctorId}
      />

      {/* 7. Appointment Action / Details Popover */}
      <AppointmentDetailsPopover
        appointment={selectedAppointment}
        open={detailsPopoverOpen}
        onOpenChange={setDetailsPopoverOpen}
      />
    </div>
  );
}
