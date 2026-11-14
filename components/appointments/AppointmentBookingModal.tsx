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
import { handleEnterNavigation } from "@/utils/form-navigation";
import { clinicalStore, useClinicalStore } from "@/services/clinical-store";
import { AppointmentService } from "@/services/appointment.service";
import { WabaService } from "@/services/waba.service";
import type { Appointment, Patient } from "@/types/hms";
import { Clock, UserCheck, Stethoscope, Search, Zap } from "lucide-react";

interface AppointmentBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookSuccess?: (appointment: Appointment) => void;
  isQuickWalkIn?: boolean;
}

const DOCTORS = [
  { id: "doc-1", name: "Dr. Gaurav Kumar", dept: "Cardiology", fee: 800 },
  { id: "doc-2", name: "Dr. Ananya Sharma", dept: "General Medicine", fee: 500 },
  { id: "doc-3", name: "Dr. Rajesh Varma", dept: "Orthopedics", fee: 700 },
];

const TIME_SLOTS = [
  { time: "09:30 AM", session: "Morning", available: true },
  { time: "10:00 AM", session: "Morning", available: true },
  { time: "10:30 AM", session: "Morning", available: false },
  { time: "11:00 AM", session: "Morning", available: true },
  { time: "11:30 AM", session: "Morning", available: true },
  { time: "04:00 PM", session: "Evening", available: true },
  { time: "04:30 PM", session: "Evening", available: true },
  { time: "05:00 PM", session: "Evening", available: true },
];

