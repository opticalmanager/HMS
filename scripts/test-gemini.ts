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

  // 1. Smoke test: Text Generation
  console.log("\n1. Testing Text Generation (Fast Tier: gemini-2.5-flash-lite)...");
  try {
    const textRes = await provider.generateText({
      model: "gemini-2.5-flash-lite",
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
  console.log("2. Testing Structured Consultation Extraction (gemini-2.5-flash)...");
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
        model: "gemini-2.5-flash",
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

  console.log("\nGemini Smoke Test Finished.");
}

main().catch(console.error);
