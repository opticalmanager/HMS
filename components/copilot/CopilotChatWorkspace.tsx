"use client";

import * as React from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CopilotStreamEvent } from "@/modules/ai/copilot/chat-orchestrator";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionCard?: {
    cardType: "BLOCK_SLOT" | "BOOK_FOLLOWUP";
    payload: Record<string, any>;
  };
}

interface CopilotChatWorkspaceProps {
  patientId?: string | null;
  appointmentId?: string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  patientName?: string | null;
  onRefreshQueue?: () => void;
}

const STARTER_PROMPTS = [
  "Who is next in today's OPD queue?",
  "Check open appointment slots for tomorrow",
  "Summarize active patient history and allergies",
  "Block doctor schedule 2-4 PM today for emergency surgery",
];

export function CopilotChatWorkspace({
  patientId,
  appointmentId,
  doctorId,
  doctorName,
  patientName,
  onRefreshQueue,
}: CopilotChatWorkspaceProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content: `Hello! I am your Doctor AI Copilot powered by Gemini 3.5. I have preloaded today's OPD queue and active patient context. Ask me anything about appointments, patient records, or dictations.`,
    },
  ]);
  const [inputMessage, setInputMessage] = React.useState("");
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = React.useState<string | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, statusMessage]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isStreaming) return;

    setInputMessage("");
    const userMsgId = crypto.randomUUID();
    const assistantMsgId = crypto.randomUUID();

    const newMessages: ChatMessage[] = [
      ...messages,
      { id: userMsgId, role: "user", content: text },
      { id: assistantMsgId, role: "assistant", content: "" },
    ];
    setMessages(newMessages);
    setIsStreaming(true);
    setStatusMessage("Connecting to Doctor Copilot Engine...");

    try {
      const response = await fetch("/api/crm/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          patientId: patientId || undefined,
          appointmentId: appointmentId || undefined,
          doctorId: doctorId || undefined,
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
              setStatusMessage(event.status);
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
      setStatusMessage(null);
    }
  };

  const handleConfirmAction = async (msgId: string, cardType: "BLOCK_SLOT" | "BOOK_FOLLOWUP", payload: Record<string, any>) => {
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

      // Mark action card as confirmed
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId && m.actionCard) {
            return {
              ...m,
              actionCard: {
                ...m.actionCard,
                payload: { ...m.actionCard.payload, isConfirmed: true, result: resData.result || resData.appointment },
              },
            };
          }
          return m;
        })
      );

      if (onRefreshQueue) onRefreshQueue();
    } catch (err: any) {
      alert(`Confirmation failed: ${err.message}`);
    } finally {
      setConfirmingAction(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 rounded-lg border border-slate-200 overflow-hidden text-xs">
      {/* Header */}
      <div className="py-2.5 px-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-xs">Doctor AI Copilot Chat (Gemini 3.5)</h3>
            <p className="text-[10px] text-slate-400">Context preloaded: OPD Queue, Patients & Doctor Schedule</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 py-0">
          Live Assistant
        </Badge>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={cn("flex gap-2.5 max-w-[85%]", isUser ? "ml-auto flex-row-reverse" : "mr-auto")}
            >
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
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

                {/* Interactive Action Card */}
                {msg.actionCard && (
                  <div className="p-3 rounded-lg border-2 border-indigo-200 bg-indigo-50/40 text-xs shadow-xs space-y-2">
                    {msg.actionCard.cardType === "BLOCK_SLOT" && (
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-indigo-900 uppercase tracking-wide text-[10px] mb-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Doctor Slot Block Confirmation (2-Step Human Check)</span>
                        </div>
                        <p className="text-slate-700">
                          <strong>Doctor:</strong> {msg.actionCard.payload.doctorName || "Assigned Doctor"}<br />
                          <strong>Time:</strong> {new Date(msg.actionCard.payload.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(msg.actionCard.payload.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}<br />
                          <strong>Conflicting Appointments:</strong>{" "}
                          <span className="font-bold text-rose-600">{msg.actionCard.payload.conflictCount} patient(s)</span>
                        </p>

                        {msg.actionCard.payload.conflicts?.length > 0 && (
                          <div className="mt-1.5 p-2 rounded bg-white border border-slate-200 text-[11px] max-h-24 overflow-y-auto">
                            <span className="font-semibold text-slate-700 block mb-1">Affected Patients:</span>
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
                            <span>Slot Block Executed & Reschedule Webhooks Enqueued</span>
                          </div>
                        ) : (
                          <div className="pt-1 flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleConfirmAction(msg.id, "BLOCK_SLOT", msg.actionCard!.payload)}
                              disabled={confirmingAction === msg.id}
                              className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                            >
                              {confirmingAction === msg.id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : null}
                              Confirm & Block Slot Now
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
                          <strong>Patient:</strong> {msg.actionCard.payload.patientName}<br />
                          <strong>Doctor:</strong> {msg.actionCard.payload.doctorName}<br />
                          <strong>Proposed Date & Slot:</strong> {msg.actionCard.payload.appointmentDate} at {msg.actionCard.payload.timeSlot}
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
                              onClick={() => handleConfirmAction(msg.id, "BOOK_FOLLOWUP", msg.actionCard!.payload)}
                              disabled={confirmingAction === msg.id}
                              className="h-7 text-xs bg-[#2563EB] hover:bg-blue-700 text-white cursor-pointer"
                            >
                              {confirmingAction === msg.id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : null}
                              Confirm & Book Follow-Up
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

        {statusMessage && (
          <div className="flex items-center gap-2 text-slate-400 text-[11px] italic pl-10">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{statusMessage}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Starter Prompt Chips */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 border-t border-slate-200/60 bg-white/70 flex flex-wrap gap-1.5">
          {STARTER_PROMPTS.map((chip, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(chip)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-[#2563EB] border border-slate-200 text-slate-600 transition-colors cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Message Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
      >
        <Input
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask copilot about queue, patient history, or schedule..."
          className="h-9 text-xs"
          disabled={isStreaming}
        />
        <Button
          type="submit"
          disabled={!inputMessage.trim() || isStreaming}
          className="h-9 w-9 p-0 bg-[#2563EB] hover:bg-blue-700 text-white shrink-0 cursor-pointer"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
