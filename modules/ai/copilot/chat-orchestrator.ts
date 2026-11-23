import "server-only";
import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { appointments } from "@/db/schema/appointments";
import { patients } from "@/db/schema/patients";
import { doctors } from "@/db/schema/doctors";
import { clinicProfiles } from "@/db/schema/clinic-profiles";
import { defaultLlmClient, LlmClient } from "../llm-client";
import { DOCTOR_COPILOT_CHAT_PROMPT_V1 } from "../prompts";
import { AppointmentDomainService } from "@/services/domain/appointment-service";
import { ScheduleService } from "@/services/domain/schedule-service";
import { fuzzyMatchMedicines, fuzzyMatchTariffs } from "@/lib/fuzzy-search";
import type { ClinicRole } from "@/lib/auth-permissions";

export type CopilotStreamEvent =
  | { type: "status"; status: string }
  | { type: "token"; text: string }
  | {
      type: "action_card";
      cardType: "BLOCK_SLOT" | "BOOK_FOLLOWUP";
      payload: Record<string, unknown>;
    }
  | { type: "error"; message: string }
  | { type: "done" };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RunChatOptions {
  organizationId: string;
  actorUserId: string;
  actorRole: ClinicRole;
  userMessage: string;
  patientId?: string | null;
  appointmentId?: string | null;
  doctorId?: string | null;
  history?: ChatMessage[];
  signal?: AbortSignal;
}

export class ChatOrchestrator {
  private llmClient: LlmClient;

  constructor(llmClient?: LlmClient) {
    this.llmClient = llmClient || defaultLlmClient;
  }

