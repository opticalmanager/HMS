import "dotenv/config";
import { GeminiProvider } from "../modules/ai/providers/gemini-provider";
import { VisitExtractionSchema } from "../lib/validations/clinical-ai";
import { DOCTOR_DICTATION_PROMPT_V1 } from "../modules/ai/prompts";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "dummy_key" || apiKey.includes("placeholder")) {
    console.error("=================================================================");
    console.error("GEMINI_API_KEY is not configured or is a placeholder.");
    console.error("Please add your Google AI Studio Free Tier key to .env:");
    console.error("GEMINI_API_KEY=AIzaSy...");
    console.error("=================================================================");
    process.exit(1);
  }

  console.log("-----------------------------------------------------------------");
  console.log("Initiating Gemini Connectivity Smoke Test with @google/genai...");
  console.log("-----------------------------------------------------------------");

  const provider = new GeminiProvider(apiKey);
  const fastModel = process.env.AI_MODEL_FAST || "gemini-3.5-flash-lite";
  const reasoningModel = process.env.AI_MODEL_REASONING || "gemini-3.5-flash";

  // 1. Smoke test: Text Generation
  console.log(`\n1. Testing Text Generation (Fast Tier: ${fastModel})...`);
  try {
    const textRes = await provider.generateText({
      model: fastModel,
      systemPrompt: "You are a helpful clinical assistant. Be brief.",
      userPrompt: "What is the primary indication and adult oral dose of Paracetamol?",
    });

    console.log("Success! Received response:");
    console.log("Model:", textRes.model);
    console.log("Latency:", textRes.latencyMs, "ms");
    console.log("Tokens In/Out:", textRes.usage.tokensIn, "/", textRes.usage.tokensOut);
    console.log("Answer snippet:", textRes.text.slice(0, 160) + "...\n");
  } catch (err: any) {
    console.error("Text generation failed:", err?.message || err);
  }

  // 2. Smoke test: Structured Visit Extraction
  console.log(`2. Testing Structured Consultation Extraction (${reasoningModel})...`);
  const testDictation = `
    Patient Rajesh Kumar, 42 male, comes in with complaint of high grade fever since 3 days with chills, severe sir dard and body ache.
    Provisional diagnosis is Acute Viral Fever.
    Prescribing: Tab Dolo 650 TDS for 3 days after food, Tab Pantocid 40 OD khali pet for 5 days.
    Ordered complete blood count CBC and Dengue NS1 antigen test.
    Follow up after 3 days if fever does not subside.
  `;

  try {
    const structuredRes = await provider.generateStructured(
      {
        model: reasoningModel,
        systemPrompt: DOCTOR_DICTATION_PROMPT_V1,
        userPrompt: testDictation,
      },
      VisitExtractionSchema
    );

    console.log("Success! Extracted Structured Visit Data:");
    console.log("Chief Complaint:", structuredRes.data.chiefComplaint);
    console.log("Diagnosis:", structuredRes.data.diagnosis);
    console.log("Medicines:", JSON.stringify(structuredRes.data.medicines, null, 2));
    console.log("Billable Items:", JSON.stringify(structuredRes.data.billableItems, null, 2));
    console.log("Follow-Up Days:", structuredRes.data.followUpDays);
    console.log("Latency:", structuredRes.latencyMs, "ms");
  } catch (err: any) {
    console.error("Structured extraction failed:", err?.message || err);
  }

  // 3. Smoke test: Multimodal Audio Extraction (Demonstrating generateStructuredFromAudio)
  console.log("\n3. Testing Multimodal Audio API Interface (generateStructuredFromAudio)...");
  // Construct a minimal 1-second silent 16kHz mono PCM WAV header for testing API schema and payload serialization
  const sampleWavHeader = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x66, 0x6d, 0x74, 0x20,
    0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x80, 0x3e, 0x00, 0x00, 0x00, 0x7d, 0x00, 0x00,
    0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00
  ]).toString("base64");

  try {
    const audioRes = await provider.generateStructuredFromAudio(
      {
        model: reasoningModel,
        audioBase64: sampleWavHeader,
        mimeType: "audio/wav",
        systemPrompt: DOCTOR_DICTATION_PROMPT_V1,
        userPrompt: "Extract consultation dictation if present or report empty/clean structure.",
      },
      VisitExtractionSchema
    );

    console.log("Success! Audio extraction response received from Gemini:");
    console.log("Diagnosis:", audioRes.data.diagnosis);
    console.log("Model:", audioRes.model);
    console.log("Latency:", audioRes.latencyMs, "ms");
  } catch (err: any) {
    console.log("Audio endpoint response:", err?.message || err);
  }

  console.log("\nGemini Smoke Test Finished.");
}

main().catch(console.error);
