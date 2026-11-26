"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { ContextRail } from "./ContextRail";
import { ClinicalSafetyBanner } from "./ClinicalSafetyBanner";
import {
  DictationWorkspace,
  DictationWorkspaceRef,
  SAMPLE_HINGLISH_NOTE,
} from "./DictationWorkspace";
import { DraftPrescriptionCard } from "./DraftPrescriptionCard";
import { DraftInvoiceCard } from "./DraftInvoiceCard";
import { StickyActionBar } from "./StickyActionBar";
import { RxPrintModal } from "./RxPrintModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Mic,
  Send,
  FileText,
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Loader2,
  Bot,
  User,
} from "lucide-react";
import type { AllergyAlert } from "@/modules/ai/copilot/dictation-orchestrator";
import type { GroundedPrescriptionItem } from "@/services/domain/prescription-service";
import type { GroundedInvoiceItem } from "@/services/domain/billing-service";
import type { CopilotStreamEvent } from "@/modules/ai/copilot/chat-orchestrator";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  actionCard?: {
    cardType: "BLOCK_SLOT" | "BOOK_FOLLOWUP";
    payload: Record<string, any>;
  };
}

const STARTER_PROMPTS = [
  {
    icon: Sparkles,
    label: "Load Sample Hinglish Visit",
    action: "sample_visit",
    color: "text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
  },
  {
    icon: Users,
    label: "Who is next in today's OPD queue?",
    action: "chat",
    query: "Who is next in today's OPD queue?",
    color: "text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100",
  },
  {
    icon: Calendar,
    label: "Check open appointment slots for tomorrow",
    action: "chat",
    query: "Check open appointment slots for tomorrow",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
  },
  {
    icon: FileText,
    label: "Summarize active patient history & allergies",
    action: "chat",
    query: "Summarize active patient history and allergies",
    color: "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100",
  },
  {
    icon: Clock,
    label: "Block doctor schedule 2-4 PM today",
    action: "chat",
    query: "Block doctor schedule 2-4 PM today for emergency surgery",
    color: "text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100",
  },
];

