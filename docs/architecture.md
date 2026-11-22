# Clinic CRM + Multi-Channel AI Automation — Production Architecture Blueprint

## 1. System Overview & Product Goals

This project is a **multi-tenant Clinic CRM & AI Automation platform** built on **Next.js (App Router)** and **PostgreSQL**, designed to run cleanly on Vercel today and migrate seamlessly to a **self-hosted VPS (Docker + Nginx/Caddy)** alongside self-hosted voice infrastructure later.

Every clinic operates as an isolated **Organization (Tenant)** with multiple staff roles (`owner`, `admin`, `doctor`, `receptionist`). The CRM acts as the **Single Source of Truth (SSOT)** for three AI-powered interaction surfaces:

1. **In-CRM Doctor Copilot (Web Panel):** Doctors chat with clinic/patient context or dictate visit summaries via voice (English/Hinglish). The AI extracts structured prescriptions and bills into a **Human-in-the-Loop (HITL) Draft Card** for 1-click doctor approval.
2. **WhatsApp AI Assistant (via External Broadcast Manager + WABA):** A single clinic WhatsApp Business number serves both staff and patients using **phone-number-resolved RBAC**. Doctors can query schedules, check appointment statuses, and lock/block slots; patients can query clinic info (RAG) and book/check their own appointments.
3. **Voice Calling Agent (Future — Self-Hosted Open-Source Dograh):** Answers inbound patient calls, fetches caller context before speaking, checks live doctor availability, books appointments via MCP tools, and logs transcripts post-call.

---

## 2. High-Level System Architecture

