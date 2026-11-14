"use client";

import * as React from "react";
import {
  Paperclip,
  ChevronDown,
  ChevronUp,
  FileText,
  Upload,
  Plus,
  Trash2,
  Stethoscope,
  Heart,
  Pill,
  Microscope,
  FileCheck,
  Calendar,
  Save,
  Printer,
  Send,
  Receipt,
  CheckCircle2,
  Sparkles,
  Info,
  Clock,
  Search,
  X,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Icd10SearchCombobox } from "@/components/clinical/Icd10SearchCombobox";
import { VitalsCard } from "@/components/clinical/VitalsCard";
import { clinicalStore, useClinicalStore } from "@/services/clinical-store";
import { WabaService } from "@/services/waba.service";
import type {
  Appointment,
  Patient,
  VitalRecord,
  DiagnosisEntry,
  PrescriptionItem,
  ClinicalAttachment,
  LabInvestigationOrder,
  OpdConsultationRecord,
} from "@/types/hms";

interface OpdConsultationWorkspaceProps {
  appointment: Appointment;
  patient: Patient | null;
  onOpenUploadModal: () => void;
  onOpenBillingModal: () => void;
  onOpenPrintModal: () => void;
}

const COMMON_CHIEF_COMPLAINTS = [
  "Blurry distance vision",
  "Ocular strain with computer screen",
  "Foreign body sensation in eye",
  "Frequent frontal headaches",
  "Photophobia & glare sensitivity",
  "Dryness & burning ocular sensation",
  "Near vision blurring (reading difficulty)",
  "Watering & epiphora",
  "Floaters & flashers screening",
];

const COMMON_HISTORY_TAGS = [
  "No known prior ocular surgery",
  "Family history of glaucoma",
  "History of wearing spectacles",
  "Contact lens wearer",
  "Known hypertensive on medication",
  "Type 2 diabetic under glycemic control",
  "No prior drug allergies",
];

const QUICK_DIAGNOSES = [
  { code: "H52.13", desc: "Myopia, bilateral (Simple Myopia)" },
  { code: "H52.20", desc: "Unspecified astigmatism" },
  { code: "H52.4", desc: "Presbyopia" },
  { code: "H04.12", desc: "Dry eye syndrome (bilateral)" },
  { code: "H10.1", desc: "Acute atopic conjunctivitis" },
];

const COMMON_INVESTIGATIONS = [
  "Pentacam Corneal Topography",
  "Fundus Photo & Retinal Imaging",
  "OCT Macula / RNFL Analysis",
  "Visual Field Perimetry (HFA 24-2)",
  "IOP Non-Contact / Applanation Tonometry",
  "CBC & Erythrocyte Sedimentation Rate",
  "HbA1c Glycated Hemoglobin",
];

const COMMON_MEDICINES = [
  { name: "Carboxymethylcellulose 0.5% Drops", type: "Eye Drops", dosage: "1 drop", freq: "1-1-1", timing: "with_food", days: 30 },
  { name: "Moxifloxacin 0.5% Drops", type: "Eye Drops", dosage: "1 drop", freq: "1-1-1", timing: "with_food", days: 7 },
  { name: "Olopatadine 0.1% Antiallergic Drops", type: "Eye Drops", dosage: "1 drop", freq: "1-0-1", timing: "with_food", days: 14 },
  { name: "Sodium Hyaluronate 0.1% Eye Drops", type: "Eye Drops", dosage: "1 drop", freq: "1-1-1", timing: "with_food", days: 30 },
  { name: "Paracetamol 650mg", type: "Tab", dosage: "650 mg", freq: "SOS", timing: "after_food", days: 3 },
  { name: "Pantoprazole 40mg", type: "Tab", dosage: "40 mg", freq: "1-0-0", timing: "before_food", days: 14 },
];

