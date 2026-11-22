import { env } from "@/lib/env";

export type AiTaskType =
  | "faq_rag"
  | "intent_classify"
  | "slot_summary"
  | "voice_turn"
  | "doctor_dictation_extract"
  | "clinical_summary"
  | "schedule_conflict_chat";

export type ModelTier = "fast" | "reasoning";

export interface ModelResolution {
  primaryModel: string;
  fallbackModel: string;
  tier: ModelTier;
}

const FAST_TASKS = new Set<AiTaskType>([
  "faq_rag",
  "intent_classify",
  "slot_summary",
  "voice_turn",
]);

export class ModelRouter {
  /**
   * Resolves the primary and fallback model for a clinical or operational AI task.
   */
  static resolveModelForTask(task: AiTaskType): ModelResolution {
    const isFast = FAST_TASKS.has(task);

    const fastModel = env.AI_MODEL_FAST;
    const reasoningModel = env.AI_MODEL_REASONING;

    if (isFast) {
      return {
        primaryModel: fastModel,
        fallbackModel: reasoningModel,
        tier: "fast",
      };
    }

    return {
      primaryModel: reasoningModel,
      fallbackModel: fastModel,
      tier: "reasoning",
    };
  }
}
