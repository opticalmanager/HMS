import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import type { WabaWebhookPayload } from "@/types/waba";

/**
 * Meta WhatsApp Cloud API Webhook Handler
 */

// 1. Webhook Verification handshake (GET)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "hms-waba-webhook-secret-token";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("[waba-webhook] Webhook handshake verified successfully by Meta.");
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden: Invalid verification token", { status: 403 });
}

// 2. Event Ingestion (POST)
export async function POST(req: NextRequest) {
  try {
    const body: WabaWebhookPayload = await req.json();

    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          const value = change.value;

          // Status updates (sent, delivered, read, failed)
          if (value.statuses && value.statuses.length > 0) {
            for (const status of value.statuses) {
              console.log(
                `[waba-webhook] Delivery status update: Message ${status.id} -> ${status.status} for recipient ${status.recipient_id}`
              );
            }
          }

          // Inbound patient messages
          if (value.messages && value.messages.length > 0) {
            for (const msg of value.messages) {
              console.log(
                `[waba-webhook] Inbound patient message from ${msg.from}: type=${msg.type}`
              );
            }
          }
        }
      }
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (err: any) {
    console.error("[waba-webhook] Ingestion error:", err);
    return NextResponse.json({ error: "Webhook ingestion error" }, { status: 500 });
  }
}
