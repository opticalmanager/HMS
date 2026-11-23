import "server-only";
import { eq, and, sql, desc, ilike, or } from "drizzle-orm";
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

export interface ParsedToolCall {
  tool: string;
  args: Record<string, any>;
}

export function parseToolCall(text: string): ParsedToolCall | null {
  if (!text) return null;

  // 1. Markdown codeblock ```json { "tool": ... } ```
  const codeBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/;
  const match = codeBlockRegex.exec(text);
  if (match) {
    try {
      const obj = JSON.parse(match[1]);
      if (obj && typeof obj.tool === "string") {
        return { tool: obj.tool, args: obj.args || {} };
      }
    } catch {}
  }

  // 2. Direct JSON containing "tool" key
  const rawJsonRegex = /(\{[\s\S]*?"tool"\s*:\s*"[^"]+"[\s\S]*?\})/;
  const rawMatch = rawJsonRegex.exec(text);
  if (rawMatch) {
    try {
      const obj = JSON.parse(rawMatch[1]);
      if (obj && typeof obj.tool === "string") {
        return { tool: obj.tool, args: obj.args || {} };
      }
    } catch {}
  }

  return null;
}

export class ChatOrchestrator {
  private llmClient: LlmClient;

  constructor(llmClient?: LlmClient) {
    this.llmClient = llmClient || defaultLlmClient;
  }

  /**
   * Preloads context for the clinic: today's OPD queue, selected patient, active doctor, and linked doctor.
   */
  async buildContext(options: {
    organizationId: string;
    patientId?: string | null;
    appointmentId?: string | null;
    doctorId?: string | null;
    actorUserId?: string | null;
  }) {
    const { organizationId, patientId, appointmentId, doctorId, actorUserId } = options;

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

    // 5. Linked Doctor Record (for the active logged-in user if doctor)
    let linkedDoctorId: string | null = null;
    if (actorUserId) {
      const [linkedDoc] = await db
        .select({ id: doctors.id })
        .from(doctors)
        .where(and(eq(doctors.organizationId, organizationId), eq(doctors.userId, actorUserId)))
        .limit(1);
      linkedDoctorId = linkedDoc?.id || null;
    }

    return {
      todayDateStr,
      timezone,
      queue: queueRows,
      selectedPatient: patientRecord,
      doctor: doctorRecord,
      linkedDoctorId,
    };
  }

  /**
   * Executes a bounded tool call with strict RBAC filtering and multi-tenant scoping.
   */
  async executeTool(
    name: string,
    args: Record<string, any>,
    options: {
      organizationId: string;
      actorUserId: string;
      actorRole: ClinicRole;
      ctx: Awaited<ReturnType<ChatOrchestrator["buildContext"]>>;
      patientId?: string | null;
      appointmentId?: string | null;
      doctorId?: string | null;
    }
  ): Promise<{ result: Record<string, unknown>; actionCard?: CopilotStreamEvent }> {
    const { organizationId, actorRole, ctx, doctorId, patientId } = options;

    switch (name) {
      case "get_today_queue": {
        const targetDocId = args.doctorId || doctorId || ctx.doctor?.id;
        const conditions = [
          eq(appointments.organizationId, organizationId),
          eq(appointments.appointmentDate, ctx.todayDateStr),
        ];
        if (targetDocId) {
          conditions.push(eq(appointments.doctorId, targetDocId));
        }

        const queueRows = await db
          .select({
            id: appointments.id,
            tokenNumber: appointments.tokenNumber,
            status: appointments.status,
            timeSlot: appointments.timeSlot,
            chiefComplaints: appointments.chiefComplaints,
            patientName: patients.fullName,
            patientUhid: patients.uhid,
            doctorName: doctors.fullName,
          })
          .from(appointments)
          .leftJoin(patients, eq(appointments.patientId, patients.id))
          .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
          .where(and(...conditions))
          .orderBy(appointments.tokenNumber)
          .limit(20);

        return { result: { queue: queueRows, count: queueRows.length } };
      }

      case "search_patients": {
        const query = String(args.query || "").trim();
        if (!query) {
          return { result: { patients: [], count: 0 } };
        }

        const rows = await db
          .select({
            id: patients.id,
            fullName: patients.fullName,
            uhid: patients.uhid,
            phone: patients.phone,
            age: patients.age,
            gender: patients.gender,
            allergies: patients.allergies,
          })
          .from(patients)
          .where(
            and(
              eq(patients.organizationId, organizationId),
              or(
                ilike(patients.fullName, `%${query}%`),
                ilike(patients.uhid, `%${query}%`),
                ilike(patients.phone, `%${query}%`)
              )
            )
          )
          .limit(5);

        return { result: { patients: rows, count: rows.length } };
      }

      case "get_available_slots": {
        const targetDocId = args.doctorId || doctorId || ctx.doctor?.id;
        if (!targetDocId) {
          return { result: { error: "Doctor ID is required to fetch available slots." } };
        }
        const date = args.date || ctx.todayDateStr;
        try {
          const slots = await AppointmentDomainService.getAvailableSlots({
            organizationId,
            doctorId: targetDocId,
            date,
            maxSlots: 5,
          });
          return { result: { date, doctorId: targetDocId, availableSlots: slots } };
        } catch (err: any) {
          return { result: { error: err?.message || "Failed to retrieve available slots." } };
        }
      }

      case "search_catalog": {
        const query = String(args.query || "").trim();
        if (!query) {
          return { result: { medicines: [], tariffs: [] } };
        }
        const type = args.type || "all";
        let meds: any[] = [];
        let tariffs: any[] = [];
        if (type === "all" || type === "medicines") {
          meds = await fuzzyMatchMedicines(organizationId, query, 5);
        }
        if (type === "all" || type === "tariffs") {
          tariffs = await fuzzyMatchTariffs(organizationId, query, 5);
        }
        return {
          result: {
            medicines: meds.map((m) => ({
              brandName: m.brandName,
              genericName: m.genericName,
              strength: m.strength,
              score: m.similarityScore,
            })),
            tariffs: tariffs.map((t) => ({
              name: t.name,
              category: t.category,
              price: t.price,
              score: t.similarityScore,
            })),
          },
        };
      }

      case "prepare_followup_booking": {
        const targetPatId = args.patientId || patientId || ctx.selectedPatient?.id;
        const targetDocId = args.doctorId || doctorId || ctx.doctor?.id;
        if (!targetPatId || !targetDocId) {
          return {
            result: {
              error: "Both patient and doctor must be selected or specified to prepare follow-up booking.",
            },
          };
        }

        let followUpDateStr = args.date || args.appointmentDate;
        if (!followUpDateStr) {
          const d = new Date();
          d.setDate(d.getDate() + 3);
          followUpDateStr = d.toISOString().split("T")[0];
        }

        let slot = args.timeSlot;
        if (!slot) {
          try {
            const openSlots = await AppointmentDomainService.getAvailableSlots({
              organizationId,
              doctorId: targetDocId,
              date: followUpDateStr,
              maxSlots: 1,
            });
            slot = openSlots[0]?.timeSlot || "10:30";
          } catch {
            slot = "10:30";
          }
        }

        const patName = ctx.selectedPatient?.id === targetPatId ? ctx.selectedPatient.fullName : "Selected Patient";
        const docName = ctx.doctor?.id === targetDocId ? ctx.doctor.fullName : "Assigned Doctor";
        const payload = {
          patientId: targetPatId,
          patientName: patName,
          doctorId: targetDocId,
          doctorName: docName,
          department: ctx.doctor?.specialty || "General Medicine",
          appointmentDate: followUpDateStr,
          timeSlot: slot,
          chiefComplaints: args.chiefComplaints || "Follow-up consultation",
        };

        return {
          result: {
            prepared: true,
            cardType: "BOOK_FOLLOWUP",
            payload,
            message: "Follow-up booking card generated for human confirmation.",
          },
          actionCard: {
            type: "action_card",
            cardType: "BOOK_FOLLOWUP",
            payload,
          },
        };
      }

      case "preview_block_doctor_slot": {
        // RBAC Enforcement: Receptionists are strictly prohibited from blocking doctor schedules
        if (actorRole === "receptionist") {
          return {
            result: {
              error: "Permission denied: receptionists are not authorized to block doctor slots.",
            },
          };
        }

        let targetDocId = args.doctorId || doctorId || ctx.doctor?.id;
        if (actorRole === "doctor" && ctx.linkedDoctorId) {
          // Doctors can only block their own schedule
          targetDocId = ctx.linkedDoctorId;
        }

        if (!targetDocId) {
          return { result: { error: "Doctor ID is required to preview slot blocking." } };
        }

        const startAt = args.startAt ? new Date(args.startAt) : new Date(Date.now() + 60 * 60 * 1000);
        const endAt = args.endAt ? new Date(args.endAt) : new Date(startAt.getTime() + 2 * 60 * 60 * 1000);

        try {
          const blockDryRun = await ScheduleService.blockDoctorSlot(organizationId, {
            doctorId: targetDocId,
            startAt,
            endAt,
            reason: args.reason || "Doctor leave / surgery preview",
            dryRun: true,
          });

          const payload = {
            doctorId: targetDocId,
            doctorName: ctx.doctor?.fullName || "Assigned Doctor",
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            reason: args.reason || "Doctor leave / surgery",
            conflictCount: blockDryRun.conflictCount,
            conflicts: blockDryRun.conflicts,
            requiresConfirmation: true,
          };

          return {
            result: {
              dryRun: true,
              conflictCount: blockDryRun.conflictCount,
              conflicts: blockDryRun.conflicts,
              message: `Simulated slot block. Found ${blockDryRun.conflictCount} conflict(s). Action card presented for confirmation.`,
            },
            actionCard: {
              type: "action_card",
              cardType: "BLOCK_SLOT",
              payload,
            },
          };
        } catch (err: any) {
          return { result: { error: err?.message || "Failed to simulate slot block." } };
        }
      }

      default:
        return { result: { error: `Unknown tool: ${name}` } };
    }
  }

  /**
   * Runs context-aware copilot chat with streaming NDJSON events and bounded tool execution (max 5 iterations).
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
      actorUserId,
    });

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

    // Tool registry description for model instructions filtered by RBAC
    const toolList = [
      "1. get_today_queue: check today's appointments for clinic or doctor. Args: {\"doctorId\": string (optional)}",
      "2. search_patients: search patient database by name, phone, or UHID. Args: {\"query\": string}",
      "3. get_available_slots: check doctor's open appointment slots for a date (YYYY-MM-DD). Args: {\"doctorId\": string (optional), \"date\": string}",
      "4. search_catalog: search medicine master or service tariffs. Args: {\"query\": string, \"type\": \"medicines\"|\"tariffs\"|\"all\"}",
      "5. prepare_followup_booking: propose follow-up booking card for confirmation. Args: {\"patientId\": string (optional), \"doctorId\": string (optional), \"date\": string (optional), \"timeSlot\": string (optional), \"chiefComplaints\": string (optional)}",
    ];

    if (canBlockSlots) {
      toolList.push(
        "6. preview_block_doctor_slot: check conflicts for doctor leave/slot block (always dryRun=true). Args: {\"doctorId\": string (optional), \"startAt\": string (ISO timestamp), \"endAt\": string (ISO timestamp), \"reason\": string}"
      );
    }

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
${toolList.join("\n")}

TOOL INVOCATION PROTOCOL:
If you need to invoke a tool, output ONLY a single JSON block on a new line:
\`\`\`json
{"tool": "TOOL_NAME", "args": { ... }}
\`\`\`
Do not include commentary or explanations alongside the JSON tool call block.
When receiving a tool observation, summarize the findings for the clinician.
If no tool is needed, respond directly with clear, concise clinical answers.`;

    // Bounded Tool Loop (Max 5 Iterations)
    let promptWithHistory = "";
    if (history && history.length > 0) {
      promptWithHistory = history
        .slice(-6)
        .map((h) => `${h.role === "user" ? "Doctor" : "Copilot"}: ${h.content}`)
        .join("\n\n");
      promptWithHistory += `\n\nDoctor: ${userMessage}\nCopilot:`;
    } else {
      promptWithHistory = `Doctor: ${userMessage}\nCopilot:`;
    }

    const MAX_TOOL_ITERATIONS = 5;
    let iteration = 0;
    let currentPrompt = promptWithHistory;

    try {
      while (iteration < MAX_TOOL_ITERATIONS) {
        iteration++;
        yield {
          type: "status",
          status: iteration === 1 ? "Formulating clinical answer..." : "Processing tool observation...",
        };

        const response = await this.llmClient.generateText({
          organizationId,
          channel: "WEB_COPILOT",
          actorRole,
          actorId: actorUserId,
          task: "clinical_summary",
          systemPrompt: systemInstruction,
          userPrompt: currentPrompt,
          temperature: 0.1,
          signal: options.signal,
        });

        const rawText = response.text || "";
        const toolCall = parseToolCall(rawText);

        if (toolCall) {
          yield { type: "status", status: `Running tool: ${toolCall.tool}...` };

          const { result, actionCard } = await this.executeTool(toolCall.tool, toolCall.args, {
            organizationId,
            actorUserId,
            actorRole,
            ctx,
            patientId,
            appointmentId,
            doctorId,
          });

          if (actionCard) {
            yield actionCard;
          }

          currentPrompt += `\nAssistant: ${rawText}\nObservation [${toolCall.tool}]: ${JSON.stringify(result)}\nAssistant:`;
          continue;
        }

        // Final answer: emit tokens chunk by chunk
        const tokens = rawText.split(/(\s+)/);
        for (const token of tokens) {
          if (token) {
            yield { type: "token", text: token };
          }
        }
        break;
      }
    } catch (err: any) {
      yield { type: "error", message: err?.message || "Failed to generate copilot response." };
    }

    yield { type: "done" };
  }
}

export const defaultChatOrchestrator = new ChatOrchestrator();
