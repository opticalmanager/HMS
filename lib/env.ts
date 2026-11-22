import "server-only";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default("postgres://postgres:postgres@localhost:5432/hms"),
  DIRECT_DATABASE_URL: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(32).default("better-auth-secret-apex-hms-clinic-crm-key-32ch"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  AI_PROVIDER: z.string().default("gemini"),
  GEMINI_API_KEY: z.string().optional(),
  AI_MODEL_FAST: z.string().default("gemini-2.5-flash-lite"),
  AI_MODEL_REASONING: z.string().default("gemini-2.5-flash"),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().default(25000),
  INTERNAL_CRON_SECRET: z.string().optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
  AI_PROVIDER: process.env.AI_PROVIDER,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  AI_MODEL_FAST: process.env.AI_MODEL_FAST,
  AI_MODEL_REASONING: process.env.AI_MODEL_REASONING,
  AI_REQUEST_TIMEOUT_MS: process.env.AI_REQUEST_TIMEOUT_MS,
  INTERNAL_CRON_SECRET: process.env.INTERNAL_CRON_SECRET,
});
