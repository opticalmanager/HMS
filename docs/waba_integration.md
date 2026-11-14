# Apex HMS — Meta WhatsApp Business Cloud API (WABA v20+) Integration Guide

## 1. Overview

Apex HMS communicates with patients via the **Official Meta WhatsApp Cloud API (Graph API v20.0)**.
No third-party emulators, Puppeteer headless scripts, or unofficial WhatsApp Web bots (such as Baileys) are used. This ensures 100% compliance with Meta Business Policies and eliminates phone number bans.

---

## 2. Environment Configuration

The following credentials must be set in `.env`:

```env
# Official Meta Developer Portal Credentials
WHATSAPP_PHONE_NUMBER_ID="100000000000001"
WHATSAPP_BUSINESS_ACCOUNT_ID="200000000000002"
WHATSAPP_ACCESS_TOKEN="EAAG..."
WHATSAPP_WEBHOOK_VERIFY_TOKEN="hms-waba-webhook-secret-token"
```

---

## 3. Approved Clinical Message Templates

The system relies on pre-approved Meta message templates for outbound hospital notifications:

### Template 1: `appointment_confirmation_v1`
- **Category**: `UTILITY`
- **Body**:
  ```text
  Hello {{1}}, your appointment at {{5}} has been confirmed with {{2}} on {{3}}. Your OPD Token Number is #{{4}}. Please arrive 15 minutes before your time slot.
  ```
- **Variables**:
  - `{{1}}`: Patient Full Name
  - `{{2}}`: Doctor Name & Department
  - `{{3}}`: Date & Time Slot
  - `{{4}}`: Token Number
  - `{{5}}`: Hospital Name

### Template 2: `prescription_ready_v1`
- **Category**: `UTILITY`
- **Body**:
  ```text
  Dear {{1}}, your medical prescription for consultation {{2}} with {{3}} is ready. Click the button below to view or download your official digital PDF prescription.
  ```
- **Interactive Button**: Dynamic URL to PDF download link.

### Template 3: `ipd_discharge_v1`
- **Category**: `UTILITY`
- **Body**:
  ```text
  Dear {{1}}, your discharge summary and bill settlement for admission {{2}} has been processed. We wish you a speedy recovery!
  ```

---

## 4. Webhook Handshake & Ingestion

### Verification Handshake (`GET /api/webhooks/whatsapp`)
When registering the webhook URL in Meta Business Suite, Meta dispatches a verification challenge:
```ts
const mode = searchParams.get("hub.mode");
const token = searchParams.get("hub.verify_token");
const challenge = searchParams.get("hub.challenge");

if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
  return new Response(challenge, { status: 200 });
}
```

### Event Ingestion (`POST /api/webhooks/whatsapp`)
Meta sends asynchronous updates regarding message delivery status:
- `sent`: Successfully accepted by WhatsApp server.
- `delivered`: Reached the patient's device.
- `read`: Patient opened the notification.
- `failed`: Delivery failure (e.g. invalid phone number).

The webhook updates the `whatsapp_messages` table and flags delivery receipts in the clinical console.
