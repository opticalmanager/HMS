"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { ContextRail } from "./ContextRail";
import { ClinicalSafetyBanner } from "./ClinicalSafetyBanner";
import { DictationWorkspace } from "./DictationWorkspace";
import { DraftPrescriptionCard } from "./DraftPrescriptionCard";
import { DraftInvoiceCard } from "./DraftInvoiceCard";
import { StickyActionBar } from "./StickyActionBar";
import { RxPrintModal } from "./RxPrintModal";
import { CopilotChatWorkspace } from "./CopilotChatWorkspace";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, FileText, MessageSquare, AlertCircle, CheckCircle2 } from "lucide-react";
import type { AllergyAlert } from "@/modules/ai/copilot/dictation-orchestrator";
import type { GroundedPrescriptionItem } from "@/services/domain/prescription-service";
import type { GroundedInvoiceItem } from "@/services/domain/billing-service";

export function CopilotWorkspace() {
  const searchParams = useSearchParams();
  const initialPatientId = searchParams.get("patientId") || undefined;
  const initialDoctorId = searchParams.get("doctorId") || undefined;
  const initialAppointmentId = searchParams.get("appointmentId") || undefined;

  const [activeTab, setActiveTab] = React.useState<"dictation" | "chat">("dictation");

  // Context State
  const [isLoadingContext, setIsLoadingContext] = React.useState(true);
  const [contextError, setContextError] = React.useState<string | null>(null);
  const [doctors, setDoctors] = React.useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = React.useState<string>("");
  const [queue, setQueue] = React.useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = React.useState<any | null>(null);
  const [activeAppointmentId, setActiveAppointmentId] = React.useState<string | null>(
    initialAppointmentId || null
  );
  const [capabilities, setCapabilities] = React.useState<any>({
    canApprovePrescription: true,
    isDoctorUser: true,
  });

  // Clinical Draft State
  const [prescriptionId, setPrescriptionId] = React.useState<string | undefined>(undefined);
  const [chiefComplaint, setChiefComplaint] = React.useState("");
  const [diagnosis, setDiagnosis] = React.useState("");
  const [followUpDays, setFollowUpDays] = React.useState<number | null>(3);
  const [prescriptionItems, setPrescriptionItems] = React.useState<GroundedPrescriptionItem[]>([]);
  const [isApproved, setIsApproved] = React.useState(false);

  // Billing Draft State
  const [invoiceId, setInvoiceId] = React.useState<string | undefined>(undefined);
  const [invoiceNumber, setInvoiceNumber] = React.useState<string | undefined>(undefined);
  const [invoiceItems, setInvoiceItems] = React.useState<GroundedInvoiceItem[]>([]);
  const [invoiceNotes, setInvoiceNotes] = React.useState("");

  // Allergy Alerts
  const [allergyAlerts, setAllergyAlerts] = React.useState<AllergyAlert[]>([]);

  // Action Bar Status
  const [isDictating, setIsDictating] = React.useState(false);
  const [dictationStatus, setDictationStatus] = React.useState<string>("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [isApproving, setIsApproving] = React.useState(false);
  const [showPrintModal, setShowPrintModal] = React.useState(false);

  // Load clinic encounter context
  const loadContext = React.useCallback(
    async (patientId?: string, doctorId?: string, appointmentId?: string | null) => {
      try {
        setIsLoadingContext(true);
        setContextError(null);
        const params = new URLSearchParams();
        if (patientId) params.set("patientId", patientId);
        if (doctorId) params.set("doctorId", doctorId);
        const effectiveAppointmentId =
          appointmentId !== undefined ? appointmentId : activeAppointmentId;
        if (effectiveAppointmentId) params.set("appointmentId", effectiveAppointmentId);

        const res = await fetch(`/api/crm/copilot/context?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to load copilot context");
        }

        setDoctors(data.doctors || []);
        setQueue(data.todayQueue || []);
        if (data.selectedPatient) setSelectedPatient(data.selectedPatient);
        if (data.capabilities) setCapabilities(data.capabilities);

        // Resolve active doctor
        if (doctorId) {
          setSelectedDoctorId(doctorId);
        } else if (data.linkedDoctorId) {
          setSelectedDoctorId(data.linkedDoctorId);
        } else if (data.doctors && data.doctors.length > 0) {
          setSelectedDoctorId(data.doctors[0].id);
        }
      } catch (err: any) {
        console.error("Context load error:", err);
        setContextError(err.message || "Failed to load clinic copilot context.");
      } finally {
        setIsLoadingContext(false);
      }
    },
    [activeAppointmentId]
  );

  React.useEffect(() => {
    loadContext(initialPatientId, initialDoctorId);
  }, [loadContext, initialPatientId, initialDoctorId]);

  // Handle switching patient from queue or directory
  const handleSelectPatient = (patientId: string, appointmentId?: string) => {
    setActiveAppointmentId(appointmentId || null);
    if (!patientId) {
      setSelectedPatient(null);
      setPrescriptionItems([]);
      setInvoiceItems([]);
      setPrescriptionId(undefined);
      setInvoiceId(undefined);
      setAllergyAlerts([]);
      return;
    }
    loadContext(patientId, selectedDoctorId, appointmentId);
  };

  // Handle audio dictation
  const handleDictateAudio = async (audioBlob: Blob) => {
    if (!selectedPatient || !selectedDoctorId) {
      alert("Please select a patient and doctor from the left rail before dictating.");
      return;
    }

    setIsDictating(true);
    setDictationStatus("Transcribing audio & reasoning with Gemini 3.5...");

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "dictation.webm");
      formData.append("doctorId", selectedDoctorId);
      formData.append("patientId", selectedPatient.id);
      if (activeAppointmentId) formData.append("appointmentId", activeAppointmentId);

      const res = await fetch("/api/crm/copilot/dictate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Dictation extraction failed");
      }

      // Populate draft prescription
      setPrescriptionId(data.prescription.id);
      setChiefComplaint(data.extraction.chiefComplaint || "");
      setDiagnosis(data.extraction.diagnosis || "");
      setFollowUpDays(data.extraction.followUpDays || 3);
      setPrescriptionItems(data.groundedMedicines || []);
      setIsApproved(false);

      // Populate draft invoice
      setInvoiceId(data.invoice.id);
      setInvoiceNumber(data.invoice.invoiceNumber);
      setInvoiceItems(data.groundedBillableItems || []);
      setInvoiceNotes(data.invoice.notes || "");

      // Populate allergy alerts
      setAllergyAlerts(data.allergyAlerts || []);
    } catch (err: any) {
      alert(`Audio dictation failed: ${err.message}`);
    } finally {
      setIsDictating(false);
      setDictationStatus("");
    }
  };

  // Handle text dictation
  const handleDictateText = async (text: string) => {
    if (!selectedPatient || !selectedDoctorId) {
      alert("Please select a patient and doctor from the left rail before extracting.");
      return;
    }

    setIsDictating(true);
    setDictationStatus("Reasoning with Gemini 3.5 & grounding drugs/tariffs...");

    try {
      const res = await fetch("/api/crm/copilot/dictate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          doctorId: selectedDoctorId,
          patientId: selectedPatient.id,
          appointmentId: activeAppointmentId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Text dictation extraction failed");
      }

      setPrescriptionId(data.prescription.id);
      setChiefComplaint(data.extraction.chiefComplaint || "");
      setDiagnosis(data.extraction.diagnosis || "");
      setFollowUpDays(data.extraction.followUpDays || 3);
      setPrescriptionItems(data.groundedMedicines || []);
      setIsApproved(false);

      setInvoiceId(data.invoice.id);
      setInvoiceNumber(data.invoice.invoiceNumber);
      setInvoiceItems(data.groundedBillableItems || []);
      setInvoiceNotes(data.invoice.notes || "");

      setAllergyAlerts(data.allergyAlerts || []);
    } catch (err: any) {
      alert(`Dictation extraction failed: ${err.message}`);
    } finally {
      setIsDictating(false);
      setDictationStatus("");
    }
  };

  // Handle saving drafts
  const handleSaveDraft = async () => {
    if (!prescriptionId && !invoiceId) return;

    setIsSaving(true);
    try {
      let followUpDate: string | undefined;
      if (followUpDays && followUpDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + followUpDays);
        followUpDate = d.toISOString();
      }

      const res = await fetch("/api/crm/copilot/drafts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionId,
          prescriptionUpdates: {
            chiefComplaint,
            diagnosis,
            items: prescriptionItems,
            followUpDate,
          },
          invoiceId,
          invoiceUpdates: {
            items: invoiceItems,
            notes: invoiceNotes,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save drafts");
      }
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle clinical approval
  const handleApprove = async () => {
    if (!prescriptionId) return;

    setIsApproving(true);
    try {
      // First auto-save any pending changes
      await handleSaveDraft();

      const res = await fetch("/api/crm/copilot/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionId,
          invoiceId,
          issueInvoiceNow: !capabilities.isDoctorUser, // Owner/Receptionist finalizes bill directly
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Prescription approval failed");
      }

      setIsApproved(true);
      setShowPrintModal(true); // Automatically open print preview
      loadContext(selectedPatient?.id, selectedDoctorId);
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  const activeDoctorObj = doctors.find((d) => d.id === selectedDoctorId) || null;
  const hasDrafts = Boolean(prescriptionId || prescriptionItems.length > 0);

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-3.5rem)] overflow-hidden bg-slate-100">
      {/* Left Rail: OPD Queue & Selected Patient Snapshot */}
      <ContextRail
        doctors={doctors}
        selectedDoctorId={selectedDoctorId}
        onSelectDoctor={(docId) => {
          setSelectedDoctorId(docId);
          loadContext(selectedPatient?.id, docId);
        }}
        queue={queue}
        selectedPatient={selectedPatient}
        onSelectPatient={handleSelectPatient}
        isLoading={isLoadingContext}
      />

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        {/* Workspace Tab Switcher Header */}
        <div className="px-4 py-2 border-b border-slate-200 bg-white flex items-center justify-between">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="w-auto"
          >
            <TabsList className="h-8 bg-slate-100 p-0.5">
              <TabsTrigger
                value="dictation"
                className="text-xs font-semibold gap-1.5 h-7 data-[state=active]:bg-white data-[state=active]:text-[#2563EB] cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5" />
                Voice Dictation & Clinical Drafts
              </TabsTrigger>
              <TabsTrigger
                value="chat"
                className="text-xs font-semibold gap-1.5 h-7 data-[state=active]:bg-white data-[state=active]:text-[#2563EB] cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                Copilot Assistant Chat
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500">
            <span>Doctor Desk:</span>
            <strong className="text-slate-800">
              Dr. {activeDoctorObj?.fullName || "Physician"}
            </strong>
          </div>
        </div>

        {contextError && (
          <div className="mx-4 mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{contextError}</span>
            </div>
            <button
              onClick={() => loadContext()}
              className="text-[#2563EB] hover:underline font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Tab 1: Voice Dictation & HITL Drafts */}
        {activeTab === "dictation" ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <ClinicalSafetyBanner allergyAlerts={allergyAlerts} />

            <DictationWorkspace
              onDictateAudio={handleDictateAudio}
              onDictateText={handleDictateText}
              isProcessing={isDictating}
              statusMessage={dictationStatus}
              hasPatient={!!selectedPatient}
              patientName={selectedPatient?.fullName}
              disabled={false}
            />

            {hasDrafts && (
              <>
                <DraftPrescriptionCard
                  prescriptionId={prescriptionId}
                  chiefComplaint={chiefComplaint}
                  onChangeChiefComplaint={setChiefComplaint}
                  diagnosis={diagnosis}
                  onChangeDiagnosis={setDiagnosis}
                  followUpDays={followUpDays}
                  onChangeFollowUpDays={setFollowUpDays}
                  items={prescriptionItems}
                  onChangeItems={setPrescriptionItems}
                  readOnly={isApproved}
                />

                <DraftInvoiceCard
                  invoiceId={invoiceId}
                  invoiceNumber={invoiceNumber}
                  items={invoiceItems}
                  onChangeItems={setInvoiceItems}
                  notes={invoiceNotes}
                  onChangeNotes={setInvoiceNotes}
                  readOnly={isApproved}
                />
              </>
            )}

            <StickyActionBar
              onSaveDraft={handleSaveDraft}
              onApprove={handleApprove}
              onOpenPrint={() => setShowPrintModal(true)}
              isSaving={isSaving}
              isApproving={isApproving}
              isApproved={isApproved}
              canApprove={capabilities.canApprovePrescription}
              isDoctorUser={capabilities.isDoctorUser}
              hasDrafts={hasDrafts}
            />
          </div>
        ) : (
          /* Tab 2: Context-Aware Streaming Assistant Chat */
          <div className="flex-1 overflow-hidden p-3 sm:p-4">
            <CopilotChatWorkspace
              patientId={selectedPatient?.id}
              appointmentId={activeAppointmentId}
              doctorId={selectedDoctorId}
              doctorName={activeDoctorObj?.fullName}
              patientName={selectedPatient?.fullName}
              onRefreshQueue={() => loadContext(selectedPatient?.id, selectedDoctorId)}
            />
          </div>
        )}
      </div>

      {/* A4 Prescription Print Modal */}
      <RxPrintModal
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
        prescription={{
          chiefComplaint,
          diagnosis,
          followUpDate: followUpDays
            ? new Date(Date.now() + followUpDays * 24 * 60 * 60 * 1000)
            : null,
          items: prescriptionItems,
        }}
        doctor={activeDoctorObj}
        patient={selectedPatient}
      />
    </div>
  );
}
