import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";
import { validateAiInput } from "@/modules/ai/guardrails";
import { defaultChatOrchestrator, type CopilotStreamEvent } from "@/modules/ai/copilot/chat-orchestrator";

const chatSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(2000, "Message exceeds limit"),
  patientId: z.string().uuid().optional().nullable(),
  appointmentId: z.string().uuid().optional().nullable(),
  doctorId: z.string().uuid().optional().nullable(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { clinicId, user, role } = await requireClinicSession(
      { appointment: ["read"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Guardrail against Prompt Injection
    const guardrailCheck = validateAiInput(parsed.data.message, "WEB_COPILOT");
    if (!guardrailCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Your message was blocked by AI safety guardrails: Prompt injection detected.",
          code: "AI_PROMPT_BLOCKED",
          reason: guardrailCheck.reason,
        },
        { status: 400 }
      );
    }

    const eventStream = defaultChatOrchestrator.streamChat({
      organizationId: clinicId,
      actorUserId: user.id,
      actorRole: role,
      userMessage: parsed.data.message,
      patientId: parsed.data.patientId,
      appointmentId: parsed.data.appointmentId,
      doctorId: parsed.data.doctorId,
      history: parsed.data.history,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of eventStream) {
            const line = JSON.stringify(event) + "\n";
            controller.enqueue(encoder.encode(line));
          }
          controller.close();
        } catch (err: any) {
          const errEvent: CopilotStreamEvent = {
            type: "error",
            message: err?.message || "Stream failed unexpectedly",
          };
          controller.enqueue(encoder.encode(JSON.stringify(errEvent) + "\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
