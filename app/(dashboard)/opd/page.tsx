"use client";

import * as React from "react";
import {
  Edit3,
  Info,
  Search,
  Receipt,
  AlertTriangle,
  Bell,
  FileText,
  LineChart,
  CalendarPlus,
  UserPlus,
  MoreVertical,
  ChevronDown,
  Upload,
  Printer,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Sub-components & Modals
import { OpdPatientQueueDrawer } from "@/components/opd/OpdPatientQueueDrawer";
import { OpdConsultationWorkspace } from "@/components/opd/OpdConsultationWorkspace";
import { OpdBillingModal } from "@/components/opd/OpdBillingModal";
import { PatientAllergyModal } from "@/components/opd/PatientAllergyModal";
import { VitalSignsGraphModal } from "@/components/opd/VitalSignsGraphModal";
import { ComprehensivePatientReportModal } from "@/components/opd/ComprehensivePatientReportModal";
import { FollowUpReminderModal } from "@/components/opd/FollowUpReminderModal";
import { UploadAttachmentModal } from "@/components/opd/UploadAttachmentModal";
import { QuickPatientRegistrationModal } from "@/components/appointments/QuickPatientRegistrationModal";
import { AppointmentBookingModal } from "@/components/appointments/AppointmentBookingModal";
import { PrescriptionPrintModal } from "@/components/clinical/PrescriptionPrintModal";

import { useClinicalStore, clinicalStore } from "@/services/clinical-store";
import type { Appointment, Patient, VitalRecord, DiagnosisEntry, PrescriptionItem } from "@/types/hms";

export default function OpdPage() {
  const store = useClinicalStore();

  // Queue & Selection State (Default to MR. VIJAY V189 matching screenshot)
  const defaultAppointment = React.useMemo(() => {
    const vijay = store.appointments.find((a) => a.id === "apt-v189" || a.tokenNumber === 189);
    return vijay || store.appointments[0];
  }, [store.appointments]);

  const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment>(defaultAppointment);
  const [selectedDate, setSelectedDate] = React.useState<string>("2026-11-16");
  const [drawerCollapsed, setDrawerCollapsed] = React.useState(false);
  const [headerSearch, setHeaderSearch] = React.useState("");

  // Modals state
  const [billingModalOpen, setBillingModalOpen] = React.useState(false);
  const [allergyModalOpen, setAllergyModalOpen] = React.useState(false);
  const [reminderModalOpen, setReminderModalOpen] = React.useState(false);
  const [reportModalOpen, setReportModalOpen] = React.useState(false);
  const [graphModalOpen, setGraphModalOpen] = React.useState(false);
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [addPatientModalOpen, setAddPatientModalOpen] = React.useState(false);
  const [bookingModalOpen, setBookingModalOpen] = React.useState(false);
  const [printRxModalOpen, setPrintRxModalOpen] = React.useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false);
  const [infoPopoverOpen, setInfoPopoverOpen] = React.useState(false);

  // Sync if store appointments update or if non-screenshot patient was picked
  React.useEffect(() => {
    if (store.appointments.length > 0) {
      if (!selectedAppointment || selectedAppointment.tokenNumber < 185) {
        const vijay = store.appointments.find((a) => a.id === "apt-v189" || a.tokenNumber === 189);
        if (vijay) {
          setSelectedAppointment(vijay);
        }
      }
    }
  }, [store.appointments, selectedAppointment]);

  // Current Patient details
  const currentPatient = React.useMemo(() => {
    if (!selectedAppointment) return null;
    return store.patients.find((p) => p.id === selectedAppointment.patientId) || null;
  }, [store.patients, selectedAppointment]);

  // Count active allergies for badge
  const patientAllergies = React.useMemo(() => {
    if (!selectedAppointment) return [];
    return store.patientAllergies.filter((a) => a.patientId === selectedAppointment.patientId);
  }, [store.patientAllergies, selectedAppointment]);

  // Default vitals for active session
  const defaultVitals: VitalRecord = {
    patientId: selectedAppointment?.patientId || "pat-vijay-189",
    recordedAt: new Date().toISOString(),
    systolicBp: 124,
    diastolicBp: 82,
    pulseRate: 76,
    temperature: 98.6,
    spo2: 98,
    heightCm: 172,
    weightKg: 68,
  };

  const defaultDiagnoses: DiagnosisEntry[] = [
    {
      icdCode: "H52.13",
      description: "Myopia, bilateral (Simple Myopia)",
      type: "final",
    },
  ];

  const defaultPrescriptions: PrescriptionItem[] = [
    {
      id: "rx-1",
      medicineName: "Carboxymethylcellulose 0.5% Drops",
      dosage: "1 drop",
      frequency: "1-1-1",
      timing: "with_food",
      durationDays: 30,
      instructions: "Instill 1 drop in both eyes three times daily",
      quantity: 1,
    },
  ];

  if (!selectedAppointment) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        Loading outpatient queue...
      </div>
    );
  }

  // Formatting demographics
  const initial = selectedAppointment.patientName
    ? selectedAppointment.patientName.replace("MR. ", "").replace("MS. ", "").replace("MASTER ", "").charAt(0).toUpperCase()
    : "V";

  const ageGenderStr =
    selectedAppointment.patientId === "pat-vijay-189"
      ? "MALE · (22Y)"
      : selectedAppointment.patientId === "pat-sreya-188"
      ? "FEMALE · (24Y)"
      : selectedAppointment.patientId === "pat-vimal-187"
      ? "MALE · (63Y)"
      : selectedAppointment.patientId === "pat-kushagra-186"
      ? "MALE · (27Y)"
      : selectedAppointment.patientId === "pat-ashdik"
      ? "MALE · (5Y)"
      : "MALE · (28Y)";

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/40 space-y-2 select-none pb-6">
      {/* =========================================================================
          TOP COMPACT CLINICAL HEADER BAR (No bulky banners - h-11 maximum density)
          Exact replica of the provided Healthray screenshot
         ========================================================================= */}
      <header className="h-11 bg-white border border-slate-200 rounded-lg shadow-2xs px-3 flex items-center justify-between gap-2 text-xs">
        {/* Left: Patient Profile & Demographics Strip */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Avatar Circle */}
          <div className="h-7 w-7 rounded-full bg-[#D32F2F] text-white font-bold flex items-center justify-center text-xs shadow-2xs">
            {initial}
          </div>

          {/* Token Badge */}
          <span className="font-bold text-[#1976D2] font-mono text-xs">
            (V{selectedAppointment.tokenNumber})
          </span>

          {/* Edit Patient & Info Trigger */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setAddPatientModalOpen(true)}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Edit patient demographics"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>

            <div className="relative">
              <button
                onClick={() => setInfoPopoverOpen((v) => !v)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Patient Info"
              >
                <Info className="h-3.5 w-3.5" />
              </button>

              {infoPopoverOpen && (
                <div
                  className="absolute left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-3 z-50 text-[11px] text-slate-700 space-y-1.5"
                  onClick={() => setInfoPopoverOpen(false)}
                >
                  <div className="font-bold text-slate-900 border-b pb-1">
                    {selectedAppointment.patientName}
                  </div>
                  <div><span className="text-slate-400">UHID:</span> {selectedAppointment.patientUhid}</div>
                  <div><span className="text-slate-400">Phone:</span> {selectedAppointment.patientPhone}</div>
                  <div><span className="text-slate-400">Branch:</span> Visual Eyez (Lajpat Nagar)</div>
                  <div><span className="text-slate-400">ABHA:</span> 91-8842-1920-3341@sbx</div>
                </div>
              )}
            </div>
          </div>

          {/* Demographics Tag */}
          <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 font-semibold text-[11px]">
            {ageGenderStr}
          </span>

          {/* Patient Name */}
          <div className="font-black text-slate-900 text-xs tracking-tight uppercase">
            {selectedAppointment.patientName}
          </div>

          {/* Referral Source */}
          <span className="text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 font-medium">
            Ref. By: Self
          </span>
        </div>

        {/* Center: Search Patient Input (Crisp, non-collapsing) */}
        <div className="relative w-48 xl:w-60 shrink-0 hidden md:block">
          <Search className="h-3 w-3 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
          <Input
            placeholder="Search patient..."
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            className="h-7 text-xs pl-7 pr-6 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-md"
          />
          {headerSearch && (
            <button
              onClick={() => setHeaderSearch("")}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Right: Functional Action Pill Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">
          {/* 1. Bill Button (Red/Coral border) */}
          <button
            onClick={() => setBillingModalOpen(true)}
            className="px-2.5 py-1 rounded-full border border-rose-300 bg-rose-50/50 text-rose-700 hover:bg-rose-100/70 font-semibold text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            title="Generate OPD Bill & Thermal Receipt"
          >
            <Receipt className="h-3 w-3 text-rose-600" />
            <span>Bill</span>
          </button>

          {/* 2. Allergy Button (Amber/Gray border) */}
          <button
            onClick={() => setAllergyModalOpen(true)}
            className={`px-2.5 py-1 rounded-full border font-semibold text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs ${
              patientAllergies.length > 0
                ? "border-amber-400 bg-amber-50 text-amber-800"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
            title="Patient Allergy records"
          >
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            <span>Allergy {patientAllergies.length > 0 ? `(${patientAllergies.length})` : ""}</span>
          </button>

          {/* 3. Reminder Button (Blue border) */}
          <button
            onClick={() => setReminderModalOpen(true)}
            className="px-2.5 py-1 rounded-full border border-blue-300 bg-blue-50/50 text-blue-700 hover:bg-blue-100/70 font-semibold text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            title="Schedule WhatsApp / SMS reminder"
          >
            <Bell className="h-3 w-3 text-blue-600" />
            <span>Reminder</span>
          </button>

          {/* 4. Patient Report Button (Gray border) */}
          <button
            onClick={() => setReportModalOpen(true)}
            className="px-2.5 py-1 rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            title="Comprehensive EMR Case Sheet"
          >
            <FileText className="h-3 w-3 text-slate-500" />
            <span>Patient Report</span>
          </button>

          {/* 5. Graph Button (Purple border) */}
          <button
            onClick={() => setGraphModalOpen(true)}
            className="px-2.5 py-1 rounded-full border border-purple-300 bg-purple-50/50 text-purple-700 hover:bg-purple-100/70 font-semibold text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            title="Vitals Trend Graph"
          >
            <LineChart className="h-3 w-3 text-purple-600" />
            <span>Graph</span>
          </button>

          {/* 6. + Appt Button (Primary Blue Solid) */}
          <button
            onClick={() => setBookingModalOpen(true)}
            className="px-3 py-1 rounded-full bg-[#1976D2] hover:bg-blue-700 text-white font-semibold text-[11px] shadow-xs transition-colors cursor-pointer flex items-center gap-1"
            title="Add Next Appointment"
          >
            <CalendarPlus className="h-3 w-3" />
            <span>+ Appt</span>
          </button>

          {/* 7. + Patient Button (Primary Blue Solid) */}
          <button
            onClick={() => setAddPatientModalOpen(true)}
            className="px-3 py-1 rounded-full bg-[#1976D2] hover:bg-blue-700 text-white font-semibold text-[11px] shadow-xs transition-colors cursor-pointer flex items-center gap-1"
            title="Add New Walk-In Patient"
          >
            <UserPlus className="h-3 w-3" />
            <span>+ Patient</span>
          </button>

          {/* 8. More Options Menu (Three Dots) */}
          <div className="relative">
            <button
              onClick={() => setMoreMenuOpen((v) => !v)}
              className="p-1 rounded-md text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              title="More clinical options"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>

            {moreMenuOpen && (
              <div
                className="absolute right-0 mt-1 w-52 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 text-slate-800 text-xs"
                onClick={() => setMoreMenuOpen(false)}
              >
                <button
                  onClick={() => setPrintRxModalOpen(true)}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-600" />
                  <span>Print Prescription (A4)</span>
                </button>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5 text-blue-600" />
                  <span>Upload Document / Scan</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          SUB-HEADER / VISIT STATUS STRIP (High-density h-8 bar from screenshot)
         ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-1 shadow-2xs flex items-center justify-between text-xs text-slate-600 whitespace-nowrap overflow-x-auto select-none">
        <div className="flex items-center gap-2">
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-bold text-[#D32F2F]">Walk-In</span>
          <span className="text-slate-400">/</span>
          <span className="font-semibold text-slate-700">Confirmed</span>

          <span className="text-slate-700 font-medium ml-2">
            Monday 16/11/2026 13:00:00
          </span>

          <span className="px-2 py-0.2 rounded-full border border-blue-200 bg-blue-50 text-[#1976D2] font-semibold text-[10px]">
            System
          </span>

          <span className="text-slate-500 font-medium">
            (New Appointment - Lajpatnagar)
          </span>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="text-[#1976D2] hover:text-blue-800 font-semibold underline cursor-pointer ml-1 text-xs"
          >
            Upload Document
          </button>
        </div>

        <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-[11px] shrink-0 pl-3">
          <Info className="h-3.5 w-3.5 text-slate-400" />
          <span>{selectedAppointment.doctorName || "Dr. Rajeev Prasad"} (Optometrists)</span>
        </div>
      </div>

      {/* =========================================================================
          MAIN WORKSPACE: Left Queue Drawer + Right Consultation Pad
         ========================================================================= */}
      <div className="flex items-start gap-2 w-full">
        {/* Left Queue Panel */}
        <OpdPatientQueueDrawer
          queue={store.appointments}
          activeAppointmentId={selectedAppointment.id}
          onSelectAppointment={(apt) => setSelectedAppointment(apt)}
          collapsed={drawerCollapsed}
          onToggleCollapse={() => setDrawerCollapsed((v) => !v)}
          selectedDate={selectedDate}
          onDateChange={(d) => setSelectedDate(d)}
        />

        {/* Right Active Consultation Workspace */}
        <OpdConsultationWorkspace
          appointment={selectedAppointment}
          patient={currentPatient}
          onOpenUploadModal={() => setUploadModalOpen(true)}
          onOpenBillingModal={() => setBillingModalOpen(true)}
          onOpenPrintModal={() => setPrintRxModalOpen(true)}
        />
      </div>

      {/* =========================================================================
          ALL DIALOG MODALS
         ========================================================================= */}
      {/* 1. OPD Billing Modal */}
      <OpdBillingModal
        open={billingModalOpen}
        onOpenChange={setBillingModalOpen}
        appointment={selectedAppointment}
      />

      {/* 2. Patient Allergy Modal */}
      <PatientAllergyModal
        open={allergyModalOpen}
        onOpenChange={setAllergyModalOpen}
        patientId={selectedAppointment.patientId}
        patientName={selectedAppointment.patientName || "Patient"}
      />

      {/* 3. Vitals Trend Graph Modal */}
      <VitalSignsGraphModal
        open={graphModalOpen}
        onOpenChange={setGraphModalOpen}
        patientName={selectedAppointment.patientName || "Patient"}
        currentVitals={defaultVitals}
      />

      {/* 4. Comprehensive Patient Report Modal */}
      <ComprehensivePatientReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        patient={currentPatient}
        appointment={selectedAppointment}
        vitals={defaultVitals}
        diagnoses={defaultDiagnoses}
        prescriptions={defaultPrescriptions}
        allergies={patientAllergies}
      />

      {/* 5. Follow-Up Reminder Modal */}
      <FollowUpReminderModal
        open={reminderModalOpen}
        onOpenChange={setReminderModalOpen}
        appointment={selectedAppointment}
      />

      {/* 6. Document & Scan Uploader */}
      <UploadAttachmentModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        appointmentId={selectedAppointment.id}
        patientId={selectedAppointment.patientId}
        patientName={selectedAppointment.patientName || "Patient"}
      />

      {/* 7. Quick Patient Registration Modal */}
      <QuickPatientRegistrationModal
        open={addPatientModalOpen}
        onOpenChange={setAddPatientModalOpen}
      />

      {/* 8. Appointment Booking Modal */}
      <AppointmentBookingModal
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
        initialPatient={currentPatient}
        initialDate={selectedDate}
      />

      {/* 9. Printable Prescription Sheet Modal */}
      <PrescriptionPrintModal
        open={printRxModalOpen}
        onOpenChange={setPrintRxModalOpen}
        patient={selectedAppointment}
        diagnoses={defaultDiagnoses}
        prescriptions={defaultPrescriptions}
        vitals={defaultVitals}
        clinicalNotes={selectedAppointment.notes || "Visual Acuity: OD 6/6, OS 6/6"}
        settings={store.settings}
      />
    </div>
  );
}
