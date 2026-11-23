"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { handleEnterNavigation } from "@/utils/form-navigation";
import { clinicalStore, useClinicalStore } from "@/services/clinical-store";
import { AppointmentService } from "@/services/appointment.service";
import { WabaService } from "@/services/waba.service";
import type { Appointment, Patient } from "@/types/hms";
import {
  Clock,
  UserCheck,
  Search,
  Zap,
  X,
  Check,
  Loader2,
  CalendarDays,
  AlertCircle,
  Phone,
  User,
  Sparkles,
} from "lucide-react";

interface AppointmentBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookSuccess?: (appointment: Appointment) => void;
  isQuickWalkIn?: boolean;
  initialPatient?: Patient | null;
  initialDate?: string;
}

// Fallback baseline slots if doctor schedule is loading or offline
const DEFAULT_FALLBACK_SLOTS = [
  { time: "09:30 AM", timeSlot: "09:30", session: "Morning", available: true },
  { time: "10:00 AM", timeSlot: "10:00", session: "Morning", available: true },
  { time: "10:30 AM", timeSlot: "10:30", session: "Morning", available: true },
  { time: "11:00 AM", timeSlot: "11:00", session: "Morning", available: true },
  { time: "11:30 AM", timeSlot: "11:30", session: "Morning", available: true },
  { time: "12:00 PM", timeSlot: "12:00", session: "Morning", available: true },
  { time: "04:00 PM", timeSlot: "16:00", session: "Evening", available: true },
  { time: "04:30 PM", timeSlot: "16:30", session: "Evening", available: true },
  { time: "05:00 PM", timeSlot: "17:00", session: "Evening", available: true },
  { time: "05:30 PM", timeSlot: "17:30", session: "Evening", available: true },
  { time: "06:00 PM", timeSlot: "18:00", session: "Evening", available: true },
  { time: "06:30 PM", timeSlot: "18:30", session: "Evening", available: true },
];

