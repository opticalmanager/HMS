/**
 * Meta WhatsApp Business Cloud API (WABA v20+) Types
 */

export interface WabaTemplateComponent {
  type: "header" | "body" | "button";
  sub_type?: "url" | "quick_reply";
  index?: number;
  parameters: Array<{
    type: "text" | "currency" | "date_time" | "image" | "document";
    text?: string;
    document?: { link: string; filename: string };
    image?: { link: string };
  }>;
}

export interface WabaSendTemplatePayload {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string; // E.164 formatted, e.g. "919876543210"
  type: "template";
  template: {
    name: string;
    language: {
      code: string; // e.g. "en", "hi"
    };
    components?: WabaTemplateComponent[];
  };
}

export interface WabaSendResponse {
  messaging_product: "whatsapp";
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export interface WabaWebhookStatus {
  id: string; // WABA message id
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string; message: string }>;
}

export interface WabaWebhookIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "button" | "interactive";
  text?: { body: string };
  button?: { payload: string; text: string };
}

export interface WabaWebhookPayload {
  object: "whatsapp_business_account";
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: "whatsapp";
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: WabaWebhookIncomingMessage[];
        statuses?: WabaWebhookStatus[];
      };
      field: string;
    }>;
  }>;
}
