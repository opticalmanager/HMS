import type { WabaSendTemplatePayload, WabaSendResponse } from "@/types/waba";
import crypto from "crypto";

const GRAPH_API_VERSION = "v20.0";
const META_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export class MetaWabaClient {
  private phoneNumberId: string;
  private accessToken: string;

  constructor(phoneNumberId?: string, accessToken?: string) {
    this.phoneNumberId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || "";
    this.accessToken = accessToken || process.env.WHATSAPP_ACCESS_TOKEN || "";
  }

  /**
   * Sends a pre-approved WhatsApp Business message template to a patient's mobile number.
   */
  async sendTemplateMessage(payload: WabaSendTemplatePayload): Promise<{ success: boolean; data?: WabaSendResponse; error?: string }> {
    if (!this.phoneNumberId || !this.accessToken) {
      console.warn("[waba-client] WhatsApp credentials not configured. Operating in simulation mode.");
      return {
        success: true,
        data: {
          messaging_product: "whatsapp",
          contacts: [{ input: payload.to, wa_id: payload.to }],
          messages: [{ id: `wamid.SIMULATED_${Date.now()}` }],
        },
      };
    }

    try {
      const endpoint = `${META_BASE_URL}/${this.phoneNumberId}/messages`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: json?.error?.message || `HTTP ${res.status}: Failed to send WhatsApp message`,
        };
      }

      return { success: true, data: json };
    } catch (err: any) {
      return { success: false, error: err?.message || "Network error dispatching WhatsApp message" };
    }
  }

  /**
   * Verifies the authenticity of incoming Meta webhook payloads using X-Hub-Signature-256
   */
  static verifyWebhookSignature(payloadRaw: string, signatureHeader: string | null, appSecret: string): boolean {
    if (!signatureHeader || !appSecret) return false;
    const parts = signatureHeader.split("=");
    if (parts.length !== 2 || parts[0] !== "sha256") return false;

    const signature = parts[1];
    const expectedHash = crypto.createHmac("sha256", appSecret).update(payloadRaw).digest("hex");

    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedHash, "hex"));
  }
}

export const wabaClient = new MetaWabaClient();
