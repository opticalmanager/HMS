# Apex HMS & Clinical EMR — Architecture Specification

## 1. Monolithic Architecture Rationale

Unlike fragmented microservice architectures that introduce network latency, distributed transaction complexity, and fragile inter-service contracts, Apex HMS is architected as a **Modular Monolith**.

- **Transactional Atomicity**: Hospital operations often require updating multiple domains simultaneously (e.g. discharging a patient updates bed status, generates an invoice, decrements medicine stock, and dispatches a WhatsApp alert). A monolithic database allows atomic PostgreSQL transactions (`db.transaction()`) with rollback guarantees.
- **Single Source of Truth**: Unified TypeScript domain types shared across database schemas, server actions, and UI components.
- **Zero-Latency In-Process Calls**: Clinical services communicate via direct TypeScript module calls without HTTP serialization overhead.

---

## 2. Database Architecture (Supabase Dual-URL Pooler)

Apex HMS connects to Supabase PostgreSQL utilizing a dual-URL architecture:

```
                                  ┌────────────────────────┐
                                  │   Apex HMS Next.js     │
                                  └───────────┬────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │                                               │
             Runtime App Pool                                Migration CLI
             (DATABASE_URL)                              (DIRECT_DATABASE_URL)
                      │                                               │
                      ▼                                               ▼
          Supabase Transaction Pooler                     Direct PostgreSQL Session
              (Port: 6543)                                    (Port: 5432)
         PgBouncer / Supavisor                              Drizzle Kit CLI
            prepare: false                                  Full DDL Access
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              │
                                              ▼
                                    PostgreSQL 16 Instance
```

### Why `prepare: false`?
When connecting through Supabase's transaction pooler (port 6543), prepared statements cannot be cached across multiple pooled connections. Omitting prepared statements (`prepare: false`) is mandatory to prevent `prepared statement "..." does not exist` errors during serverless concurrency spikes.

### Connection Limits
Serverless runtime connections are throttled via `DB_MAX_CONNECTIONS` (default: 4 in production, 8 in local development) with an idle timeout of 20 seconds to prevent pooler exhaustion.

---

## 3. Offline Clinical Continuity & Fallback

Hospital clinics cannot halt operations when external broadband connectivity fails. Apex HMS implements a multi-tiered offline resilience strategy:

### Layer 1: HMAC-SHA256 Session Signature
When a clinical user logs in while online, the server issues a cryptographically signed session payload:
```ts
interface OfflineSessionPayload {
  id: string;
  email: string;
  fullName: string;
  role: string;
  organizationId: string;
  exp: number; // 7-day expiration
}
```
If the internet disconnects, client and server-side route guards verify the tamper-proof HMAC-SHA256 signature locally using `crypto.timingSafeEqual()`.

### Layer 2: Dexie.js (IndexedDB) Clinical Cache
Patient demographics, vital signs, today's queue tokens, and draft e-prescriptions are automatically persisted in browser IndexedDB.
When connectivity is restored, the `cache-warmer` background worker synchronizes offline encounters to the primary PostgreSQL database.

---

## 4. Official Meta WhatsApp Business Cloud API (v20+)

Patient communications (appointment booking confirmations, PDF prescription download links, discharge slips) are dispatched through official Meta Graph API endpoints (`v20.0`):
- **No Third-Party Puppeteer / Baileys Companion**: Prevents phone number bans and eliminates fragile headless browser dependencies.
- **Secure Webhook Verification**: Meta sends a `GET` request with `hub.mode` and `hub.challenge`. The webhook verifies `hub.verify_token` and confirms subscription with 200 OK.
- **Signature Integrity**: Inbound delivery receipts (`sent`, `delivered`, `read`) are validated using `X-Hub-Signature-256`.

---

## 5. NHA ABDM (Ayushman Bharat Digital Mission) FHIR R4 Pipeline

Conforms to National Health Authority (NHA) specifications:
- **Milestone 1 (M1)**: ABHA number creation and verification using Aadhaar/Mobile OTP.
- **Milestone 2 (M2)**: Patient Care Context discovery and linking.
- **FHIR R4 Document Bundle**: Generates HL7 FHIR R4 compliant record bundles containing `Patient`, `Encounter`, `Condition` (ICD-10 coded), and `MedicationRequest` resources.