export function AppointmentBookingModal({
  open,
  onOpenChange,
  onBookSuccess,
  isQuickWalkIn = false,
  initialPatient = null,
  initialDate,
}: AppointmentBookingModalProps) {
  const store = useClinicalStore();
  const [realDoctors, setRealDoctors] = React.useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [bookingError, setBookingError] = React.useState<string | null>(null);

  // Live dynamic slot availability state
  const [liveSlots, setLiveSlots] = React.useState<
    Array<{
      slotStart: string;
      slotEnd: string;
      timeSlot: string;
      localDisplay: string;
    }>
  >([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);

  // Patient live search from real DB
  const [searchPatient, setSearchPatient] = React.useState("");
  const [dbPatientSuggestions, setDbPatientSuggestions] = React.useState<any[]>([]);
  const [searchingPatients, setSearchingPatients] = React.useState(false);
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(initialPatient);

  const [formData, setFormData] = React.useState({
    fullName: initialPatient?.fullName || "",
    phone: initialPatient?.phone || "",
    uhid: initialPatient?.uhid || "",
    doctorId: "",
    doctorName: "",
    department: "",
    appointmentDate: initialDate || new Date().toISOString().split("T")[0],
    timeSlot: "10:00 AM",
    priority: "normal" as "normal" | "urgent" | "emergency",
    chiefComplaints: "",
    fee: 500,
  });

  // 1. Fetch real active doctors from clinic DB
  React.useEffect(() => {
    if (!open) return;
    setBookingError(null);
    fetch("/api/crm/doctors")
      .then((res) => res.json())
      .then((data) => {
        if (data.doctors && data.doctors.length > 0) {
          setRealDoctors(data.doctors);
        }
      })
      .catch(() => {});
  }, [open]);

  // Clean doctor name formatting (strictly prevent "Dr. Dr." duplicate prefixes)
  const doctors = React.useMemo(() => {
    if (realDoctors.length > 0) {
      return realDoctors.map((d) => {
        const cleanName = (d.fullName || "").replace(/^(Dr\.?\s*)+/i, "").trim();
        return {
          id: d.id,
          name: `Dr. ${cleanName}`,
          dept: d.specialty || "General Medicine",
          fee: d.consultationFee ? parseFloat(d.consultationFee) : 500,
        };
      });
    }
    const staffDocs = store.staff.filter(
      (s) =>
        s.role === "doctor" ||
        s.role.includes("doctor") ||
        s.role.includes("consultant") ||
        s.role.includes("specialist")
    );
    if (staffDocs.length === 0) {
      return [
        { id: "doc-gen", name: "Dr. General Physician", dept: "General OPD", fee: 500 },
      ];
    }
    return staffDocs.map((s) => {
      const cleanName = (s.name || "").replace(/^(Dr\.?\s*)+/i, "").trim();
      return {
        id: s.id,
        name: `Dr. ${cleanName}`,
        dept: s.department || "General",
        fee: 600,
      };
    });
  }, [realDoctors, store.staff]);

  // Set initial selected doctor
  React.useEffect(() => {
    if (doctors.length > 0 && !formData.doctorId) {
      setFormData((prev) => ({
        ...prev,
        doctorId: doctors[0].id,
        doctorName: doctors[0].name,
        department: doctors[0].dept,
        fee: doctors[0].fee,
      }));
    }
  }, [doctors, formData.doctorId]);

  // Set initial patient & date values
  React.useEffect(() => {
    if (open) {
      if (initialPatient) {
        setSelectedPatient(initialPatient);
        setFormData((prev) => ({
          ...prev,
          fullName: initialPatient.fullName,
          phone: initialPatient.phone,
          uhid: initialPatient.uhid,
          appointmentDate: initialDate || prev.appointmentDate,
        }));
      } else if (initialDate) {
        setFormData((prev) => ({
          ...prev,
          appointmentDate: initialDate,
        }));
      }
    }
  }, [open, initialPatient, initialDate]);

  // 2. Query verified available slots for selected doctor + date from backend
  React.useEffect(() => {
    if (!open || !formData.doctorId || !formData.appointmentDate) return;

    // Check if doctorId is a valid UUID before hitting server
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      formData.doctorId
    );
    if (!isUUID) return;

    setLoadingSlots(true);
    fetch(
      `/api/crm/appointments/slots?doctorId=${formData.doctorId}&date=${formData.appointmentDate}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.slots)) {
          setLiveSlots(data.slots);
          if (data.slots.length > 0) {
            // Keep selected slot if it's still available; otherwise auto-select first available slot
            const exists = data.slots.some(
              (s: any) =>
                s.localDisplay === formData.timeSlot || s.timeSlot === formData.timeSlot
            );
            if (!exists) {
              setFormData((prev) => ({
                ...prev,
                timeSlot: data.slots[0].localDisplay || data.slots[0].timeSlot,
              }));
            }
          }
        }
      })
      .catch(() => {
        setLiveSlots([]);
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [open, formData.doctorId, formData.appointmentDate]);

  // 3. Search real registered patients from Postgres
  React.useEffect(() => {
    if (!searchPatient.trim() || searchPatient.length < 2) {
      setDbPatientSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearchingPatients(true);
      fetch(`/api/crm/patients?query=${encodeURIComponent(searchPatient.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.patients)) {
            setDbPatientSuggestions(data.patients);
          }
        })
        .catch(() => {})
        .finally(() => setSearchingPatients(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [searchPatient]);

  // Merge suggestions from both DB and local store
  const mergedPatientSuggestions = React.useMemo(() => {
    const list = [...dbPatientSuggestions];
    const seenPhones = new Set(list.map((p) => p.phone?.replace(/\D/g, "")));

    const clean = searchPatient.toLowerCase();
    store.patients.forEach((p) => {
      const ph = p.phone.replace(/\D/g, "");
      if (
        !seenPhones.has(ph) &&
        (p.fullName.toLowerCase().includes(clean) ||
          p.phone.includes(clean) ||
          p.uhid.toLowerCase().includes(clean))
      ) {
        list.push(p);
        seenPhones.add(ph);
      }
    });

    return list.slice(0, 8);
  }, [dbPatientSuggestions, searchPatient, store.patients]);

  const selectSuggestedPatient = (p: any) => {
    setSelectedPatient(p);
    setFormData((prev) => ({
      ...prev,
      fullName: p.fullName,
      phone: p.phone,
      uhid: p.uhid,
    }));
    setSearchPatient("");
  };

  // Auto-detect existing patient when 10 digits are typed in the phone field
  React.useEffect(() => {
    const clean = formData.phone.replace(/\D/g, "");
    if (clean.length === 10 && !selectedPatient) {
      fetch(`/api/crm/patients?query=${clean}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.patients && data.patients.length > 0) {
            const match = data.patients.find((p: any) =>
              p.phone?.replace(/\D/g, "").endsWith(clean)
            );
            if (match) {
              setSelectedPatient(match);
              setFormData((prev) => ({
                ...prev,
                fullName: prev.fullName || match.fullName,
                uhid: match.uhid,
              }));
            }
          }
        })
        .catch(() => {});
    }
  }, [formData.phone, selectedPatient]);

  const handleDoctorChange = (docId: string) => {
    const doc = doctors.find((d) => d.id === docId);
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
      setBookingError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsSubmitting(true);
    setBookingError(null);

    try {
      // 1. Ensure patient exists in PostgreSQL database
      let patientId = selectedPatient?.id;
      let uhid = formData.uhid;

      const isUUID =
        patientId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId);

      if (!isUUID) {
        const patRes = await fetch("/api/crm/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: formData.fullName.trim(),
            phone: cleanPhone,
            gender: "other",
          }),
        });

        const patData = await patRes.json().catch(() => ({}));
        if (!patRes.ok) {
          throw new Error(patData.error || "Failed to register patient in clinic database.");
        }

        patientId = patData.patient?.id;
        uhid = patData.patient?.uhid;
      }

      // 2. Validate selected doctor UUID
      const selectedDoc = doctors.find((d) => d.id === formData.doctorId) || doctors[0];
      const isDocUUID =
        selectedDoc?.id &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedDoc.id);

      if (!isDocUUID) {
        throw new Error(
          "Please select a valid active doctor profile registered in this clinic."
        );
      }

      // 3. Create appointment in PostgreSQL database with concurrency lock
      const apptRes = await fetch("/api/crm/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          doctorId: selectedDoc.id,
          department: selectedDoc.dept,
          appointmentDate: formData.appointmentDate,
          timeSlot: formData.timeSlot,
          priority: isQuickWalkIn ? "urgent" : formData.priority,
          chiefComplaints: formData.chiefComplaints || undefined,
          consultationFee: String(formData.fee || selectedDoc.fee || 500),
          source: "WEB",
        }),
      });

      const apptData = await apptRes.json().catch(() => ({}));

      if (!apptRes.ok) {
        if (apptRes.status === 409) {
          throw new Error(
            apptData.error ||
              "This doctor slot was just booked by another patient. Please select an alternate slot."
          );
        }
        throw new Error(
          apptData.error || "Failed to schedule appointment in clinic database."
        );
      }

      const realAppointment = apptData.appointment;

      // 4. Update in-memory store for backwards compatibility
      const record = AppointmentService.createAppointmentRecord(
        {
          organizationId: realAppointment.organizationId,
          branchId: "br-main-001",
          patientId: patientId!,
          patientName: formData.fullName,
          patientPhone: cleanPhone,
          patientUhid: uhid || "UHID-GEN",
          doctorId: selectedDoc.id,
          doctorName: selectedDoc.name,
          department: selectedDoc.dept,
          appointmentDate: formData.appointmentDate,
          timeSlot: formData.timeSlot,
          priority: isQuickWalkIn ? "urgent" : formData.priority,
          chiefComplaints: formData.chiefComplaints,
          consultationFee: formData.fee,
        },
        realAppointment.tokenNumber || store.appointments.length + 100
      );
      record.id = realAppointment.id;

      if (isQuickWalkIn) {
        record.status = "arrived";
        record.isPaid = true;
      }

      clinicalStore.addAppointment(record);

      // Trigger WhatsApp notification in background
      WabaService.sendAppointmentConfirmation({
        phone: cleanPhone,
        patientName: formData.fullName,
        doctorName: selectedDoc.name,
        appointmentDate: formData.appointmentDate,
        timeSlot: formData.timeSlot,
        tokenNumber: record.tokenNumber,
        hospitalName: store.settings.hospitalName,
      }).catch(() => {});

      if (onBookSuccess) onBookSuccess(record);
      onOpenChange(false);
    } catch (err: any) {
      let friendlyMsg =
        err.message || "Failed to schedule appointment. Please try again.";
      // Clean up raw database dumps
      if (
        friendlyMsg.includes("insert into") ||
        friendlyMsg.includes("select") ||
        friendlyMsg.includes("values (")
      ) {
        friendlyMsg =
          "A database conflict occurred while saving. The patient or slot was already reserved. Please retry.";
      }
      setBookingError(friendlyMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Computed slots to display: prioritize live backend slots, fallback to standard working hours
  const displayedSlots = React.useMemo(() => {
    if (liveSlots.length > 0) {
      return liveSlots.map((s) => ({
        time: s.localDisplay || s.timeSlot,
        value: s.localDisplay || s.timeSlot,
        available: true,
      }));
    }
    return DEFAULT_FALLBACK_SLOTS.map((s) => ({
      time: s.time,
      value: s.time,
      available: s.available,
    }));
  }, [liveSlots]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden sm:rounded-2xl shadow-2xl border-slate-200">
        {/* =========================================================================
            FIXED HEADER: Anchored at top, visible title, subtitle, and explicit Close (X) button
           ========================================================================= */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              {isQuickWalkIn ? (
                <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
              ) : (
                <Clock className="h-4 w-4 text-[#2563EB]" />
              )}
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900 leading-tight">
                {isQuickWalkIn ? "Issue Instant Walk-In Token" : "Book Patient OPD Appointment"}
              </DialogTitle>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isQuickWalkIn
                  ? "Immediate walk-in consultation token with auto check-in"
                  : "Verified doctor schedule, slot availability & token generator"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Close dialog (Esc)"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* =========================================================================
            SCROLLABLE FORM BODY: Never overflows viewport, clean padding & high-density layout
           ========================================================================= */}
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => handleEnterNavigation(e)}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
            {/* Friendly Booking Error Alert */}
            {bookingError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start justify-between gap-2 shadow-2xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Scheduling Notice:</span>
                    <span>{bookingError}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBookingError(null)}
                  className="text-rose-500 hover:text-rose-800 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Patient Search & Autocomplete */}
            <div className="relative">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Search Registered Patient (UHID / Phone / Name)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={searchPatient}
                  onChange={(e) => setSearchPatient(e.target.value)}
                  placeholder="Type name, phone (e.g. 81789...) or UHID..."
                  className="pl-9 text-xs h-9"
                />
                {searchingPatients && (
                  <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 animate-spin" />
                )}
              </div>

              {mergedPatientSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl p-1 divide-y divide-slate-100">
                  {mergedPatientSuggestions.map((p) => (
                    <button
                      key={p.id || p.uhid}
                      type="button"
                      onClick={() => selectSuggestedPatient(p)}
                      className="w-full p-2 text-left hover:bg-blue-50/80 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">{p.fullName}</span>
                        <span className="text-slate-400 ml-2 font-mono text-[11px]">
                          ({p.uhid})
                        </span>
                      </div>
                      <span className="font-mono text-slate-600 text-[11px]">{p.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Patient Banner */}
            {selectedPatient && (
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-[#2563EB] shrink-0" />
                  <span className="font-semibold text-blue-900">
                    Linked Patient: {selectedPatient.fullName}{" "}
                    <span className="font-mono text-blue-700">({selectedPatient.uhid})</span>
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPatient(null);
                    setFormData((prev) => ({ ...prev, fullName: "", phone: "", uhid: "" }));
                  }}
                  className="h-6 text-[10px] text-blue-700 hover:text-blue-900 hover:bg-blue-100 cursor-pointer"
                >
                  Change
                </Button>
              </div>
            )}

            {/* Patient Name & Phone Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Patient Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Enter patient name"
                    className="pl-8 text-xs h-9"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  10-Digit Mobile Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={formData.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setFormData({ ...formData, phone: val });
                    }}
                    placeholder="Enter 10-digit mobile"
                    inputMode="numeric"
                    maxLength={10}
                    className="pl-8 text-xs h-9 font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Attending Doctor Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Select Attending Doctor & Department
                </label>
                <span className="text-[10px] text-slate-400">Official Clinic Roster</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {doctors.map((doc) => {
                  const isSelected = formData.doctorId === doc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleDoctorChange(doc.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#2563EB] bg-blue-50/70 ring-1 ring-blue-500 shadow-2xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900 truncate">{doc.name}</div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">{doc.dept}</div>
                      <div className="text-[11px] font-bold text-[#2563EB] mt-1.5">₹{doc.fee}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Appointment Date & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Appointment Date
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={formData.appointmentDate}
                    onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                    className="text-xs h-9"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Priority Triage
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="normal">Normal Outpatient</option>
                  <option value="urgent">Urgent Consult</option>
                  <option value="emergency">Emergency Fast-Track</option>
                </select>
              </div>
            </div>

            {/* Live Available Slots */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                  <span>Available Time Slots</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {loadingSlots ? (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Verifying availability...
                    </span>
                  ) : liveSlots.length > 0 ? (
                    <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200 font-medium">
                      ● Live Verified
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-slate-400">Green = Available</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {displayedSlots.map((slot) => {
                  const isSelected = formData.timeSlot === slot.value || formData.timeSlot === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setFormData({ ...formData, timeSlot: slot.value })}
                      className={`py-2 px-2.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                        !slot.available
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed line-through opacity-60"
                          : isSelected
                          ? "bg-[#2563EB] text-white shadow-xs font-bold ring-2 ring-blue-300"
                          : "bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/30"
                      }`}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                All time slots are synchronized to clinic timezone (Asia/Kolkata) and checked against active doctor bookings.
              </p>
            </div>

            {/* Chief Complaints */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Chief Complaints & Visit Notes
              </label>
              <Input
                value={formData.chiefComplaints}
                onChange={(e) => setFormData({ ...formData, chiefComplaints: e.target.value })}
                placeholder="e.g. Fever with chills, chest tightness, post-op suture check"
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* =========================================================================
              FIXED FOOTER: Anchored at bottom, Total Fee, Cancel and Confirm buttons
             ========================================================================= */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
            <div className="text-xs text-slate-600">
              Consultation Fee: <span className="font-bold text-slate-900 text-sm">₹{formData.fee}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs h-8 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-[#2563EB] hover:bg-blue-700 text-xs h-8 font-semibold cursor-pointer gap-1.5 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Scheduling...</span>
                  </>
                ) : isQuickWalkIn ? (
                  <>
                    <Zap className="h-3.5 w-3.5 fill-white" />
                    <span>Issue Token & Print</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Generate Token & Confirm</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
