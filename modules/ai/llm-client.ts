import crypto from "node:crypto";
import type { z } from "zod";
import {
  type LLMProvider,
  type GenerateTextRequest,
  type GenerateTextResponse,
  type GenerateStructuredRequest,
  type GenerateStructuredResponse,
  type GenerateFromAudioRequest,
  AiPromptBlockedError,
  AiRateLimitError,
} from "./types";
import { GeminiProvider } from "./providers/gemini-provider";
import { ModelRouter, type AiTaskType } from "./model-router";
import { validateAiInput, applyPatientSafetyGuardrail, type AiChannel } from "./guardrails";
import { recordAiAudit } from "./telemetry";

export interface LlmCallOptions {
  organizationId: string;
  traceId?: string;
  channel?: AiChannel;
  actorRole?: string | null;
  actorId?: string | null;
  task: AiTaskType;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface LlmAudioCallOptions {
  organizationId: string;
  traceId?: string;
  channel?: AiChannel;
  actorRole?: string | null;
  actorId?: string | null;
  task: AiTaskType;
  audioBase64: string;
  mimeType: string;
  systemPrompt?: string;
  userPrompt?: string;
  temperature?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export class LlmClient {
  private provider: LLMProvider;

  constructor(provider?: LLMProvider) {
    this.provider = provider || new GeminiProvider();
  }

  /**
   * Sets or overrides the active provider (e.g. for mock injection in test suites).
   */
  setProvider(provider: LLMProvider): void {
    this.provider = provider;
  }

  /**
   * Generates text with input/output guardrails, task model routing, automatic fallback,
   * and non-blocking audit logging.
   */
  async generateText(options: LlmCallOptions): Promise<GenerateTextResponse> {
    const traceId = options.traceId || crypto.randomUUID();
    const channel = options.channel || "WEB_COPILOT";

    // 1. Inbound Guardrail
    const inputCheck = validateAiInput(options.userPrompt, channel);
    if (!inputCheck.allowed) {
      await recordAiAudit({
        organizationId: options.organizationId,
        traceId,
        channel: channel as any,
        actorRole: options.actorRole,
        actorId: options.actorId,
        actionType: options.task,
        status: "BLOCKED",
        errorCode: inputCheck.reason,
      });
      throw new AiPromptBlockedError(inputCheck.reason);
    }

    // 2. Model Routing
    const resolution = ModelRouter.resolveModelForTask(options.task);
    const startMs = Date.now();
    let fallbackUsed = false;

    try {
      let res: GenerateTextResponse;
      try {
        res = await this.provider.generateText({
          model: resolution.primaryModel,
          systemPrompt: options.systemPrompt,
          userPrompt: options.userPrompt,
          temperature: options.temperature,
          timeoutMs: options.timeoutMs,
          signal: options.signal,
        });
      } catch (err: any) {
        // Fallback retry if primary fails with transient error
        if (err instanceof AiRateLimitError || err?.status === 500 || err?.status === 503 || err?.code === "AI_RATE_LIMIT_EXCEEDED") {
          fallbackUsed = true;
          res = await this.provider.generateText({
            model: resolution.fallbackModel,
            systemPrompt: options.systemPrompt,
            userPrompt: options.userPrompt,
            temperature: options.temperature,
            timeoutMs: options.timeoutMs,
            signal: options.signal,
          });
        } else {
          throw err;
        }
      }

      // 3. Outbound Patient Safety Guardrail
      const guarded = applyPatientSafetyGuardrail(res.text, options.userPrompt, channel);
      const finalText = guarded.text;

      // 4. Async Telemetry
      await recordAiAudit({
        organizationId: options.organizationId,
        traceId,
        channel: channel as any,
        actorRole: options.actorRole,
        actorId: options.actorId,
        actionType: options.task,
        model: res.model,
        latencyMs: Date.now() - startMs,
        tokensIn: res.usage.tokensIn,
        tokensOut: res.usage.tokensOut,
        fallbackUsed,
        status: "SUCCESS",
      });

      return {
        ...res,
        fallbackUsed,
        text: finalText,
      };
    } catch (error: any) {
      await recordAiAudit({
        organizationId: options.organizationId,
        traceId,
        channel: channel as any,
        actorRole: options.actorRole,
        actorId: options.actorId,
        actionType: options.task,
        model: resolution.primaryModel,
        latencyMs: Date.now() - startMs,
        fallbackUsed,
        status: "ERROR",
        errorCode: error?.code || error?.message,
      });
      throw error;
    }
  }

  /**
   * Generates structured data validated by Zod schema with model routing,
   * guardrails, and telemetry.
   */
  async generateStructured<T>(
    options: LlmCallOptions,
    schema: z.ZodType<T>
  ): Promise<GenerateStructuredResponse<T>> {
    const traceId = options.traceId || crypto.randomUUID();
    const channel = options.channel || "WEB_COPILOT";

    // 1. Inbound Guardrail
    const inputCheck = validateAiInput(options.userPrompt, channel);
    if (!inputCheck.allowed) {
      await recordAiAudit({
        organizationId: options.organizationId,
        traceId,
        channel: channel as any,
        actorRole: options.actorRole,
        actorId: options.actorId,
        actionType: options.task,
        status: "BLOCKED",
        errorCode: inputCheck.reason,
      });
      throw new AiPromptBlockedError(inputCheck.reason);
    }

    // 2. Model Routing
    const resolution = ModelRouter.resolveModelForTask(options.task);
    const startMs = Date.now();
    let fallbackUsed = false;

    try {
      let res: GenerateStructuredResponse<T>;
      try {
        res = await this.provider.generateStructured(
          {
            model: resolution.primaryModel,
            systemPrompt: options.systemPrompt,
            userPrompt: options.userPrompt,
            temperature: options.temperature,
            timeoutMs: options.timeoutMs,
            signal: options.signal,
          },
          schema
        );
      } catch (err: any) {
        if (err instanceof AiRateLimitError || err?.status === 500 || err?.status === 503 || err?.code === "AI_RATE_LIMIT_EXCEEDED") {
          fallbackUsed = true;
          res = await this.provider.generateStructured(
            {
              model: resolution.fallbackModel,
              systemPrompt: options.systemPrompt,
              userPrompt: options.userPrompt,
              temperature: options.temperature,
              timeoutMs: options.timeoutMs,
              signal: options.signal,
            },
            schema
          );
        } else {
          throw err;
        }
      }

      // 3. Async Telemetry
      await recordAiAudit({
        organizationId: options.organizationId,
        traceId,
        channel: channel as any,
        actorRole: options.actorRole,
        actorId: options.actorId,
        actionType: options.task,
        model: res.model,
        latencyMs: Date.now() - startMs,
        tokensIn: res.usage.tokensIn,
        tokensOut: res.usage.tokensOut,
        fallbackUsed,
        status: "SUCCESS",
      });

      return {
        ...res,
        fallbackUsed,
      };
    } catch (error: any) {
      await recordAiAudit({
        organizationId: options.organizationId,
        traceId,
        channel: channel as any,
        actorRole: options.actorRole,
        actorId: options.actorId,
        actionType: options.task,
        model: resolution.primaryModel,
        latencyMs: Date.now() - startMs,
        fallbackUsed,
        status: "ERROR",
        errorCode: error?.code || error?.message,
      });
      throw error;
    }
  }

  /**
   * Generates structured data directly from multimodal audio payload (native STT + JSON).
   */
  async generateStructuredFromAudio<T>(
    options: LlmAudioCallOptions,
    schema: z.ZodType<T>
  ): Promise<GenerateStructuredResponse<T>> {
    const traceId = options.traceId || crypto.randomUUID();
    const channel = options.channel || "WEB_COPILOT";
    const resolution = ModelRouter.resolveModelForTask(options.task);
    const startMs = Date.now();
    let fallbackUsed = false;

    try {
      let res: GenerateStructuredResponse<T>;
      try {
        res = await this.provider.generateStructuredFromAudio(
          {
            model: resolution.primaryModel,
            audioBase64: options.audioBase64,
            mimeType: options.mimeType,
            systemPrompt: options.systemPrompt,
            userPrompt: options.userPrompt,
            temperature: options.temperature,
            timeoutMs: options.timeoutMs,
            signal: options.signal,
          },
          schema
        );
      } catch (err: any) {
        if (err instanceof AiRateLimitError || err?.status === 500 || err?.status === 503 || err?.code === "AI_RATE_LIMIT_EXCEEDED") {
          fallbackUsed = true;
          res = await this.provider.generateStructuredFromAudio(
            {
              model: resolution.fallbackModel,
              audioBase64: options.audioBase64,
              mimeType: options.mimeType,
              systemPrompt: options.systemPrompt,
              userPrompt: options.userPrompt,
              temperature: options.temperature,
              timeoutMs: options.timeoutMs,
              signal: options.signal,
            },
            schema
          );
        } else {
          throw err;
        }
      }

      // Non-blocking telemetry
      await recordAiAudit({
        organizationId: options.organizationId,
        traceId,
        channel: channel as any,
        actorRole: options.actorRole,
        actorId: options.actorId,
        actionType: options.task,
        model: res.model,
        latencyMs: Date.now() - startMs,
        tokensIn: res.usage.tokensIn,
        tokensOut: res.usage.tokensOut,
        fallbackUsed,
        status: "SUCCESS",
      });

      return {
        ...res,
        fallbackUsed,
      };
    } catch (error: any) {
      await recordAiAudit({
        organizationId: options.organizationId,
        traceId,
        channel: channel as any,
        actorRole: options.actorRole,
        actorId: options.actorId,
        actionType: options.task,
        model: resolution.primaryModel,
        latencyMs: Date.now() - startMs,
        fallbackUsed,
        status: "ERROR",
        errorCode: error?.code || error?.message,
      });
      throw error;
    }
  }

  /**
   * Streams text with inbound guardrails, task model routing, automatic fallback,
   * and non-blocking audit logging.
   */
  async *streamText(options: LlmCallOptions): AsyncGenerator<string, void, unknown> {
    const traceId = options.traceId || crypto.randomUUID();
    const channel = options.channel || "WEB_COPILOT";

    // 1. Inbound Guardrail
    const inputCheck = validateAiInput(options.userPrompt, channel);
    if (!inputCheck.allowed) {
      await recordAiAudit({
        organizationId: options.organizationId,
        traceId,
        channel: channel as any,
        actorRole: options.actorRole,
        actorId: options.actorId,
        actionType: options.task,
        status: "BLOCKED",
        errorCode: inputCheck.reason,
      });
      throw new AiPromptBlockedError(inputCheck.reason);
    }

    // 2. Model Routing
    const resolution = ModelRouter.resolveModelForTask(options.task);
    const startMs = Date.now();
    let fallbackUsed = false;
    let fullOutput = "";

    try {
      try {
        const stream = this.provider.streamText({
          model: resolution.primaryModel,
          systemPrompt: options.systemPrompt,
          userPrompt: options.userPrompt,
          temperature: options.temperature,
          timeoutMs: options.timeoutMs,
          signal: options.signal,
        });
        for await (const chunk of stream) {
          fullOutput += chunk;
          yield chunk;
        }
      } catch (err: any) {
        if (
          (err instanceof AiRateLimitError ||
            err?.status === 429 ||
            err?.status === 500 ||
            err?.status === 503 ||
            err?.code === "AI_RATE_LIMIT_EXCEEDED") &&
          fullOutput.length === 0
        ) {
          fallbackUsed = true;
          const stream = this.provider.streamText({
            model: resolution.fallbackModel,
            systemPrompt: options.systemPrompt,
            userPrompt: options.userPrompt,
            temperature: options.temperature,
            timeoutMs: options.timeoutMs,
            signal: options.signal,
          });
          for await (const chunk of stream) {
            fullOutput += chunk;
            yield chunk;
          }
        } else {
          throw err;
        }
      }

      await recordAiAudit({
        organizationId: options.organizationId,
        traceId,
        channel: channel as any,
        actorRole: options.actorRole,
        actorId: options.actorId,
        actionType: options.task,
        model: fallbackUsed ? resolution.fallbackModel : resolution.primaryModel,
        latencyMs: Date.now() - startMs,
        tokensIn: 0,
        tokensOut: Math.ceil(fullOutput.length / 4),
        fallbackUsed,
        status: "SUCCESS",
      });
    } catch (error: any) {
      await recordAiAudit({
        organizationId: options.organizationId,
        traceId,
        channel: channel as any,
        actorRole: options.actorRole,
        actorId: options.actorId,
        actionType: options.task,
        model: resolution.primaryModel,
        latencyMs: Date.now() - startMs,
        fallbackUsed,
        status: "ERROR",
        errorCode: error?.code || error?.message,
      });
      throw error;
    }
  }
}

export const defaultLlmClient = new LlmClient();