```text
┌─────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────┐
│  1. CRM Web Panel   │   │ 2. WhatsApp Broadcast Mgr │   │ 3. Dograh Voice (Future)  │
│  Doctor Chat/Voice  │   │  WABA + Existing AI Agent │   │  OSS Docker + Telephony   │
└──────────┬──────────┘   └─────────────┬─────────────┘   └─────────────┬─────────────┘
           │ Better Auth Session        │ API Key + (wabaId, phone)     │ Pre-call REST + MCP + Post-call
           ▼                            ▼                               ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                   AI GATEWAY, IDENTITY RESOLVER & GUARDRAILS LAYER                   │
│  • Auth/Session Validator (Web) | Phone-to-Role Resolver (WhatsApp/Voice)            │
│  • Input Guardrails: Prompt Injection Detection, Rate Limits, PII Minimization       │
│  • Role-Based Tool Filter: Patients NEVER receive Doctor/Admin MCP tools             │
│  • Safe Semantic Cache (Redis): Public clinic FAQs ONLY (scoped by clinicId)         │
└───────────────────┬───────────────────────────────────────┬──────────────────────────┘
                    │                                       │
                    ▼                                       ▼
┌────────────────────────────────────────┐   ┌─────────────────────────────────────────┐
│    In-CRM Copilot Orchestrator         │   │     Shared CRM MCP Server               │
│    (Inside Next.js: src/modules/ai/)   │   │     (Streamable HTTP + Zod Schemas)     │
│  • Audio Capture -> STT (Hinglish)     │   │  • get_available_slots                  │
│  • Model Router (Fast vs Reasoning)    │   │  • book_appointment (idempotent)        │
│  • Structured JSON Extractor (Zod)     │   │  • cancel_or_reschedule_appointment     │
│  • Fuzzy Matcher (Medicine & Tariffs)  │   │  • get_doctor_schedule (Doctor+)        │
│  • Output Guardrails + HITL Draft UI   │   │  • block_doctor_slot (2-step dryRun)    │
└───────────────────┬────────────────────┘   │  • search_clinic_knowledge (RAG)        │
                    │                        └────────────────────┬────────────────────┘
                    └──────────────────────┬──────────────────────┘
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│               SHARED DOMAIN SERVICE LAYER (src/services/domain/*)                    │
│   appointmentService | prescriptionService | billingService | scheduleService | RAG  │
│   * Single source of truth used by Web UI, REST Webhooks, Copilot, and MCP Server *  │
└───────────────────┬───────────────────────────────────────┬──────────────────────────┘
                    │                                       │ Async Outbound Webhooks
                    ▼                                       ▼ (Transactional Outbox)
┌────────────────────────────────────────┐   ┌─────────────────────────────────────────┐
│     PostgreSQL (+ pgvector, pg_trgm)   │   │      Broadcast Manager Outbound API     │
│  • Better Auth + Organization tables   │   │  • Sends WhatsApp Booking Confirmations │
│  • Partial Unique Slot Locks           │   │  • Sends Reminders & Reschedule Alerts  │
│  • Idempotency Keys & Audit Logs       │   │  • Sends Approved Prescription/Bill PDF │
│  • Clinic Knowledge Embeddings         │   └─────────────────────────────────────────┘
└────────────────────────────────────────┘
                    │
                    ▼ (Async Telemetry)
┌──────────────────────────────────────────────────────────────────────────────────────┐
│              OBSERVABILITY (OpenTelemetry / Langfuse + Structured Logs)              │
│   Trace IDs, Latency per Step, Token Spend per Clinic, Tool Error Rates, Evals       │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Stack & Modular Codebase Layout

- **Framework:** Next.js (App Router, TypeScript strict mode)
- **Database:** PostgreSQL with `pgvector` (RAG embeddings) and `pg_trgm` (fuzzy medicine/service matching)
- **Auth & Multi-Tenancy:** **Better Auth** (`organization` plugin + `apiKey` plugin + future `jwt` / `@better-auth/mcp`)
- **Validation:** Zod (shared across forms, API routes, LLM structured outputs, and MCP tool schemas)
- **Caching & Queues (Phase 5):** Redis (semantic FAQ cache + rate limiting + webhook retries)
- **Observability:** Langfuse or OpenTelemetry (async non-blocking tracing)

### Target Folder Structure

```text
src/
├── app/
│   ├── (auth)/login|signup|onboarding/       # Auth & clinic creation flows
│   ├── dashboard/                            # Protected Clinic CRM UI + AI Copilot Panel
│   └── api/
│       ├── auth/[...all]/route.ts            # Better Auth handler
│       ├── crm/                              # Authenticated Web CRM endpoints
│       ├── integrations/
│       │   ├── whatsapp/resolve-identity/    # Phone -> Role resolver for Broadcast Mgr
│       │   └── dograh/                       # Pre-call context & post-call webhook routes
│       └── mcp/route.ts                      # Streamable HTTP MCP Server endpoint
├── lib/
│   ├── auth.ts                               # Better Auth config + RBAC permissions
│   ├── auth-client.ts                        # Client hooks
│   ├── auth-guard.ts                         # requireClinicSession() & verifyServiceAccess()
│   ├── db.ts                                 # Prisma / Drizzle client
│   └── telemetry.ts                          # Tracing, latency & cost logging
├── services/
│   └── domain/                               # PURE BUSINESS LOGIC (Zero HTTP/LLM coupling)
│       ├── appointment.service.ts            # Slot calculation, atomic booking, locks
│       ├── schedule.service.ts               # Doctor availability & 2-step slot blocking
│       ├── prescription.service.ts           # Draft creation, fuzzy drug lookup, approval
│       ├── billing.service.ts                # Tariff lookup, GST/line-item calc, invoicing
│       ├── knowledge.service.ts              # Chunking, embeddings, tenant-filtered RAG
│       └── notification.service.ts           # Event dispatcher -> Broadcast Manager webhooks
└── modules/
    └── ai/
        ├── llm-client.ts                     # Provider wrapper (timeouts, retries, Zod output)
        ├── model-router.ts                   # Fast vs reasoning model selection + fallbacks
        ├── guardrails.ts                     # Input injection filter & output PHI/medical checks
        ├── semantic-cache.ts                 # FAQ-only Redis semantic cache
        ├── prompts/                          # Versioned system prompts (doctor, patient, extract)
        ├── copilot/                          # In-CRM Doctor Dictation & Chat orchestrator
        └── mcp/                              # MCP tool registrations calling services/domain/*
