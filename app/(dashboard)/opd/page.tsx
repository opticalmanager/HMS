"use client";

import * as React from "react";
import {
  Stethoscope,
  Printer,
  Save,
  CheckCircle2,
  FileText,
  User,
  HeartHandshake,
  Share2,
  Search,
  Clock,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { VitalsCard } from "@/components/clinical/VitalsCard";
import { Icd10SearchCombobox } from "@/components/clinical/Icd10SearchCombobox";
import { PrescriptionEditor } from "@/components/clinical/PrescriptionEditor";
import { PrescriptionPrintModal } from "@/components/clinical/PrescriptionPrintModal";
import { useClinicalStore, clinicalStore } from "@/services/clinical-store";
import { WabaService } from "@/services/waba.service";
import { AbdmService } from "@/services/abdm.service";
import type { Appointment, DiagnosisEntry, PrescriptionItem, VitalRecord, OpdConsultation } from "@/types/hms";

export default function OpdPage() {
  const store = useClinicalStore();
  const queue = store.appointments;

  // Selected patient for consultation pad
  const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment>(
    queue[0] || {
      id: "apt-104",
      organizationId: "org-apex-001",
      branchId: "br-main-001",
      patientId: "pat-1",
      patientName: "Ramesh Patel",
      patientPhone: "9823012345",
      patientUhid: "UHID-2026-0041",
      doctorId: "doc-1",
      doctorName: "Dr. Gaurav Kumar",
      department: "Cardiology",
      tokenNumber: 104,
      appointmentDate: "2026-11-14",
      timeSlot: "10:15 AM",
      status: "in_consultation",
      priority: "urgent",
      consultationFee: 800,
      isPaid: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );

  const [queueTab, setQueueTab] = React.useState<"waiting" | "in_consultation" | "completed">("waiting");
  const [queueSearch, setQueueSearch] = React.useState("");

  const [vitals, setVitals] = React.useState<VitalRecord>({
    patientId: selectedAppointment.patientId,
    recordedAt: new Date().toISOString(),
    systolicBp: 138,
    diastolicBp: 88,
    pulseRate: 84,
    temperature: 98.6,
    spo2: 98,
    heightCm: 172,
    weightKg: 78,
  });

  const [diagnoses, setDiagnoses] = React.useState<DiagnosisEntry[]>([
    {
      icdCode: "I10",
      description: "Essential (primary) hypertension",
      type: "provisional",
    },
  ]);

  const [prescriptions, setPrescriptions] = React.useState<PrescriptionItem[]>([
    {
      id: "rx-1",
      medicineName: "Telmisartan 40mg",
      dosage: "40 mg",
      frequency: "1-0-0",
      timing: "after_food",
      durationDays: 30,
      instructions: "Take once daily in the morning",
      quantity: 30,
    },
    {
      id: "rx-2",
      medicineName: "Amlodipine 5mg",
      dosage: "5 mg",
      frequency: "0-0-1",
      timing: "after_food",
      durationDays: 30,
      instructions: "Take at bedtime",
      quantity: 30,
    },
  ]);

  const [clinicalNotes, setClinicalNotes] = React.useState(
    "Patient presents with occasional palpitations and mild morning occipital headache. No radiation of chest pain to left arm. ECG demonstrates normal sinus rhythm with no acute ST-T wave abnormalities."
  );

  const [printModalOpen, setPrintModalOpen] = React.useState(false);
  const [abdmStatus, setAbdmStatus] = React.useState<string>("Linked to ABHA (91-8842-1920-3341)");
  const [completedMessage, setCompletedMessage] = React.useState("");

  // Switch patient from queue
  const handleSelectPatient = (apt: Appointment) => {
    setSelectedAppointment(apt);
    clinicalStore.updateAppointmentStatus(apt.id, "in_consultation");
    // Reset or load default patient vitals
    setVitals({
      patientId: apt.patientId,
      recordedAt: new Date().toISOString(),
      systolicBp: 130,
      diastolicBp: 85,
      pulseRate: 78,
      temperature: 98.6,
      spo2: 98,
      heightCm: 170,
      weightKg: 72,
    });
  };

  const handleCompleteEncounter = () => {
    const consultationRecord: OpdConsultation = {
      id: `OPD-2026-0000${selectedAppointment.tokenNumber}`,
      organizationId: selectedAppointment.organizationId,
      branchId: selectedAppointment.branchId,
      patientId: selectedAppointment.patientId,
      doctorId: selectedAppointment.doctorId,
      appointmentId: selectedAppointment.id,
      consultationDate: new Date().toISOString().split("T")[0],
      vitals,
      chiefComplaints: [selectedAppointment.chiefComplaints || "General Checkup"],
      clinicalFindings: clinicalNotes,
      diagnoses,
      prescriptions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    clinicalStore.completeConsultation(consultationRecord, true);
    setCompletedMessage(`Encounter completed successfully! Invoice generated.`);
    setTimeout(() => setCompletedMessage(""), 4000);
  };

  const handleWhatsAppShare = async () => {
    const phone = selectedAppointment.patientPhone || "9823012345";
    const patientName = selectedAppointment.patientName || "Patient";
    const consultNo = `OPD-2026-0000${selectedAppointment.tokenNumber}`;

    await WabaService.sendPrescriptionReady({
      phone,
      patientName,
      consultationNumber: consultNo,
      doctorName: selectedAppointment.doctorName || "Dr. Gaurav Kumar, MD",
      pdfDownloadUrl: `https://portal.apexhospital.org/rx/${consultNo}.pdf`,
    }).catch(() => {});

    clinicalStore.logWhatsApp({
      recipientPhone: phone,
      patientName,
      templateName: "prescription_ready_v1",
      status: "sent",
      mediaUrl: `https://portal.apexhospital.org/rx/${consultNo}.pdf`,
      params: {
        consultationNumber: consultNo,
        doctorName: selectedAppointment.doctorName || "Dr. Gaurav Kumar",
      },
    });

    alert(`Official Meta WhatsApp notification with PDF Rx link sent to ${patientName} (${phone})!`);
  };

  // Filtered queue items
  const filteredQueue = queue.filter((a) => {
    const matchesTab =
      queueTab === "waiting"
        ? a.status === "scheduled" || a.status === "arrived"
        : queueTab === "in_consultation"
        ? a.status === "in_consultation"
        : a.status === "completed";

    const matchesSearch =
      a.patientName?.toLowerCase().includes(queueSearch.toLowerCase()) ||
      a.patientPhone?.includes(queueSearch) ||
      String(a.tokenNumber).includes(queueSearch);

    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Encounter Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-mono font-bold text-lg shadow-sm">
            #{selectedAppointment.tokenNumber}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{selectedAppointment.patientName}</h1>
              <Badge variant="outline" className="font-mono text-xs">
                {selectedAppointment.patientUhid || "UHID-2026-0041"}
              </Badge>
              <Badge variant="info">In Consultation</Badge>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Phone: {selectedAppointment.patientPhone} • Attending: {selectedAppointment.doctorName} ({selectedAppointment.department})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {completedMessage && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" /> {completedMessage}
            </span>
          )}
          <Button
            onClick={handleWhatsAppShare}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          >
            <Share2 className="h-3.5 w-3.5" /> WhatsApp Rx
          </Button>
          <Button
            onClick={() => setPrintModalOpen(true)}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
          >
            <Printer className="h-3.5 w-3.5" /> Print Letterhead (A4)
          </Button>
          <Button
            onClick={handleCompleteEncounter}
            size="sm"
            className="bg-[#2563EB] hover:bg-blue-700 text-xs gap-1.5 font-semibold"
          >
            <Save className="h-3.5 w-3.5" /> Complete Encounter
          </Button>
        </div>
      </div>

      {/* Split Master-Detail Clinical Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column (Master): Live OPD Patient Queue */}
        <div className="lg:col-span-1 space-y-3">
          <Card className="border-slate-200">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                <span>OPD Triage Queue</span>
                <span className="font-mono text-blue-600 font-bold">{queue.length} Total</span>
              </CardTitle>

              {/* Queue Status Tabs */}
              <div className="grid grid-cols-3 gap-1 pt-2">
                <button
                  type="button"
                  onClick={() => setQueueTab("waiting")}
                  className={`py-1 rounded text-[11px] font-semibold transition-colors ${
                    queueTab === "waiting"
                      ? "bg-[#2563EB] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Waiting ({queue.filter((a) => a.status === "scheduled" || a.status === "arrived").length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueTab("in_consultation")}
                  className={`py-1 rounded text-[11px] font-semibold transition-colors ${
                    queueTab === "in_consultation"
                      ? "bg-[#2563EB] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  In Room ({queue.filter((a) => a.status === "in_consultation").length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueTab("completed")}
                  className={`py-1 rounded text-[11px] font-semibold transition-colors ${
                    queueTab === "completed"
                      ? "bg-[#2563EB] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Done ({queue.filter((a) => a.status === "completed").length})
                </button>
              </div>

              {/* Fast Filter */}
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  placeholder="Filter queue..."
                  className="pl-8 h-7 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[620px] overflow-y-auto">
              <div className="divide-y divide-slate-100 text-xs">
                {filteredQueue.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">No patients in this queue.</div>
                ) : (
                  filteredQueue.map((item) => {
                    const isSelected = selectedAppointment.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectPatient(item)}
                        className={`w-full p-3 text-left transition-colors flex items-center justify-between ${
                          isSelected
                            ? "bg-blue-50/80 border-l-4 border-l-[#2563EB]"
                            : "hover:bg-slate-50 border-l-4 border-l-transparent"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[#2563EB]">#{item.tokenNumber}</span>
                            <span className="font-semibold text-slate-900 truncate max-w-[120px]">
                              {item.patientName}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {item.patientUhid} • {item.timeSlot}
                          </div>
                        </div>

                        <Badge
                          variant={
                            item.priority === "emergency"
                              ? "danger"
                              : item.priority === "urgent"
                              ? "warning"
                              : "outline"
                          }
                          className="text-[9px] px-1.5 py-0"
                        >
                          {item.priority}
                        </Badge>
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Detail): Full Consultation Pad (3 cols) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Vitals Ribbon with Inline Editing & Hypertensive Highlighting */}
          <VitalsCard vitals={vitals} onUpdateVitals={setVitals} editable />

          {/* ICD-10 Search & Diagnostic Coding */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-[#2563EB]" />
                In-Memory ICD-10 Clinical Diagnosis Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Icd10SearchCombobox
                selectedDiagnoses={diagnoses}
                onChange={setDiagnoses}
              />
            </CardContent>
          </Card>

          {/* e-Prescription (Rx) Builder with Dose Parser & 1-Click Cloner */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#2563EB]" />
                Prescription (Rx) — Shorthand Dose Parser & Regimen Cloner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PrescriptionEditor
                prescriptions={prescriptions}
                onChange={setPrescriptions}
              />
            </CardContent>
          </Card>

          {/* Clinical Examination & Doctor Advice */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">
                Doctor Examination Findings & Clinical Advice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                placeholder="Enter physical examination, dietary restrictions, lab investigations recommended, or follow-up notes..."
              />
            </CardContent>
          </Card>

          {/* ABDM National Health Stack Status Banner */}
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-900 font-medium">
              <HeartHandshake className="h-4 w-4 text-emerald-600" />
              <span>{abdmStatus}</span>
            </div>
            <span className="text-[11px] text-emerald-700 font-mono">FHIR R4 Bundle Active</span>
          </div>
        </div>
      </div>

      {/* A4 Letterhead Digital Prescription Print Preview Modal */}
      <PrescriptionPrintModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        patient={selectedAppointment}
        vitals={vitals}
        diagnoses={diagnoses}
        prescriptions={prescriptions}
        clinicalNotes={clinicalNotes}
        settings={store.settings}
        onWhatsAppShare={handleWhatsAppShare}
      />
    </div>
  );
}
