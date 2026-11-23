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
  // Construct a valid 1-second silent 16kHz 16-bit mono PCM WAV for testing audio ingestion
  function createSilentWav(durationSeconds = 1, sampleRate = 16000): Buffer {
    const numSamples = durationSeconds * sampleRate;
    const dataSize = numSamples * 2;
    const buf = Buffer.alloc(44 + dataSize);
    buf.write("RIFF", 0);
    buf.writeUInt32LE(36 + dataSize, 4);
    buf.write("WAVE", 8);
    buf.write("fmt ", 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20); // PCM
    buf.writeUInt16LE(1, 22); // Mono
    buf.writeUInt32LE(sampleRate, 24);
    buf.writeUInt32LE(sampleRate * 2, 28);
    buf.writeUInt16LE(2, 32);
    buf.writeUInt16LE(16, 34);
    buf.write("data", 36);
    buf.writeUInt32LE(dataSize, 40);
    return buf;
  }
  const sampleWavBase64 = createSilentWav(1).toString("base64");

  try {
    const audioRes = await provider.generateStructuredFromAudio(
      {
        model: reasoningModel,
        audioBase64: sampleWavBase64,
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