export function AppointmentBookingModal({
  open,
  onOpenChange,
  onBookSuccess,
  isQuickWalkIn = false,
}: AppointmentBookingModalProps) {
  const store = useClinicalStore();

  const [searchPatient, setSearchPatient] = React.useState("");
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);

  const [formData, setFormData] = React.useState({
    fullName: "",
    phone: "",
    uhid: "",
    doctorId: DOCTORS[0].id,
    doctorName: DOCTORS[0].name,
    department: DOCTORS[0].dept,
    appointmentDate: new Date().toISOString().split("T")[0],
    timeSlot: "10:00 AM",
    priority: "normal" as "normal" | "urgent" | "emergency",
    chiefComplaints: "General consultation and health review",
    fee: DOCTORS[0].fee,
  });

  // Autocomplete patient suggestions
  const patientSuggestions = React.useMemo(() => {
    if (!searchPatient.trim() || searchPatient.length < 2) return [];
    const clean = searchPatient.toLowerCase();
    return store.patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(clean) ||
        p.phone.includes(clean) ||
        p.uhid.toLowerCase().includes(clean)
    );
  }, [searchPatient, store.patients]);

  const selectSuggestedPatient = (p: Patient) => {
    setSelectedPatient(p);
    setFormData((prev) => ({
      ...prev,
      fullName: p.fullName,
      phone: p.phone,
      uhid: p.uhid,
    }));
    setSearchPatient("");
  };

  const handleDoctorChange = (docId: string) => {
    const doc = DOCTORS.find((d) => d.id === docId);
    if (doc) {
      setFormData((prev) => ({
        ...prev,
        doctorId: doc.id,
        doctorName: doc.name,
        department: doc.dept,
        fee: doc.fee,
      }));
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.fullName || !formData.phone) return;

    // Strict 10-digit phone enforcement
    const cleanPhone = formData.phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    const currentTokenCount = store.appointments.length + 100;
    const uhid = formData.uhid || `UHID-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    // Ensure patient exists in registry
    let patientId = selectedPatient?.id;
    if (!patientId) {
      patientId = `pat-${Date.now()}`;
      clinicalStore.addPatient({
        id: patientId,
        uhid,
        organizationId: "org-apex-001",
        branchId: "br-main-001",
        fullName: formData.fullName,
        phone: cleanPhone,
        gender: "other",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const record = AppointmentService.createAppointmentRecord(
      {
        organizationId: "org-apex-001",
        branchId: "br-main-001",
        patientId,
        patientName: formData.fullName,
        patientPhone: cleanPhone,
        patientUhid: uhid,
        doctorId: formData.doctorId,
        doctorName: formData.doctorName,
        department: formData.department,
        appointmentDate: formData.appointmentDate,
        timeSlot: formData.timeSlot,
        priority: isQuickWalkIn ? "urgent" : formData.priority,
        chiefComplaints: formData.chiefComplaints,
        consultationFee: formData.fee,
      },
      currentTokenCount
    );

    // If walk-in, set directly to arrived
    if (isQuickWalkIn) {
      record.status = "arrived";
      record.isPaid = true;
    }

    clinicalStore.addAppointment(record);

    // Trigger WhatsApp notification in background
    WabaService.sendAppointmentConfirmation({
      phone: cleanPhone,
      patientName: formData.fullName,
      doctorName: formData.doctorName,
      appointmentDate: formData.appointmentDate,
      timeSlot: formData.timeSlot,
      tokenNumber: record.tokenNumber,
      hospitalName: store.settings.hospitalName,
    }).catch(() => {});

    clinicalStore.logWhatsApp({
      recipientPhone: cleanPhone,
      patientName: formData.fullName,
      templateName: "appointment_confirmation_v1",
      status: "sent",
      params: {
        doctor: formData.doctorName,
        dateTime: `${formData.appointmentDate} ${formData.timeSlot}`,
        token: String(record.tokenNumber),
      },
    });

    if (onBookSuccess) onBookSuccess(record);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            {isQuickWalkIn ? (
              <>
                <Zap className="h-4 w-4 text-amber-500" /> Issue Instant Walk-In OPD Token
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-[#2563EB]" /> Book Patient OPD Slot & Generate Token
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => handleEnterNavigation(e)}
          className="space-y-4 py-2"
        >
          {/* Patient Autocomplete Search */}
          <div className="relative">
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Search Registered Patient (UHID / Phone / Name)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={searchPatient}
                onChange={(e) => setSearchPatient(e.target.value)}
                placeholder="Type phone (e.g. 98230) or UHID..."
                className="pl-9 text-xs h-9"
              />
            </div>

            {patientSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg p-1 divide-y divide-slate-100">
                {patientSuggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectSuggestedPatient(p)}
                    className="w-full p-2 text-left hover:bg-blue-50 rounded flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{p.fullName}</span>
                      <span className="text-slate-400 ml-2 font-mono">({p.uhid})</span>
                    </div>
                    <span className="font-mono text-slate-600">{p.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedPatient && (
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#2563EB]" />
                <span className="font-medium text-blue-900">
                  Selected: {selectedPatient.fullName} ({selectedPatient.uhid})
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPatient(null)}
                className="h-6 text-[10px] text-blue-700 hover:text-blue-900"
              >
                Clear
              </Button>
            </div>
          )}

          {/* Patient Details Form */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Patient Full Name *
              </label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Ramesh Patel"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                10-Digit Mobile Number *
              </label>
              <Input
                value={formData.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setFormData({ ...formData, phone: val });
                }}
                placeholder="e.g. 9823012345"
                inputMode="numeric"
                maxLength={10}
                required
              />
            </div>
          </div>

          {/* Multi-Doctor Engine Picker */}
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1.5">
              Select Attending Doctor & Department
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DOCTORS.map((doc) => {
                const isSelected = formData.doctorId === doc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handleDoctorChange(doc.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-[#2563EB] bg-blue-50/60 ring-1 ring-blue-500"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-900">{doc.name}</div>
                    <div className="text-[10px] text-slate-500">{doc.dept}</div>
                    <div className="text-[10px] font-bold text-[#2563EB] mt-1">₹{doc.fee}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slot Picker Engine */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700">Available Time Slots</label>
              <span className="text-[10px] text-slate-400">Green = Available</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {TIME_SLOTS.map((slot) => {
                const isSelected = formData.timeSlot === slot.time;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setFormData({ ...formData, timeSlot: slot.time })}
                    className={`py-1.5 px-2 rounded-md text-xs font-mono font-medium transition-all ${
                      !slot.available
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed line-through"
                        : isSelected
                        ? "bg-[#2563EB] text-white shadow-xs font-bold"
                        : "bg-white border border-slate-200 text-slate-700 hover:border-blue-400"
                    }`}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Appointment Date</label>
              <Input
                type="date"
                value={formData.appointmentDate}
                onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Priority Triage</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800"
              >
                <option value="normal">Normal Outpatient</option>
                <option value="urgent">Urgent Consult</option>
                <option value="emergency">Emergency Fast-Track</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Chief Complaints</label>
            <Input
              value={formData.chiefComplaints}
              onChange={(e) => setFormData({ ...formData, chiefComplaints: e.target.value })}
              placeholder="e.g. Chest heaviness, fever, post-op dressing"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#2563EB] hover:bg-blue-700">
              {isQuickWalkIn ? "Issue Token & Print Slip" : "Generate Token & Confirm Booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