export function CopilotWorkspace() {
  const searchParams = useSearchParams();
  const initialPatientId = searchParams.get("patientId") || undefined;
  const initialDoctorId = searchParams.get("doctorId") || undefined;
  const initialAppointmentId = searchParams.get("appointmentId") || undefined;

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

  // Chat & Streaming State
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [chatStatusMessage, setChatStatusMessage] = React.useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = React.useState<string | null>(null);

  // Integrated Bottom Composer State
  const [composerText, setComposerText] = React.useState("");
  const [composerMode, setComposerMode] = React.useState<"dictation" | "chat">("dictation");

  const dictationRef = React.useRef<DictationWorkspaceRef | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    if (messages.length > 0 || isStreaming || isDictating) {
      scrollToBottom();
    }
  }, [messages, isStreaming, isDictating, chatStatusMessage]);

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
    setPrescriptionItems([]);
    setInvoiceItems([]);
    setPrescriptionId(undefined);
    setInvoiceId(undefined);
    setInvoiceNumber(undefined);
    setAllergyAlerts([]);
    setChiefComplaint("");
    setDiagnosis("");
    setIsApproved(false);

    if (!patientId) {
      setSelectedPatient(null);
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
    setDictationStatus("Transcribing consultation audio & grounding clinical formulary...");

    // Record entry into the unified stream
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: `🎙️ Voice Dictation recorded for ${selectedPatient.fullName}.`,
      },
    ]);

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

      // Assistant confirmation message
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `✅ Voice consultation transcribed and grounded against master formulary. Generated Draft Prescription (${data.groundedMedicines?.length || 0} medications) and Draft Invoice #${data.invoice.invoiceNumber}. Verify dosages and details below.`,
        },
      ]);
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
    setDictationStatus("Analyzing clinical notes & matching formulary...");

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

  // Handle Assistant Chat Streaming
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || composerText).trim();
    if (!text || isStreaming) return;

    setComposerText("");
    const userMsgId = crypto.randomUUID();
    const assistantMsgId = crypto.randomUUID();

    const newMessages: ChatMessage[] = [
      ...messages,
      { id: userMsgId, role: "user", content: text },
      { id: assistantMsgId, role: "assistant", content: "" },
    ];
    setMessages(newMessages);
    setIsStreaming(true);
    setChatStatusMessage("Connecting to Clinical Copilot Engine...");

    try {
      const response = await fetch("/api/crm/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          patientId: selectedPatient?.id || undefined,
          appointmentId: activeAppointmentId || undefined,
          doctorId: selectedDoctorId || undefined,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      if (!response.body) throw new Error("No response body received");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event: CopilotStreamEvent = JSON.parse(line);

            if (event.type === "status") {
              setChatStatusMessage(event.status);
            } else if (event.type === "token") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: msg.content + event.text }
                    : msg
                )
              );
            } else if (event.type === "action_card") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? {
                        ...msg,
                        actionCard: {
                          cardType: event.cardType,
                          payload: event.payload,
                        },
                      }
                    : msg
                )
              );
            } else if (event.type === "error") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: msg.content + `\n\n⚠️ Error: ${event.message}` }
                    : msg
                )
              );
            }
          } catch (e) {
            // ignore non-json line
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: `Error: ${err?.message || "Failed to reach copilot"}` }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
      setChatStatusMessage(null);
    }
  };

  // Handle interactive action card confirmations (Block slot / Followup)
  const handleConfirmAction = async (
    msgId: string,
    cardType: "BLOCK_SLOT" | "BOOK_FOLLOWUP",
    payload: Record<string, any>
  ) => {
    setConfirmingAction(msgId);
    try {
      let body: any;
      if (cardType === "BLOCK_SLOT") {
        body = {
          action: "CONFIRM_BLOCK_SLOT",
          doctorId: payload.doctorId,
          startAt: payload.startAt,
          endAt: payload.endAt,
          reason: payload.reason,
          notifyAffectedPatients: true,
        };
      } else {
        body = {
          action: "CONFIRM_BOOK_FOLLOWUP",
          patientId: payload.patientId,
          doctorId: payload.doctorId,
          department: payload.department,
          appointmentDate: payload.appointmentDate,
          timeSlot: payload.timeSlot,
          chiefComplaints: payload.chiefComplaints,
        };
      }

      const res = await fetch("/api/crm/copilot/actions/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Action confirmation failed");
      }

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId && m.actionCard) {
            return {
              ...m,
              actionCard: {
                ...m.actionCard,
                payload: {
                  ...m.actionCard.payload,
                  isConfirmed: true,
                  result: resData.result || resData.appointment,
                },
              },
            };
          }
          return m;
        })
      );

      loadContext(selectedPatient?.id, selectedDoctorId);
    } catch (err: any) {
      alert(`Confirmation failed: ${err.message}`);
    } finally {
      setConfirmingAction(null);
    }
  };

  // Handle Composer submission (Smart Routing: Dictation vs Query)
  const handleComposerSubmit = async () => {
    const text = composerText.trim();
    if (!text || isStreaming || isDictating) return;

    setComposerText("");

    const isClinicalDictation =
      composerMode === "dictation" ||
      /\b(rx|tab|tablet|cap|capsule|syrup|inj|mg|tds|od|bd|sos|fever|cough|pain|bp|diagnos|provisional|prescrib|charge)\b/i.test(
        text
      );

    if (isClinicalDictation) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: `📝 Clinical Consultation Note:\n${text}`,
        },
      ]);
      await handleDictateText(text);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `✅ Analyzed clinical notes and grounded formulary against hospital master catalog. Generated Draft Prescription and OPD Invoice${
            selectedPatient ? ` for ${selectedPatient.fullName}` : ""
          }. Review the cards below before final approval.`,
        },
      ]);
    } else {
      await handleSendMessage(text);
    }
  };

  // Handle loading sample visit note
  const handleLoadSampleVisit = async () => {
    if (!selectedPatient) {
      alert(
        "Please select a patient from today's queue or clinic directory on the left before running sample consultation."
      );
      return;
    }
    setComposerText("");
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: `📝 Sample Hinglish Consultation Note:\n${SAMPLE_HINGLISH_NOTE}`,
      },
    ]);
    await handleDictateText(SAMPLE_HINGLISH_NOTE);
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `✅ Sample Hinglish consultation extracted. Grounded Tab Dolo 650, Tab Pantocid 40, Tab Augmentin 625, and CBC / Dengue NS1 tariffs. Review the draft cards below.`,
      },
    ]);
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
      await handleSaveDraft();

      const res = await fetch("/api/crm/copilot/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionId,
          invoiceId,
          issueInvoiceNow: !capabilities.isDoctorUser,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Prescription approval failed");
      }

      setIsApproved(true);
      setShowPrintModal(true);
      loadContext(selectedPatient?.id, selectedDoctorId);
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  // Reset encounter back to welcoming hero
  const handleResetConsultation = () => {
    setPrescriptionId(undefined);
    setPrescriptionItems([]);
    setInvoiceId(undefined);
    setInvoiceNumber(undefined);
    setInvoiceItems([]);
    setChiefComplaint("");
    setDiagnosis("");
    setAllergyAlerts([]);
    setMessages([]);
    setIsApproved(false);
    setComposerText("");
  };

  const activeDoctorObj = doctors.find((d) => d.id === selectedDoctorId) || null;
  const hasDrafts = Boolean(
    prescriptionId || prescriptionItems.length > 0 || invoiceItems.length > 0
  );
  const hasEncounterStarted = hasDrafts || messages.length > 0 || isDictating;

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

      {/* Main Unified Canvas Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        {/* Top Header Bar */}
        <div className="px-4 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <h1 className="text-xs font-bold text-slate-800">Doctor AI Copilot</h1>
              <p className="text-[10px] text-slate-400">
                Context-aware clinical voice dictation & assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasEncounterStarted && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetConsultation}
                className="h-7 text-[11px] gap-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                title="Start a fresh consultation encounter"
              >
                <RotateCcw className="h-3 w-3" />
                <span className="hidden sm:inline">New Consultation</span>
              </Button>
            )}

            <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-md">
              <span>Doctor Desk:</span>
              <strong className="text-slate-800 font-semibold">
                {activeDoctorObj?.fullName
                  ? `Dr. ${activeDoctorObj.fullName.replace(/^(Dr\.?\s*)+/i, "")}`
                  : "Dr. Physician"}
              </strong>
            </div>
          </div>
        </div>

        {contextError && (
          <div className="mx-4 mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between animate-in fade-in-50 duration-200">
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

        {/* Scrollable Encounter Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* =========================================================================
              1. HERO VIEW (Empty state before encounter starts)
             ========================================================================= */}
          {!hasEncounterStarted && (
            <div className="max-w-2xl mx-auto py-6 sm:py-10 space-y-6 text-center animate-in fade-in-50 duration-300">
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 inline-block">
                  Clinical Copilot Monolith
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Welcome,{" "}
                  {activeDoctorObj?.fullName
                    ? `Dr. ${activeDoctorObj.fullName.replace(/^(Dr\.?\s*)+/i, "")}`
                    : "Doctor"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                  Start dictating a patient consultation in English or Hinglish, or ask questions
                  about today&apos;s queue, doctor schedule, and medical records.
                </p>
              </div>

              {/* Central Mic & Recording Console */}
              <div className="text-left">
                <DictationWorkspace
                  ref={dictationRef}
                  onDictateAudio={handleDictateAudio}
                  onDictateText={handleDictateText}
                  isProcessing={isDictating}
                  statusMessage={dictationStatus}
                  hasPatient={!!selectedPatient}
                  patientName={selectedPatient?.fullName}
                  disabled={false}
                  collapsed={false}
                />
              </div>

              {/* Starter Prompt Chips */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-medium text-slate-400">
                  Quick clinical &amp; scheduling actions:
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {STARTER_PROMPTS.map((chip, i) => {
                    const Icon = chip.icon;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          if (chip.action === "sample_visit") {
                            handleLoadSampleVisit();
                          } else if (chip.query) {
                            setComposerMode("chat");
                            handleSendMessage(chip.query);
                          }
                        }}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-full border font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98",
                          chip.color
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{chip.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              2. ACTIVE ENCOUNTER FEED (Hero collapses when consultation/chat starts)
             ========================================================================= */}
          {hasEncounterStarted && (
            <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in-50 duration-300">
              {/* HITL Medical Safeguard Strip */}
              <ClinicalSafetyBanner allergyAlerts={allergyAlerts} />

              {/* Collapsed / Expandable Dictation Status Bar */}
              <DictationWorkspace
                ref={dictationRef}
                onDictateAudio={handleDictateAudio}
                onDictateText={handleDictateText}
                isProcessing={isDictating}
                statusMessage={dictationStatus}
                hasPatient={!!selectedPatient}
                patientName={selectedPatient?.fullName}
                disabled={false}
                collapsed={true}
              />

              {/* Conversation Messages Thread */}
              {messages.length > 0 && (
                <div className="space-y-3 pt-1">
                  {messages.map((msg) => {
                    const isUser = msg.role === "user";
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-2.5 max-w-[88%]",
                          isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                        )}
                      >
                        <div
                          className={cn(
                            "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-2xs",
                            isUser ? "bg-[#2563EB] text-white" : "bg-slate-200 text-slate-700"
                          )}
                        >
                          {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                        </div>

                        <div className="space-y-2">
                          <div
                            className={cn(
                              "p-3 rounded-xl leading-relaxed whitespace-pre-wrap break-words text-xs shadow-2xs",
                              isUser
                                ? "bg-[#2563EB] text-white rounded-tr-none font-medium"
                                : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-none font-sans"
                            )}
                          >
                            {msg.content}
                          </div>

                          {/* Interactive Action Card (Slot Block / Followup) */}
                          {msg.actionCard && (
                            <div className="p-3 rounded-lg border-2 border-indigo-200 bg-indigo-50/40 text-xs shadow-xs space-y-2">
                              {msg.actionCard.cardType === "BLOCK_SLOT" && (
                                <div>
                                  <div className="flex items-center gap-1.5 font-bold text-indigo-900 uppercase tracking-wide text-[10px] mb-1">
                                    <AlertTriangle className="h-3.5 w-3.5 text-indigo-600" />
                                    <span>Doctor Slot Block Confirmation (2-Step Check)</span>
                                  </div>
                                  <p className="text-slate-700">
                                    <strong>Doctor:</strong>{" "}
                                    {msg.actionCard.payload.doctorName || "Assigned Doctor"}
                                    <br />
                                    <strong>Time:</strong>{" "}
                                    {new Date(msg.actionCard.payload.startAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}{" "}
                                    –{" "}
                                    {new Date(msg.actionCard.payload.endAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                    <br />
                                    <strong>Conflicting Appointments:</strong>{" "}
                                    <span className="font-bold text-rose-600">
                                      {msg.actionCard.payload.conflictCount} patient(s)
                                    </span>
                                  </p>

                                  {msg.actionCard.payload.conflicts?.length > 0 && (
                                    <div className="mt-1.5 p-2 rounded bg-white border border-slate-200 text-[11px] max-h-24 overflow-y-auto">
                                      <span className="font-semibold text-slate-700 block mb-1">
                                        Affected Patients:
                                      </span>
                                      {msg.actionCard.payload.conflicts.map((c: any, i: number) => (
                                        <div key={i} className="text-slate-600">
                                          • {c.patientName} ({c.timeSlot || "Scheduled slot"})
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {msg.actionCard.payload.isConfirmed ? (
                                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold mt-2">
                                      <CheckCircle2 className="h-4 w-4" />
                                      <span>Slot Block Executed &amp; Reschedule Webhooks Enqueued</span>
                                    </div>
                                  ) : (
                                    <div className="pt-1 flex justify-end">
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() =>
                                          handleConfirmAction(
                                            msg.id,
                                            "BLOCK_SLOT",
                                            msg.actionCard!.payload
                                          )
                                        }
                                        disabled={confirmingAction === msg.id}
                                        className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                                      >
                                        {confirmingAction === msg.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                        ) : null}
                                        Confirm &amp; Block Slot Now
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {msg.actionCard.cardType === "BOOK_FOLLOWUP" && (
                                <div>
                                  <div className="flex items-center gap-1.5 font-bold text-indigo-900 uppercase tracking-wide text-[10px] mb-1">
                                    <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                                    <span>Follow-Up Appointment Card</span>
                                  </div>
                                  <p className="text-slate-700">
                                    <strong>Patient:</strong> {msg.actionCard.payload.patientName}
                                    <br />
                                    <strong>Doctor:</strong> {msg.actionCard.payload.doctorName}
                                    <br />
                                    <strong>Proposed Date &amp; Slot:</strong>{" "}
                                    {msg.actionCard.payload.appointmentDate} at{" "}
                                    {msg.actionCard.payload.timeSlot}
                                  </p>

                                  {msg.actionCard.payload.isConfirmed ? (
                                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold mt-2">
                                      <CheckCircle2 className="h-4 w-4" />
                                      <span>Appointment Booked Successfully</span>
                                    </div>
                                  ) : (
                                    <div className="pt-1 flex justify-end">
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() =>
                                          handleConfirmAction(
                                            msg.id,
                                            "BOOK_FOLLOWUP",
                                            msg.actionCard!.payload
                                          )
                                        }
                                        disabled={confirmingAction === msg.id}
                                        className="h-7 text-xs bg-[#2563EB] hover:bg-blue-700 text-white cursor-pointer"
                                      >
                                        {confirmingAction === msg.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                        ) : null}
                                        Confirm &amp; Book Follow-Up
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Streaming Status Indicator */}
              {chatStatusMessage && (
                <div className="flex items-center gap-2 text-slate-400 text-[11px] italic pl-10 animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{chatStatusMessage}</span>
                </div>
              )}

              {/* Extracted Clinical Cards (Prescription & Invoice) */}
              {hasDrafts && (
                <div className="space-y-4 pt-2 animate-in fade-in-50 slide-in-from-bottom-2 duration-300 ease-out">
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
                </div>
              )}

              {/* Sticky Action Bar */}
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
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* =========================================================================
            3. DOCKED BOTTOM COMPOSER BAR (Modern AI Copilot Architecture)
           ========================================================================= */}
        <div className="border-t border-slate-200 bg-white/95 backdrop-blur-sm p-3 sm:px-5">
          <div className="max-w-4xl mx-auto space-y-2">
            {/* Mode Selector Pill & Helper */}
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setComposerMode("dictation")}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                    composerMode === "dictation"
                      ? "bg-white text-[#2563EB] shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Mic className="h-3 w-3" />
                  Clinical Dictation
                </button>
                <button
                  type="button"
                  onClick={() => setComposerMode("chat")}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                    composerMode === "chat"
                      ? "bg-white text-[#2563EB] shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Sparkles className="h-3 w-3 text-indigo-500" />
                  Ask Copilot
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-slate-400">
                <span>
                  {composerMode === "dictation"
                    ? "Extracts grounded Rx & bill"
                    : "Queries queue, schedule & records"}
                </span>
                <span>•</span>
                <span>
                  Press{" "}
                  <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px]">
                    Enter
                  </kbd>{" "}
                  to submit
                </span>
              </div>
            </div>

            {/* Composer Input Area */}
            <div className="flex items-end gap-2 bg-slate-50/80 border border-slate-200 rounded-xl p-1.5 focus-within:border-[#2563EB] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#2563EB] transition-all">
              {/* Mic trigger button */}
              <button
                type="button"
                onClick={() => dictationRef.current?.startRecording()}
                disabled={isDictating}
                title="Start voice consultation dictation"
                className="h-9 w-9 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#2563EB] flex items-center justify-center shrink-0 transition-colors cursor-pointer active:scale-95"
              >
                <Mic className="h-4 w-4" />
              </button>

              {/* Auto-growing Textarea */}
              <textarea
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleComposerSubmit();
                  }
                }}
                rows={1}
                placeholder={
                  composerMode === "dictation"
                    ? "Dictate or type clinical encounter notes (e.g. 'Patient Rajesh, 42M, fever 3 days, Tab Dolo 650 TDS...')"
                    : "Ask Copilot anything (e.g. 'Who is next in queue?', 'Block schedule 2-4 PM today')..."
                }
                className="flex-1 bg-transparent border-0 resize-none text-xs leading-relaxed py-2 px-1 focus:outline-none max-h-32 min-h-[36px] placeholder:text-slate-400 font-sans"
              />

              {/* Send / Extract Button */}
              <Button
                type="button"
                size="sm"
                onClick={handleComposerSubmit}
                disabled={!composerText.trim() || isStreaming || isDictating}
                className="h-9 px-3.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 rounded-lg shrink-0 cursor-pointer shadow-xs active:scale-95"
              >
                {isStreaming || isDictating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : composerMode === "dictation" ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Extract Record</span>
                  </>
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
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