export function OpdConsultationWorkspace({
  appointment,
  patient,
  onOpenUploadModal,
  onOpenBillingModal,
  onOpenPrintModal,
}: OpdConsultationWorkspaceProps) {
  const store = useClinicalStore();

  // Collapsible Attachment Accordion - DEFAULT COLLAPSED to prevent screen clutter
  const [attachmentsExpanded, setAttachmentsExpanded] = React.useState(false);

  // Active Clinical Tab (7 Clean Tabs)
  const [activeTab, setActiveTab] = React.useState<
    "symptoms" | "vitals" | "diagnosis" | "rx" | "investigations" | "advice" | "notes"
  >("symptoms");

  // Clinical Consultation State
  const [complaintText, setComplaintText] = React.useState(appointment.chiefComplaints || "");
  const [durationValue, setDurationValue] = React.useState("2");
  const [durationUnit, setDurationUnit] = React.useState<"days" | "weeks" | "months">("weeks");
  const [selectedHistoryChips, setSelectedHistoryChips] = React.useState<string[]>([
    "No known prior ocular surgery",
  ]);
  const [showSymptomPresets, setShowSymptomPresets] = React.useState(false);
  const [showHistoryPresets, setShowHistoryPresets] = React.useState(false);

  // Vitals State
  const [vitals, setVitals] = React.useState<VitalRecord>({
    patientId: appointment.patientId,
    recordedAt: new Date().toISOString(),
    systolicBp: 124,
    diastolicBp: 82,
    pulseRate: 76,
    temperature: 98.6,
    spo2: 98,
    heightCm: 172,
    weightKg: 68,
  });

  // Diagnoses State
  const [diagnoses, setDiagnoses] = React.useState<DiagnosisEntry[]>([
    {
      icdCode: "H52.13",
      description: "Myopia, bilateral (Simple Myopia)",
      type: "final",
    },
  ]);

  // Prescriptions State
  const [prescriptions, setPrescriptions] = React.useState<PrescriptionItem[]>([
    {
      id: "rx-init-1",
      medicineName: "Carboxymethylcellulose 0.5% Drops",
      dosage: "1 drop",
      frequency: "1-1-1",
      timing: "with_food",
      durationDays: 30,
      instructions: "Instill 1 drop in both eyes three times daily",
      quantity: 1,
    },
  ]);

  // Fast Medicine Entry Form
  const [newMedName, setNewMedName] = React.useState("");
  const [newMedDosage, setNewMedDosage] = React.useState("1 drop");
  const [newMedFreq, setNewMedFreq] = React.useState("1-1-1");
  const [newMedTiming, setNewMedTiming] = React.useState<any>("after_food");
  const [newMedDays, setNewMedDays] = React.useState<number>(14);

  // Investigations State
  const [investigations, setInvestigations] = React.useState<string[]>([
    "Fundus Photo & Retinal Imaging",
  ]);

  // Advice & Precautions State
  const [adviceList, setAdviceList] = React.useState<string[]>([
    "Practice 20-20-20 rule during prolonged screen use",
    "Wear anti-reflective blue-cut coating lenses",
  ]);
  const [newAdviceInput, setNewAdviceInput] = React.useState("");

  // Follow-Up State
  const [followUpDays, setFollowUpDays] = React.useState<number>(14);
  const [customFollowUpDate, setCustomFollowUpDate] = React.useState<string>("");

  // Doctor Confidential Notes
  const [doctorNotes, setDoctorNotes] = React.useState(
    "OD 6/6 with -1.50 D Sph, OS 6/6 with -1.75 D Sph. Slit lamp normal anterior segment, tear breakup time (TBUT) 8 seconds."
  );

  const [isSavedFeedback, setIsSavedFeedback] = React.useState(false);

  // Attachments for this appointment
  const currentAttachments = React.useMemo(() => {
    return store.clinicalAttachments.filter(
      (a) => a.appointmentId === appointment.id || a.patientId === appointment.patientId
    );
  }, [store.clinicalAttachments, appointment.id, appointment.patientId]);

  // Quick Chips Handlers
  const toggleHistoryChip = (chip: string) => {
    setSelectedHistoryChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const addComplaintPreset = (c: string) => {
    setComplaintText((prev) => (prev ? `${prev}, ${c}` : c));
    setShowSymptomPresets(false);
  };

  const handleAddQuickDiagnosis = (qd: { code: string; desc: string }) => {
    if (!diagnoses.some((d) => d.icdCode === qd.code)) {
      setDiagnoses((prev) => [
        ...prev,
        { icdCode: qd.code, description: qd.desc, type: "final" },
      ]);
    }
  };

  const handleRemoveDiagnosis = (index: number) => {
    setDiagnoses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCustomMedicine = () => {
    if (!newMedName.trim()) return;
    const item: PrescriptionItem = {
      id: `rx-${Date.now()}`,
      medicineName: newMedName.trim(),
      dosage: newMedDosage,
      frequency: newMedFreq,
      timing: newMedTiming,
      durationDays: newMedDays,
      instructions: "As directed by physician",
      quantity: Math.max(1, Math.ceil(newMedDays / 15)),
    };
    setPrescriptions((prev) => [...prev, item]);
    setNewMedName("");
  };

  const handleAddQuickMedicine = (med: (typeof COMMON_MEDICINES)[0]) => {
    const item: PrescriptionItem = {
      id: `rx-${Date.now()}`,
      medicineName: med.name,
      dosage: med.dosage,
      frequency: med.freq,
      timing: med.timing as any,
      durationDays: med.days,
      instructions: "As directed by physician",
      quantity: med.type === "Eye Drops" ? 1 : Math.ceil(med.days * 2),
    };
    setPrescriptions((prev) => [...prev, item]);
  };

  const handleRemoveMedicine = (id: string) => {
    setPrescriptions((prev) => prev.filter((m) => m.id !== id));
  };

  const toggleInvestigation = (test: string) => {
    setInvestigations((prev) =>
      prev.includes(test) ? prev.filter((t) => t !== test) : [...prev, test]
    );
  };

  const handleAddAdvice = () => {
    if (!newAdviceInput.trim()) return;
    setAdviceList((prev) => [...prev, newAdviceInput.trim()]);
    setNewAdviceInput("");
  };

  // Save Consultation Handlers
  const handleSaveDraft = () => {
    const consultationRecord: OpdConsultationRecord = {
      id: `opd-${appointment.id}`,
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName || "Dr. Rajeev Prasad",
      consultationDate: appointment.appointmentDate,
      chiefComplaints: complaintText,
      symptomsDuration: `${durationValue} ${durationUnit}`,
      clinicalHistoryChips: selectedHistoryChips,
      vitals,
      diagnoses,
      prescriptions,
      investigations: investigations.map((test) => ({
        id: `inv-${Date.now()}`,
        testName: test,
        category: "ocular",
        status: "ordered",
        orderedAt: new Date().toISOString(),
      })),
      clinicalAdvice: adviceList,
      followUpDays,
      followUpDate: customFollowUpDate,
      doctorNotes,
      isDraft: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    clinicalStore.saveConsultationDraft(consultationRecord);
    setIsSavedFeedback(true);
    setTimeout(() => setIsSavedFeedback(false), 2000);
  };

  const handleCompleteConsultation = () => {
    const consultationRecord: OpdConsultationRecord = {
      id: `opd-${appointment.id}`,
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName || "Dr. Rajeev Prasad",
      consultationDate: appointment.appointmentDate,
      chiefComplaints: complaintText,
      symptomsDuration: `${durationValue} ${durationUnit}`,
      clinicalHistoryChips: selectedHistoryChips,
      vitals,
      diagnoses,
      prescriptions,
      investigations: investigations.map((test) => ({
        id: `inv-${Date.now()}`,
        testName: test,
        category: "ocular",
        status: "ordered",
        orderedAt: new Date().toISOString(),
      })),
      clinicalAdvice: adviceList,
      followUpDays,
      followUpDate: customFollowUpDate,
      doctorNotes,
      isDraft: false,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    clinicalStore.completeOpdConsultation(consultationRecord);

    const cleanPhone = appointment.patientPhone?.replace(/\D/g, "") || "9871900034";
    WabaService.sendAppointmentConfirmation({
      phone: cleanPhone,
      patientName: appointment.patientName || "Patient",
      doctorName: appointment.doctorName || "Doctor",
      appointmentDate: appointment.appointmentDate,
      timeSlot: appointment.timeSlot,
      tokenNumber: appointment.tokenNumber,
      hospitalName: "Visual Eyez Eye Care Hospital",
    });

    alert("Consultation signed and completed successfully! Patient status updated to Completed.");
  };

  const handleSendWhatsAppSlip = () => {
    const cleanPhone = appointment.patientPhone?.replace(/\D/g, "") || "9871900034";
    WabaService.sendAppointmentConfirmation({
      phone: cleanPhone,
      patientName: appointment.patientName || "Patient",
      doctorName: appointment.doctorName || "Doctor",
      appointmentDate: appointment.appointmentDate,
      timeSlot: appointment.timeSlot,
      tokenNumber: appointment.tokenNumber,
      hospitalName: "Visual Eyez Eye Care Hospital",
    });
    alert("Digital Rx and Consultation Summary sent via WhatsApp!");
  };

  return (
    <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden h-[calc(100vh-7.5rem)] text-xs">
      {/* 1. Sleek Document Attachment Bar (Lean & Collapsed by Default) */}
      <div className="border-b border-slate-200 bg-white select-none">
        <div className="px-3 py-1.5 flex items-center justify-between bg-slate-50/40">
          <button
            onClick={() => setAttachmentsExpanded((v) => !v)}
            className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px] tracking-wide hover:text-blue-700 cursor-pointer"
          >
            <Paperclip className="h-3.5 w-3.5 text-amber-500" />
            <span>VIEW ATTACHMENTS</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono">
              {currentAttachments.length}
            </span>
            {attachmentsExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>

          <button
            onClick={onOpenUploadModal}
            className="text-[#1976D2] hover:text-blue-800 font-semibold text-[11px] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Upload className="h-3 w-3" /> Upload Document
          </button>
        </div>

        {/* Expandable Attachment Tray - Minimal & Lean */}
        {attachmentsExpanded && (
          <div className="px-3 py-2 bg-slate-50/70 border-t border-slate-100">
            {currentAttachments.length === 0 ? (
              <div className="py-2.5 flex items-center justify-center gap-2 text-slate-500 text-[11px]">
                <FileText className="h-4 w-4 text-slate-400" />
                <span>No attachments uploaded for this visit yet.</span>
                <button
                  onClick={onOpenUploadModal}
                  className="text-blue-600 font-semibold underline hover:text-blue-800 cursor-pointer ml-1"
                >
                  Upload now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {currentAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-1.5 rounded-md border border-slate-200 bg-white hover:border-blue-400 transition-all flex items-center gap-2 shadow-2xs"
                  >
                    <div className="h-7 w-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800 text-[11px] truncate" title={att.fileName}>
                        {att.fileName}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono">
                        {(att.fileSize / 1024).toFixed(0)} KB • {att.category}
                      </div>
                    </div>
                    <button
                      onClick={() => clinicalStore.removeClinicalAttachment(att.id)}
                      className="text-slate-400 hover:text-rose-600 p-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Sleek Clinical Navigation Tabs (No Clutter, Clean Underlines) */}
      <div className="flex items-center gap-0.5 border-b border-slate-200 px-3 bg-slate-50/60 select-none overflow-x-auto shrink-0">
        {[
          { key: "symptoms", label: "Symptoms & History", icon: Stethoscope },
          { key: "vitals", label: "Vitals", icon: Heart },
          { key: "diagnosis", label: "Diagnosis (ICD-10)", icon: FileCheck },
          { key: "rx", label: "Rx Prescriptions", icon: Pill },
          { key: "investigations", label: "Investigations", icon: Microscope },
          { key: "advice", label: "Advice & Follow-Up", icon: Info },
          { key: "notes", label: "Doctor Notes", icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-3 border-b-2 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? "border-[#1976D2] text-[#1976D2] bg-white font-bold"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Clinical Workspace Tab Panes (Clean, Progressive Disclosure) */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* Tab 1: Symptoms & History */}
        {activeTab === "symptoms" && (
          <div className="space-y-3 max-w-3xl">
            {/* Chief Complaints Input Row */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                  Chief Complaint & Duration
                </label>
                <button
                  type="button"
                  onClick={() => setShowSymptomPresets((v) => !v)}
                  className="text-[10px] text-[#1976D2] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" />
                  {showSymptomPresets ? "Hide Suggestions" : "+ Quick Symptoms"}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="E.g. Blurry distance vision and asthenopia..."
                    value={complaintText}
                    onChange={(e) => setComplaintText(e.target.value)}
                    className="text-xs h-8 pl-2.5 pr-7 bg-white border-slate-200"
                  />
                  {complaintText && (
                    <button
                      onClick={() => setComplaintText("")}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-500 font-medium">for</span>
                  <Input
                    type="number"
                    value={durationValue}
                    onChange={(e) => setDurationValue(e.target.value)}
                    className="text-xs h-8 w-14 text-center font-bold"
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value as any)}
                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 font-medium"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>

              {/* Collapsible Suggestions (Only visible when requested) */}
              {showSymptomPresets && (
                <div className="mt-2 p-2.5 rounded-lg border border-blue-100 bg-blue-50/40 space-y-1.5 transition-all">
                  <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                    Click to add presenting symptom:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_CHIEF_COMPLAINTS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => addComplaintPreset(c)}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white border border-blue-200 text-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        + {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Medical / Ocular History Section */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                  Clinical History & Known Risk Factors
                </span>
                <button
                  type="button"
                  onClick={() => setShowHistoryPresets((v) => !v)}
                  className="text-[10px] text-purple-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  {showHistoryPresets ? "Close Tags" : "+ Add History Tag"}
                </button>
              </div>

              {/* Selected Tags */}
              <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center">
                {selectedHistoryChips.length === 0 ? (
                  <span className="text-[11px] text-slate-400 italic">No prior clinical history noted.</span>
                ) : (
                  selectedHistoryChips.map((chip) => (
                    <span
                      key={chip}
                      className="px-2 py-0.5 rounded-full text-[11px] bg-purple-50 border border-purple-200 text-purple-900 font-medium flex items-center gap-1"
                    >
                      <span>{chip}</span>
                      <button
                        onClick={() => toggleHistoryChip(chip)}
                        className="text-purple-400 hover:text-purple-700 cursor-pointer"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Collapsible History Presets */}
              {showHistoryPresets && (
                <div className="mt-2 p-2 rounded-lg border border-purple-100 bg-purple-50/40 space-y-1">
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_HISTORY_TAGS.map((chip) => {
                      const isSelected = selectedHistoryChips.includes(chip);
                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => toggleHistoryChip(chip)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-purple-600 border-purple-600 text-white font-semibold"
                              : "bg-white border-purple-200 text-purple-800 hover:bg-purple-100"
                          }`}
                        >
                          {isSelected ? "✓ " : "+ "}
                          {chip}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Vitals */}
        {activeTab === "vitals" && (
          <div className="space-y-3 max-w-4xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                Patient Vital Signs & Biometrics
              </span>
              <Badge variant="outline" className="text-[10px]">
                Recorded {new Date(vitals.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Badge>
            </div>
            <VitalsCard vitals={vitals} onUpdateVitals={(v) => setVitals(v)} />
          </div>
        )}

        {/* Tab 3: Diagnosis (ICD-10) */}
        {activeTab === "diagnosis" && (
          <div className="space-y-3 max-w-3xl">
            <div>
              <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wide block mb-1">
                ICD-10 Diagnostic Catalog Search
              </label>
              <Icd10SearchCombobox
                selectedDiagnoses={diagnoses}
                onChange={(diags) => setDiagnoses(diags)}
              />
            </div>

            {/* Quick Favorites Row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Common:
              </span>
              {QUICK_DIAGNOSES.map((qd) => (
                <button
                  key={qd.code}
                  type="button"
                  onClick={() => handleAddQuickDiagnosis(qd)}
                  className="px-2 py-0.5 rounded text-[10px] font-medium border border-blue-200 bg-blue-50/60 text-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  + {qd.desc}
                </button>
              ))}
            </div>

            {/* Documented Diagnoses Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-24 text-[11px]">ICD Code</TableHead>
                    <TableHead className="text-[11px]">Condition Name</TableHead>
                    <TableHead className="w-24 text-center text-[11px]">Type</TableHead>
                    <TableHead className="w-10 text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diagnoses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-slate-400 text-xs">
                        No diagnoses added yet. Search ICD-10 catalog above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    diagnoses.map((d, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono font-bold text-blue-700 text-xs">
                          {d.icdCode}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900 text-xs">
                          {d.description}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                            {d.type || "Final"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            onClick={() => handleRemoveDiagnosis(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Tab 4: Rx Prescriptions */}
        {activeTab === "rx" && (
          <div className="space-y-3 max-w-4xl">
            {/* Fast Medicine Entry Row */}
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block">
                Quick Add Prescription
              </span>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-4">
                  <Input
                    placeholder="Medicine name (e.g. Moxifloxacin 0.5%)..."
                    value={newMedName}
                    onChange={(e) => setNewMedName(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    placeholder="Dosage (1 drop / 1 tab)"
                    value={newMedDosage}
                    onChange={(e) => setNewMedDosage(e.target.value)}
                    className="h-8 text-xs bg-white text-center"
                  />
                </div>
                <div className="col-span-2">
                  <select
                    value={newMedFreq}
                    onChange={(e) => setNewMedFreq(e.target.value)}
                    className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold"
                  >
                    <option value="1-0-1">1-0-1 (BD)</option>
                    <option value="1-1-1">1-1-1 (TDS)</option>
                    <option value="1-0-0">1-0-0 (OD)</option>
                    <option value="0-0-1">0-0-1 (Night)</option>
                    <option value="SOS">SOS (As needed)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <select
                    value={newMedTiming}
                    onChange={(e) => setNewMedTiming(e.target.value)}
                    className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold"
                  >
                    <option value="after_food">After Food</option>
                    <option value="before_food">Before Food</option>
                    <option value="with_food">With Food</option>
                  </select>
                </div>
                <div className="col-span-2 flex items-center gap-1">
                  <Input
                    type="number"
                    value={newMedDays}
                    onChange={(e) => setNewMedDays(Number(e.target.value))}
                    className="h-8 text-xs w-14 text-center font-bold bg-white"
                    title="Duration in days"
                  />
                  <Button
                    type="button"
                    onClick={handleAddCustomMedicine}
                    size="sm"
                    className="h-8 text-xs bg-[#1976D2] hover:bg-blue-700 text-white font-bold shrink-0 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Fast Presets */}
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Common:</span>
                {COMMON_MEDICINES.map((med, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAddQuickMedicine(med)}
                    className="px-2 py-0.5 rounded text-[10px] font-medium border border-purple-200 bg-purple-50/60 text-purple-800 hover:bg-purple-100 transition-colors cursor-pointer shrink-0"
                  >
                    + {med.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Prescriptions Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-[11px]">Medicine Name</TableHead>
                    <TableHead className="w-24 text-[11px]">Dosage</TableHead>
                    <TableHead className="w-24 text-center text-[11px]">Frequency</TableHead>
                    <TableHead className="w-28 text-[11px]">Timing</TableHead>
                    <TableHead className="w-16 text-center text-[11px]">Days</TableHead>
                    <TableHead className="w-16 text-center text-[11px]">Qty</TableHead>
                    <TableHead className="w-10 text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-slate-400 text-xs">
                        No medications prescribed yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    prescriptions.map((rx) => (
                      <TableRow key={rx.id}>
                        <TableCell className="font-semibold text-slate-900 text-xs">
                          {rx.medicineName}
                        </TableCell>
                        <TableCell className="text-slate-700 text-xs">{rx.dosage}</TableCell>
                        <TableCell className="text-center font-mono font-bold text-blue-700 text-xs">
                          {rx.frequency}
                        </TableCell>
                        <TableCell className="text-slate-600 capitalize text-xs">
                          {rx.timing.replace("_", " ")}
                        </TableCell>
                        <TableCell className="text-center text-slate-700 font-medium text-xs">
                          {rx.durationDays}d
                        </TableCell>
                        <TableCell className="text-center font-semibold text-slate-900 text-xs">
                          {rx.quantity}
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            onClick={() => handleRemoveMedicine(rx.id || "")}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Tab 5: Investigations */}
        {activeTab === "investigations" && (
          <div className="space-y-3 max-w-3xl">
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide block">
              Diagnostic Lab Orders & Ocular Scans
            </span>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_INVESTIGATIONS.map((inv) => {
                const isSelected = investigations.includes(inv);
                return (
                  <div
                    key={inv}
                    onClick={() => toggleInvestigation(inv)}
                    className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all text-xs ${
                      isSelected
                        ? "border-[#1976D2] bg-blue-50/60 font-semibold text-[#1976D2]"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{inv}</span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-[#1976D2]" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 6: Advice & Follow Up (Combined Lean View) */}
        {activeTab === "advice" && (
          <div className="space-y-4 max-w-3xl">
            {/* Advice Section */}
            <div>
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide block mb-1.5">
                Clinical Advice & Precautions
              </span>
              <div className="flex items-center gap-2 mb-2">
                <Input
                  placeholder="Add custom advice (e.g. Avoid direct glare, wash hands)..."
                  value={newAdviceInput}
                  onChange={(e) => setNewAdviceInput(e.target.value)}
                  className="h-8 text-xs flex-1 bg-white"
                />
                <Button onClick={handleAddAdvice} size="sm" className="h-8 text-xs bg-slate-800 hover:bg-slate-900 text-white cursor-pointer">
                  Add Advice
                </Button>
              </div>

              <div className="space-y-1.5">
                {adviceList.map((adv, i) => (
                  <div
                    key={i}
                    className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-800">• {adv}</span>
                    <button
                      onClick={() => setAdviceList((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Follow-Up Section */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide block mb-1.5">
                Follow-Up Scheduling
              </span>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  { label: "After 2 days", days: 2 },
                  { label: "After 1 week", days: 7 },
                  { label: "After 2 weeks", days: 14 },
                  { label: "After 1 month", days: 30 },
                  { label: "SOS (As Needed)", days: 0 },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setFollowUpDays(opt.days)}
                    className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all cursor-pointer ${
                      followUpDays === opt.days
                        ? "border-[#1976D2] bg-[#1976D2] text-white font-bold"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[11px] text-slate-500 font-medium">Or Pick Custom Date:</label>
                <Input
                  type="date"
                  value={customFollowUpDate}
                  onChange={(e) => setCustomFollowUpDate(e.target.value)}
                  className="h-7 text-xs w-40 bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Doctor Notes */}
        {activeTab === "notes" && (
          <div className="space-y-2 max-w-3xl">
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide block">
              Doctor Confidential Clinical Notes
            </span>
            <textarea
              rows={6}
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="Enter examination impressions, slit lamp findings, fundus evaluation, refraction details..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
            />
          </div>
        )}
      </div>

      {/* 4. Docked Bottom Action Bar (Fixed, Crisp, No Vertical Scrolling needed) */}
      <div className="p-2.5 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            className="text-xs h-7 gap-1.5 border-slate-300 bg-white cursor-pointer"
          >
            <Save className="h-3 w-3" />
            {isSavedFeedback ? "Saved Draft!" : "Save Draft"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenPrintModal}
            className="text-xs h-7 gap-1.5 border-slate-300 bg-white cursor-pointer"
          >
            <Printer className="h-3 w-3" />
            Print Rx
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSendWhatsAppSlip}
            className="text-xs h-7 gap-1.5 border-emerald-300 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100 cursor-pointer"
          >
            <Send className="h-3 w-3 text-emerald-600" />
            WhatsApp Slip
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenBillingModal}
            className="text-xs h-7 gap-1.5 border-rose-300 text-rose-800 bg-rose-50/50 hover:bg-rose-100 cursor-pointer"
          >
            <Receipt className="h-3 w-3 text-rose-600" />
            Create OPD Bill
          </Button>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleCompleteConsultation}
          className="text-xs h-7 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-xs"
        >
          <CheckCircle2 className="h-3 w-3" />
          Sign & Complete Consultation
        </Button>
      </div>
    </div>
  );
}