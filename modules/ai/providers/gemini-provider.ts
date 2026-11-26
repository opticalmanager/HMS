import { GoogleGenAI } from "@google/genai";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";
import {
  type LLMProvider,
  type GenerateTextRequest,
  type GenerateTextResponse,
  type GenerateStructuredRequest,
  type GenerateStructuredResponse,
  type GenerateFromAudioRequest,
  type StreamTextRequest,
  AiNotConfiguredError,
  AiRateLimitError,
  AiPayloadTooLargeError,
  AiSchemaValidationError,
  AiTimeoutError,
} from "../types";
import { env } from "@/lib/env";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 Megabytes

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  private client: GoogleGenAI | null = null;
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || env.GEMINI_API_KEY || null;
    if (this.apiKey) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  private ensureClient(): GoogleGenAI {
    if (!this.client) {
      if (this.apiKey) {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
      } else if (env.GEMINI_API_KEY) {
        this.apiKey = env.GEMINI_API_KEY;
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
      } else {
        throw new AiNotConfiguredError();
      }
    }
    return this.client;
  }

  private isTransientError(err: any): boolean {
    const msg = String(err?.message || err).toLowerCase();
    const status = err?.status || err?.code;
    return (
      status === 429 ||
      status === 500 ||
      status === 503 ||
      msg.includes("429") ||
      msg.includes("resource_exhausted") ||
      msg.includes("rate limit") ||
      msg.includes("quota") ||
      msg.includes("overloaded") ||
      msg.includes("503")
    );
  }

  private isRateLimitError(err: any): boolean {
    const msg = String(err?.message || err).toLowerCase();
    const status = err?.status || err?.code;
    return (
      status === 429 ||
      msg.includes("429") ||
      msg.includes("resource_exhausted") ||
      msg.includes("rate limit")
    );
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    signal?: AbortSignal,
    maxRetries = 1,
    initialDelayMs = 500
  ): Promise<T> {
    let delay = initialDelayMs;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (signal?.aborted) {
        throw new AiTimeoutError();
      }
      try {
        return await fn();
      } catch (err: any) {
        if (signal?.aborted || err?.name === "AbortError") {
          throw new AiTimeoutError();
        }
        if (attempt === maxRetries || !this.isTransientError(err)) {
          if (this.isRateLimitError(err)) {
            throw new AiRateLimitError(String(err?.message || err));
          }
          throw err;
        }

        // Bounded exponential backoff with jitter
        const jitter = Math.random() * 200;
        await new Promise((res) => setTimeout(res, delay + jitter));
        delay *= 2;
      }
    }
    throw new Error("Retry loop exhausted");
  }

  async generateText(req: GenerateTextRequest): Promise<GenerateTextResponse> {
    const ai = this.ensureClient();
    const model = req.model || env.AI_MODEL_FAST;
    const timeoutMs = req.timeoutMs || env.AI_REQUEST_TIMEOUT_MS;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const signals: AbortSignal[] = [controller.signal];
    if (req.signal) signals.push(req.signal);
    const combinedSignal = (AbortSignal as any).any ? (AbortSignal as any).any(signals) : controller.signal;
    if (req.signal && !(AbortSignal as any).any) {
      req.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    const startTime = Date.now();
    try {
      const result = await this.executeWithRetry(async () => {
        return ai.models.generateContent({
          model,
          contents: req.userPrompt,
          config: {
            systemInstruction: req.systemPrompt,
            temperature: req.temperature ?? 0.2,
            abortSignal: combinedSignal,
          },
        });
      }, combinedSignal);

      const latencyMs = Date.now() - startTime;
      const text = result.text || "";
      const usage = {
        tokensIn: (result as any).usageMetadata?.promptTokenCount ?? 0,
        tokensOut: (result as any).usageMetadata?.candidatesTokenCount ?? 0,
      };

      return {
        text,
        usage,
        model,
        latencyMs,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async generateStructured<T>(
    req: GenerateStructuredRequest,
    zodSchema: z.ZodType<T>
  ): Promise<GenerateStructuredResponse<T>> {
    const ai = this.ensureClient();
    const model = req.model || env.AI_MODEL_REASONING;
    const timeoutMs = req.timeoutMs || env.AI_REQUEST_TIMEOUT_MS;

    const rawJsonSchema = zodToJsonSchema(zodSchema, {
      target: "openApi3",
      $refStrategy: "none",
    }) as any;
    delete rawJsonSchema["$schema"];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const signals: AbortSignal[] = [controller.signal];
    if (req.signal) signals.push(req.signal);
    const combinedSignal = (AbortSignal as any).any ? (AbortSignal as any).any(signals) : controller.signal;
    if (req.signal && !(AbortSignal as any).any) {
      req.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    const startTime = Date.now();
    try {
      const result = await this.executeWithRetry(async () => {
        return ai.models.generateContent({
          model,
          contents: req.userPrompt,
          config: {
            systemInstruction: req.systemPrompt,
            responseMimeType: "application/json",
            responseSchema: rawJsonSchema,
            temperature: req.temperature ?? 0.1,
            abortSignal: combinedSignal,
          },
        });
      }, combinedSignal);

      const latencyMs = Date.now() - startTime;
      const rawText = result.text || "{}";

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch (e: any) {
        throw new AiSchemaValidationError(`Invalid JSON returned by Gemini: ${e?.message}`);
      }

      const validation = zodSchema.safeParse(parsed);
      if (!validation.success) {
        throw new AiSchemaValidationError(
          `Gemini output failed Zod schema validation: ${validation.error.message}`,
          validation.error.issues
        );
      }

      const usage = {
        tokensIn: (result as any).usageMetadata?.promptTokenCount ?? 0,
        tokensOut: (result as any).usageMetadata?.candidatesTokenCount ?? 0,
      };

      return {
        data: validation.data,
        usage,
        model,
        latencyMs,
        rawText,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async generateStructuredFromAudio<T>(
    req: GenerateFromAudioRequest,
    zodSchema: z.ZodType<T>
  ): Promise<GenerateStructuredResponse<T>> {
    // 1. Strict server-side payload size guard (reject audio > 10 MB before calling API)
    const approximateBytes = Math.ceil((req.audioBase64.length * 3) / 4);
    if (approximateBytes > MAX_AUDIO_BYTES) {
      throw new AiPayloadTooLargeError();
    }

    const ai = this.ensureClient();
    const model = req.model || env.AI_MODEL_REASONING;
    const timeoutMs = req.timeoutMs || env.AI_REQUEST_TIMEOUT_MS;

    const rawJsonSchema = zodToJsonSchema(zodSchema, {
      target: "openApi3",
      $refStrategy: "none",
    }) as any;
    delete rawJsonSchema["$schema"];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const signals: AbortSignal[] = [controller.signal];
    if (req.signal) signals.push(req.signal);
    const combinedSignal = (AbortSignal as any).any ? (AbortSignal as any).any(signals) : controller.signal;
    if (req.signal && !(AbortSignal as any).any) {
      req.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    const startTime = Date.now();
    try {
      const result = await this.executeWithRetry(async () => {
        return ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    data: req.audioBase64,
                    mimeType: req.mimeType,
                  },
                },
                {
                  text: req.userPrompt || "Extract clinical consultation visit data into structured JSON",
                },
              ],
            },
          ],
          config: {
            systemInstruction: req.systemPrompt,
            responseMimeType: "application/json",
            responseSchema: rawJsonSchema,
            temperature: req.temperature ?? 0.1,
            abortSignal: combinedSignal,
          },
        });
      }, combinedSignal);

      const latencyMs = Date.now() - startTime;
      const rawText = result.text || "{}";

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch (e: any) {
        throw new AiSchemaValidationError(`Invalid JSON returned by Gemini: ${e?.message}`);
      }

      const validation = zodSchema.safeParse(parsed);
      if (!validation.success) {
        throw new AiSchemaValidationError(
          `Gemini audio extraction failed Zod schema validation: ${validation.error.message}`,
          validation.error.issues
        );
      }

      const usage = {
        tokensIn: (result as any).usageMetadata?.promptTokenCount ?? 0,
        tokensOut: (result as any).usageMetadata?.candidatesTokenCount ?? 0,
      };

      return {
        data: validation.data,
        usage,
        model,
        latencyMs,
        rawText,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async *streamText(req: StreamTextRequest): AsyncGenerator<string, void, unknown> {
    const ai = this.ensureClient();
    const model = req.model || env.AI_MODEL_FAST;

    const streamResult = await ai.models.generateContentStream({
      model,
      contents: req.userPrompt,
      config: {
        systemInstruction: req.systemPrompt,
        temperature: req.temperature ?? 0.3,
        abortSignal: req.signal,
      },
    });

    for await (const chunk of streamResult) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  }
}
