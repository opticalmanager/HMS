import type { z } from "zod";

export class AiNotConfiguredError extends Error {
  code = "AI_NOT_CONFIGURED";
  status = 503;
  constructor(message = "AI provider is not configured. Set GEMINI_API_KEY in environment.") {
    super(message);
    this.name = "AiNotConfiguredError";
  }
}

export class AiRateLimitError extends Error {
  code = "AI_RATE_LIMIT_EXCEEDED";
  status = 429;
  retryAfterMs?: number;
  constructor(message = "AI rate limit exceeded (429)", retryAfterMs?: number) {
    super(message);
    this.name = "AiRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class AiPayloadTooLargeError extends Error {
  code = "AI_PAYLOAD_TOO_LARGE";
  status = 413;
  constructor(message = "Audio payload exceeds the 10 MB limit.") {
    super(message);
    this.name = "AiPayloadTooLargeError";
  }
}

export class AiSchemaValidationError extends Error {
  code = "AI_SCHEMA_VALIDATION_FAILED";
  status = 422;
  issues?: unknown[];
  constructor(message = "Structured response failed Zod schema validation", issues?: unknown[]) {
    super(message);
    this.name = "AiSchemaValidationError";
    this.issues = issues;
  }
}

export class AiTimeoutError extends Error {
  code = "AI_REQUEST_TIMEOUT";
  status = 504;
  constructor(message = "AI model request timed out") {
    super(message);
    this.name = "AiTimeoutError";
  }
}

export class AiPromptBlockedError extends Error {
  code = "AI_PROMPT_BLOCKED";
  status = 400;
  reason: string;
  constructor(reason = "PROMPT_INJECTION_DETECTED") {
    super(`AI input was blocked by safety guardrails: ${reason}`);
    this.name = "AiPromptBlockedError";
    this.reason = reason;
  }
}

export interface TokenUsage {
  tokensIn: number;
  tokensOut: number;
}

export interface GenerateTextRequest {
  model?: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface GenerateTextResponse {
  text: string;
  usage: TokenUsage;
  model: string;
  latencyMs: number;
  fallbackUsed?: boolean;
}

export interface GenerateStructuredRequest {
  model?: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface GenerateStructuredResponse<T> {
  data: T;
  usage: TokenUsage;
  model: string;
  latencyMs: number;
  rawText?: string;
  fallbackUsed?: boolean;
}

export interface GenerateFromAudioRequest {
  model?: string;
  audioBase64: string;
  mimeType: string;
  systemPrompt?: string;
  userPrompt?: string;
  temperature?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface StreamTextRequest {
  model?: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface LLMProvider {
  readonly name: string;
  generateText(req: GenerateTextRequest): Promise<GenerateTextResponse>;
  generateStructured<T>(
    req: GenerateStructuredRequest,
    zodSchema: z.ZodType<T>
  ): Promise<GenerateStructuredResponse<T>>;
  generateStructuredFromAudio<T>(
    req: GenerateFromAudioRequest,
    zodSchema: z.ZodType<T>
  ): Promise<GenerateStructuredResponse<T>>;
  streamText(req: StreamTextRequest): AsyncGenerator<string, void, unknown>;
}