```

---

## 4. Multi-Tenancy, Authentication & RBAC (Better Auth)

### Tenant Model
- **1 Better Auth `organization` = 1 Clinic (`clinicId`).**
- Every business table in PostgreSQL MUST include `clinic_id` (foreign key referencing `organization.id`).
- Clinic metadata table (`clinic_profiles`) stores `waba_id`, `whatsapp_webhook_url`, `timezone` (default `Asia/Kolkata`), working hours, and GST/invoice settings.

### Role Permission Matrix

| Capability | `owner` | `admin` | `doctor` | `receptionist` | `patient` (WhatsApp/Voice) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Manage clinic billing & org deletion | Yes | No | No | No | No |
| Invite/remove staff & assign roles | Yes | Yes | No | No | No |
| Manage clinic tariffs & knowledge docs | Yes | Yes | View | View | Public FAQ RAG only |
| View all clinic appointments | Yes | Yes | Own + assigned | Yes | Own bookings only |
| Book/cancel patient appointments | Yes | Yes | Own | Yes | Own bookings only |
| Block/lock doctor schedule slots | Yes | Yes | Own only | No | No |
| Use In-CRM Dictation Copilot (Rx + Bill) | Yes | No | Yes | Draft bill only | No |
| Approve & finalize medical prescriptions | Yes (if MD) | No | Yes | No | No |

### Channel-Specific Identity Resolution
1. **CRM Web App:** Better Auth database session (`HttpOnly` cookie) -> `requireClinicSession(permission)` extracts `{ userId, clinicId, role }` strictly from server session.
2. **WhatsApp Broadcast Manager:** Broadcast Manager authenticates with a clinic-scoped Better Auth `apiKey`, passing `(wabaId, senderPhone)` to `POST /api/integrations/whatsapp/resolve-identity`.
   - CRM normalizes phone to E.164 (`+91...`) and looks up active `doctors` / `members` for that `clinicId`.
   - **Match found:** Returns short-lived scoped context `{ clinicId, role: 'doctor' | 'admin', doctorId, allowedTools }`.
   - **No match found:** Returns `{ clinicId, role: 'patient', patientPhone, allowedTools: PATIENT_TOOLS }`.
3. **Dograh Voice Agent:** Authenticates with a dedicated `VOICE_AGENT` scoped API key bound to a single `clinicId` and strictly limited to `PATIENT_VOICE_TOOLS`.

---

## 5. Production Database Schema & Smart Concurrency Logic

All tables include `id`, `clinic_id`, `created_at`, and `updated_at`.

### Core Entities
- **`clinic_profiles`**: `clinic_id` (PK/FK), `name`, `phone`, `address`, `waba_id` (unique), `broadcast_webhook_url`, `broadcast_api_key_enc`, `timezone`, `default_slot_minutes`.
- **`doctors`**: `id`, `clinic_id`, `user_id` (FK to Better Auth `user`), `full_name`, `specialty`, `phone_e164` (indexed for WhatsApp RBAC), `consultation_fee`, `is_active`.
- **`doctor_schedules`**: `id`, `clinic_id`, `doctor_id`, `day_of_week` (0-6), `start_time`, `end_time`, `slot_duration_mins`.
- **`doctor_slot_blocks`**: `id`, `clinic_id`, `doctor_id`, `start_at` (TIMESTAMPTZ), `end_at` (TIMESTAMPTZ), `reason`, `created_via` (`WEB` | `WHATSAPP`).
- **`patients`**: `id`, `clinic_id`, `full_name`, `phone_e164`, `dob`, `gender`, `allergies`, `notes`. Unique index on `(clinic_id, phone_e164)`.
- **`appointments`**: `id`, `clinic_id`, `doctor_id`, `patient_id`, `slot_start` (TIMESTAMPTZ), `slot_end` (TIMESTAMPTZ), `status` (`CONFIRMED` | `CHECKED_IN` | `COMPLETED` | `CANCELLED` | `NO_SHOW`), `source` (`WEB` | `WHATSAPP` | `VOICE_DOGRAH`), `idempotency_key` (unique per clinic, nullable), `notes`.
- **`medicine_master`**: `id`, `clinic_id`, `brand_name`, `generic_name`, `strength`, `form` (tab/syrup/cap), `default_dosage`. GIN trigram index (`pg_trgm`) on `brand_name` and `generic_name`.
- **`service_tariffs`**: `id`, `clinic_id`, `name`, `category` (`CONSULTATION` | `LAB` | `PROCEDURE`), `price`, `tax_rate`, `is_active`. GIN trigram index on `name`.
- **`prescriptions`**: `id`, `clinic_id`, `appointment_id`, `doctor_id`, `patient_id`, `status` (`DRAFT` | `APPROVED`), `raw_transcript`, `chief_complaint`, `diagnosis`, `items_json` (validated array of medicines + dosage + duration + instructions), `follow_up_date`, `approved_at`.
- **`invoices`**: `id`, `clinic_id`, `appointment_id`, `patient_id`, `status` (`DRAFT` | `ISSUED` | `PAID` | `VOID`), `line_items_json`, `subtotal`, `tax_total`, `grand_total`.
- **`clinic_knowledge_chunks`**: `id`, `clinic_id`, `document_id`, `source_title`, `access_scope` (`PUBLIC` | `STAFF_ONLY`), `content`, `embedding` (`vector(1536)` or matching embedding model dim), `metadata_json`.
- **`webhook_outbox`**: `id`, `clinic_id`, `event_type`, `payload_json`, `status` (`PENDING` | `SENT` | `FAILED`), `attempts`, `next_retry_at`.
- **`ai_audit_logs`**: `id`, `clinic_id`, `channel`, `actor_role`, `actor_id`, `action_type`, `tool_calls_json`, `latency_ms`, `tokens_in`, `tokens_out`, `estimated_cost_usd`, `status`.

### Smart Concurrency & Anti-Double-Booking Logic
Because Web, WhatsApp, and Dograh can attempt to book the exact same doctor slot at the same millisecond:
1. **Database Partial Unique Constraint:**
   ```sql
   CREATE UNIQUE INDEX idx_unique_active_doctor_slot
   ON appointments (clinic_id, doctor_id, slot_start)
   WHERE status IN ('CONFIRMED', 'CHECKED_IN');
   ```
2. **Idempotent Bookings:** Every booking call from WhatsApp or Dograh passes an `idempotency_key` (for Dograh, use `workflow_run_id`). If a network timeout causes a retry, `appointmentService.book()` returns the already-created appointment instead of failing or double-booking.
3. **Atomic Slot Check:** Inside a PostgreSQL transaction, check `doctor_slot_blocks` for overlapping ranges before inserting into `appointments`. If a unique constraint conflict occurs (`23505`), return a clean structured result with the next 3 closest open slots so the AI agent smoothly offers alternatives.

---

## 6. Channel 1: In-CRM Doctor Dictation & Copilot (Smart HITL Flow)

The Doctor Copilot lives **inside the Next.js CRM (`src/modules/ai/copilot/`)** to reuse authenticated sessions, ORM types, and stream structured drafts directly to the UI.

### End-to-End Voice Dictation Pipeline
1. **Audio Capture:** Doctor clicks Record inside a patient visit screen (`MediaRecorder` WebM/Opus, chunked/capped for low latency).
2. **Transcription (STT):** Audio goes to an Indian-accent / Hinglish-capable STT model (e.g., Deepgram Nova-3, Sarvam AI, or Whisper/Gemini Audio) with medical vocabulary biasing.
3. **Structured Extraction (LLM + Zod):** System prompt forces strict JSON output matching `VisitExtractionSchema`:
   - `chiefComplaint`, `symptoms[]`, `diagnosis`
   - `medicines[]`: `{ spokenName, dosage, frequency, durationDays, instructions, confidence }`
   - `billableItems[]`: `{ spokenServiceName, quantity, customAmountIfStated, confidence }`
   - `followUpDays`, `missingInfoWarnings[]`
4. **Deterministic Grounding (Zero Hallucinated Prices/Drugs):**
   - Backend runs PostgreSQL `pg_trgm` fuzzy matching for every extracted medicine against `medicine_master` and every billable item against `service_tariffs` (strictly filtered by `clinic_id`).
   - Official prices always come from `service_tariffs` unless the doctor explicitly stated a custom override.
   - Any item with similarity below threshold (e.g., less than 0.45) or low LLM confidence is flagged `needsReview: true`.
5. **Human-in-the-Loop (HITL) Draft Card:**
   - System saves `prescriptions` (`status: 'DRAFT'`) and `invoices` (`status: 'DRAFT'`).
   - UI renders an editable card highlighting flagged fields in amber.
   - Doctor reviews in 3 seconds and clicks **Approve & Send** -> transitions status to `APPROVED` / `ISSUED`, generates PDF, and enqueues a `prescription.approved` outbox event to Broadcast Manager.

---

## 7. Channel 2: Shared CRM MCP Server & WhatsApp RBAC

Exposing one **Streamable HTTP MCP Server** (`/api/mcp` or co-located Node service) prevents duplicating schemas and business rules across Broadcast Manager and Dograh.

### Role-Scoped MCP Tool Catalog

**Patient Tools (`PATIENT` / `PATIENT_VOICE`):**
- `search_clinic_knowledge(query)` -> RAG over `clinic_knowledge_chunks` WHERE `clinic_id = ctx.clinicId AND access_scope = 'PUBLIC'`.
- `list_doctors(specialty?)` -> Active clinic doctors, timings, consultation fees.
- `get_available_slots(doctorId, date)` -> Returns compact list of up to 5 open slots (never dumps raw DB rows).
- `book_appointment(doctorId, slotStart, patientName, reason?, idempotencyKey)` -> Uses verified `ctx.patientPhone`; never lets LLM book for arbitrary phone numbers without verification.
- `get_my_appointments()` -> Strictly scoped to `ctx.patientPhone`.
- `cancel_my_appointment(appointmentId)` -> Verifies ownership via `ctx.patientPhone`.

**Doctor / Staff Tools (`DOCTOR` / `ADMIN` / `OWNER`):**
- All read-only clinic tools + `search_clinic_knowledge` (includes `STAFF_ONLY` SOPs).
- `get_doctor_schedule(date, doctorId?)` -> For `DOCTOR`, defaults/locks to `ctx.doctorId` unless `ADMIN`/`OWNER`.
- `get_appointment_status(date?, patientQuery?)` -> Check-in/completed/pending counts and statuses.
- `block_doctor_slot(startAt, endAt, reason, dryRun)` -> **Mandatory 2-Step Conflict Check:**
  - Step 1 (`dryRun: true`): Queries overlapping `CONFIRMED` appointments and returns count + patient names (*"2 patients booked at 3:30 PM and 4:00 PM. Confirm to lock slot?"*).
  - Step 2 (`dryRun: false`): Inserts `doctor_slot_blocks` row and optionally marks affected appointments for rescheduling via Broadcast Manager.

### MCP Engineering Principles
- **Zero Tenant Trust:** `clinicId`, `role`, `doctorId`, and `patientPhone` are injected from server-side auth middleware into MCP execution context—**never defined as LLM tool arguments**.
- **Recoverable Tool Errors:** Business errors (slot taken, doctor on leave, invalid date) return `{ isError: true, content: [{ type: "text", text: "Slot 4:00 PM is taken. Next available: 4:30 PM, 5:00 PM." }] }` so the LLM recovers gracefully instead of crashing.

---

## 8. Channel 3: Future Dograh Voice Agent Integration

Designed today so adding Dograh later requires **zero CRM refactoring**:

1. **Pre-Call Data Fetch (REST):** `GET /api/integrations/dograh/caller-context?phone=+91...`
   - Returns caller name (if returning patient), upcoming appointment if any, and clinic name/hours in under 100 ms so Dograh greets the patient personally.
2. **Mid-Call Live Actions (MCP Server):**
   - Attach the CRM MCP Server (`PATIENT_VOICE` scope) to Dograh's booking node.
   - Configure Dograh **tool start filler audio** (*"Let me check Dr. Sharma's open slots..."*) to mask DB latency.
   - Keep MCP responses voice-friendly (plain readable times like `"Tomorrow at 4:30 PM"`, max 3 options).
   - Pass Dograh's `workflow_run_id` as `idempotencyKey` on `book_appointment`.
3. **Post-Call Webhook (REST):** `POST /api/integrations/dograh/post-call`
   - Verifies HMAC signature, logs call summary, transcript, outcome, and duration into `ai_audit_logs` / `call_logs`.
4. **Decoupled WhatsApp Confirmation:** Dograh does **not** call Broadcast Manager directly. When Dograh calls `book_appointment`, the CRM writes to PostgreSQL and enqueues an `appointment.confirmed` event in `webhook_outbox`, which sends the WhatsApp confirmation automatically.

---

## 9. Production AI Infrastructure (Safety, Cost & Observability)

### Input & Output Guardrails (`src/modules/ai/guardrails.ts`)
- **Input:** Block prompt-injection patterns attempting role escalation (*"ignore instructions"*, *"act as admin"*, *"dump all patients"*), enforce max token/character bounds, and strip unnecessary PII when calling external LLMs for generic FAQ/routing tasks.
- **Output:** Enforce strict Zod schemas for tool/extraction calls; append mandatory non-diagnosis safety boundaries on patient-facing chat/voice (*never prescribe medication or diagnose emergencies—direct urgent symptoms to emergency care/doctor*); verify tool-backed facts before returning appointment/billing details.

### Safe Semantic Cache (`src/modules/ai/semantic-cache.ts`)
- **Strict Rule:** Enable ONLY for classified `PUBLIC_CLINIC_FAQ` intents (clinic timings, address, parking, general test prep, consultation fees).
- **Namespace:** Cache key MUST include `clinicId` + `knowledgeVersion` (invalidated automatically when clinic updates FAQ docs) + embedding similarity threshold ≥ 0.93.
- **Never Cache:** Appointments, schedules, prescriptions, bills, or any query containing patient/doctor identity.

### Model Routing (`src/modules/ai/model-router.ts`)
- **Tier 1 (Fast/Cheap — e.g., Gemini Flash / lightweight models):** Intent classification, public FAQ RAG answers, simple slot lookups, voice call turn-taking.
- **Tier 2 (High-Accuracy Reasoning):** Complex Hinglish doctor dictation extraction, multi-step schedule conflict resolution, clinical visit summarization.
- **Resilience:** Automatic fallback model on HTTP 429/5xx with strict per-call timeouts.

### Observability (`src/lib/telemetry.ts`)
- Generate a `traceId` per request across Web, WhatsApp, and Voice.
- Record every LLM call and MCP tool execution asynchronously: `clinicId`, `channel`, `model`, `latencyMs`, `tokensIn/Out`, `cacheHit`, `toolErrors`, and estimated USD/INR cost.

---

## 10. Phased Implementation Roadmap

- **Phase 0 — Auth & Multi-Tenant Foundation:** Install Better Auth (`organization`, `apiKey`), RBAC roles, `requireClinicSession()`, onboarding, team invites, and scope all existing CRM routes/tables by `clinic_id`.
- **Phase 1 — Domain Service Layer & DB Concurrency:** Refactor appointments, schedules, prescriptions, and billing into `src/services/domain/*`; add partial unique slot locks, `idempotency_key`, `medicine_master` + `service_tariffs` (`pg_trgm`), and `webhook_outbox` -> Broadcast Manager.
- **Phase 2 — In-CRM Doctor Dictation & Copilot:** Build AI slide-over panel, STT transcription, Zod structured extraction, fuzzy DB grounding, and Draft Prescription/Bill HITL approval workflow.
- **Phase 3 — Clinic RAG & Shared MCP Server:** Enable `pgvector` knowledge ingestion (`PUBLIC` vs `STAFF_ONLY`), build Streamable HTTP MCP Server wrapping `services/domain/*`, and implement 2-step `dryRun` slot blocking.
- **Phase 4 — WhatsApp Broadcast Manager Integration:** Build phone-to-role identity resolver, wire Broadcast Manager's AI agent to the CRM MCP Server with hard role-based tool filtering, and verify end-to-end Doctor vs Patient RBAC.
- **Phase 5 — Dograh Voice & Production Hardening:** Add Dograh Pre-Call/Post-Call REST routes, deploy self-hosted VPS stack (Next.js + Postgres + Redis + Dograh), enable FAQ-only semantic cache, model routing fallbacks, and observability dashboards.