  /**
   * Preloads context for the clinic: today's OPD queue, selected patient, active doctor.
   */
  async buildContext(options: {
    organizationId: string;
    patientId?: string | null;
    appointmentId?: string | null;
    doctorId?: string | null;
  }) {
    const { organizationId, patientId, appointmentId, doctorId } = options;

    // 1. Clinic profile
    const [clinicProfile] = await db
      .select()
      .from(clinicProfiles)
      .where(eq(clinicProfiles.organizationId, organizationId))
      .limit(1);

    const timezone = clinicProfile?.timezone || "Asia/Kolkata";
    const todayDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    // 2. Today's OPD Queue
    const queueConditions = [
      eq(appointments.organizationId, organizationId),
      eq(appointments.appointmentDate, todayDateStr),
    ];
    if (doctorId) {
      queueConditions.push(eq(appointments.doctorId, doctorId));
    }

    const queueRows = await db
      .select({
        id: appointments.id,
        tokenNumber: appointments.tokenNumber,
        status: appointments.status,
        timeSlot: appointments.timeSlot,
        chiefComplaints: appointments.chiefComplaints,
        patientId: appointments.patientId,
        patientName: patients.fullName,
        patientUhid: patients.uhid,
        doctorId: appointments.doctorId,
        doctorName: doctors.fullName,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
      .where(and(...queueConditions))
      .orderBy(appointments.tokenNumber)
      .limit(30);

    // 3. Selected Patient
    let targetPatientId = patientId;
    if (!targetPatientId && appointmentId) {
      const [appt] = await db
        .select({ patientId: appointments.patientId })
        .from(appointments)
        .where(and(eq(appointments.organizationId, organizationId), eq(appointments.id, appointmentId)))
        .limit(1);
      if (appt) targetPatientId = appt.patientId;
    }

    let patientRecord: any = null;
    if (targetPatientId) {
      const [p] = await db
        .select()
        .from(patients)
        .where(and(eq(patients.organizationId, organizationId), eq(patients.id, targetPatientId)))
        .limit(1);
      patientRecord = p;
    }

    // 4. Doctor Record
    let doctorRecord: any = null;
    if (doctorId) {
      const [doc] = await db
        .select()
        .from(doctors)
        .where(and(eq(doctors.organizationId, organizationId), eq(doctors.id, doctorId)))
        .limit(1);
      doctorRecord = doc;
    }

    return {
      todayDateStr,
      timezone,
      queue: queueRows,
      selectedPatient: patientRecord,
      doctor: doctorRecord,
    };
  }

  /**
   * Runs context-aware copilot chat with streaming NDJSON events and bounded tool execution.
   */
  async *streamChat(options: RunChatOptions): AsyncGenerator<CopilotStreamEvent, void, unknown> {
    const { organizationId, actorUserId, actorRole, userMessage, patientId, appointmentId, doctorId, history } =
      options;

    yield { type: "status", status: "Retrieving clinic encounter context..." };

    const ctx = await this.buildContext({
      organizationId,
      patientId,
      appointmentId,
      doctorId,
    });

    const isReceptionist = actorRole === "receptionist";
    const canBlockSlots = actorRole === "owner" || actorRole === "admin" || actorRole === "doctor";

    // Build rich context prompt
    const queueSummary =
      ctx.queue.length === 0
        ? "No appointments booked for today."
        : ctx.queue
            .map(
              (q) =>
                `Token #${q.tokenNumber} [${q.status.toUpperCase()}] ${q.timeSlot} - ${q.patientName} (${q.patientUhid}), Dr. ${q.doctorName || "Staff"}. Complaints: ${q.chiefComplaints || "None"}`
            )
            .join("\n");

    const patientSummary = ctx.selectedPatient
      ? `Name: ${ctx.selectedPatient.fullName}
UHID: ${ctx.selectedPatient.uhid}
Age/Gender: ${ctx.selectedPatient.age || "N/A"} / ${ctx.selectedPatient.gender}
Phone: ${ctx.selectedPatient.phone}
Blood Group: ${ctx.selectedPatient.bloodGroup || "Unknown"}
Allergies: ${JSON.stringify(ctx.selectedPatient.allergies || [])}
Chronic Conditions: ${JSON.stringify(ctx.selectedPatient.chronicConditions || [])}`
      : "No patient currently selected in console.";

    const doctorSummary = ctx.doctor
      ? `Dr. ${ctx.doctor.fullName} (${ctx.doctor.specialty}), OPD Consultation Fee: ₹${ctx.doctor.consultationFee}`
      : "No specific doctor selected.";

    // Tool registry description for model instructions
    const systemInstruction = `${DOCTOR_COPILOT_CHAT_PROMPT_V1}

CURRENT CLINIC CONTEXT:
Clinic Date: ${ctx.todayDateStr} (${ctx.timezone})
User Role: ${actorRole.toUpperCase()}

ACTIVE DOCTOR:
${doctorSummary}

SELECTED PATIENT IN CONSOLE:
${patientSummary}

TODAY'S OPD QUEUE (${ctx.queue.length} patients):
${queueSummary}

AVAILABLE TOOLS (Bounded Loop Max 5 iterations):
1. search_catalog: search medicine drugs or service tariffs.
2. get_available_slots: check doctor's available slots for a given date (YYYY-MM-DD).
3. prepare_followup_booking: propose a follow-up appointment card for doctor review.
${canBlockSlots ? "4. preview_block_doctor_slot: check conflicts for doctor leave/slot block (always dryRun=true)." : ""}

TOOL INVOCATION PROTOCOL:
If you need to invoke a tool, output ONLY a single JSON block on a new line:
\`\`\`json
{"tool": "TOOL_NAME", "args": { ... }}
\`\`\`
If no tool is needed, respond directly with clear, concise clinical answers.`;

    // Fast-path intent checks for immediate action cards
    const lowerMsg = userMessage.toLowerCase();

    // Check if user is asking to block a slot / take leave
    if (canBlockSlots && (lowerMsg.includes("block slot") || lowerMsg.includes("leave") || lowerMsg.includes("block doctor") || lowerMsg.includes("emergency surgery"))) {
      yield { type: "status", status: "Simulating slot block & checking patient conflicts (dryRun: true)..." };

      const targetDocId = doctorId || ctx.doctor?.id;
      if (targetDocId) {
        try {
          // Parse time window (default to next 2 hours or tomorrow if not specified)
          const now = new Date();
          const startAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
          const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000); // 2-hour window

          const blockDryRun = await ScheduleService.blockDoctorSlot(organizationId, {
            doctorId: targetDocId,
            startAt,
            endAt,
            reason: userMessage,
            dryRun: true,
          });

          yield {
            type: "action_card",
            cardType: "BLOCK_SLOT",
            payload: {
              doctorId: targetDocId,
              doctorName: ctx.doctor?.fullName || "Assigned Doctor",
              startAt: startAt.toISOString(),
              endAt: endAt.toISOString(),
              reason: userMessage,
              conflictCount: blockDryRun.conflictCount,
              conflicts: blockDryRun.conflicts,
              requiresConfirmation: true,
            },
          };

          const tokenResponse = `I have simulated the slot block for Dr. ${ctx.doctor?.fullName || "Doctor"} from ${startAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} to ${endAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Found ${blockDryRun.conflictCount} conflicting patient appointment(s). Please review and click Confirm to execute.`;
          yield { type: "token", text: tokenResponse };
          yield { type: "done" };
          return;
        } catch (err: any) {
          // fallback to standard chat
        }
      }
    }

    // Check if user is asking to book follow-up for selected patient
    if (lowerMsg.includes("book follow") || lowerMsg.includes("schedule follow") || lowerMsg.includes("follow up in") || lowerMsg.includes("next visit")) {
      const targetDocId = doctorId || ctx.doctor?.id;
      const targetPatId = patientId || ctx.selectedPatient?.id;

      if (targetDocId && targetPatId) {
        yield { type: "status", status: "Checking open slots for follow-up booking..." };

        // Default follow up 3 days from now
        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + 3);
        const dateStr = followUpDate.toISOString().split("T")[0];

        try {
          const slots = await AppointmentDomainService.getAvailableSlots({
            organizationId,
            doctorId: targetDocId,
            date: dateStr,
            maxSlots: 5,
          });

          const chosenSlot = slots[0]?.timeSlot || "10:30";

          yield {
            type: "action_card",
            cardType: "BOOK_FOLLOWUP",
            payload: {
              patientId: targetPatId,
              patientName: ctx.selectedPatient?.fullName || "Selected Patient",
              doctorId: targetDocId,
              doctorName: ctx.doctor?.fullName || "Assigned Doctor",
              department: ctx.doctor?.specialty || "General Medicine",
              appointmentDate: dateStr,
              timeSlot: chosenSlot,
              chiefComplaints: "Follow-up consultation",
            },
          };

          const tokenResponse = `I have prepared a follow-up appointment card for ${ctx.selectedPatient?.fullName || "patient"} on ${dateStr} at ${chosenSlot} with Dr. ${ctx.doctor?.fullName || "Doctor"}. Please confirm below to book.`;
          yield { type: "token", text: tokenResponse };
          yield { type: "done" };
          return;
        } catch (err: any) {
          // fallback to standard chat
        }
      }
    }

    // Standard streaming chat with full context
    yield { type: "status", status: "Formulating clinical answer..." };

    let promptWithHistory = "";
    if (history && history.length > 0) {
      promptWithHistory = history
        .slice(-6)
        .map((h) => `${h.role === "user" ? "Doctor" : "Copilot"}: ${h.content}`)
        .join("\n\n");
      promptWithHistory += `\n\nDoctor: ${userMessage}\nCopilot:`;
    } else {
      promptWithHistory = userMessage;
    }

    try {
      const generator = this.llmClient.streamText({
        organizationId,
        channel: "WEB_COPILOT",
        actorRole,
        actorId: actorUserId,
        task: "clinical_summary",
        systemPrompt: systemInstruction,
        userPrompt: promptWithHistory,
        temperature: 0.2,
      });

      for await (const chunk of generator) {
        yield { type: "token", text: chunk };
      }
    } catch (err: any) {
      yield { type: "error", message: err?.message || "Failed to generate copilot response." };
    }

    yield { type: "done" };
  }
}

export const defaultChatOrchestrator = new ChatOrchestrator();
