# Apex HMS & Clinical EMR — System Overview

## 1. Executive Summary

**Apex HMS & Clinical EMR** is an enterprise-grade, high-density, multi-tenant Monolithic Hospital Management System and Electronic Medical Record designed to deliver zero-latency clinical operations, streamline multi-department communication, and comply with the national healthcare standards established by the **National Health Authority (NHA)** under the **Ayushman Bharat Digital Mission (ABDM)**.

The architecture strictly enforces multi-tenancy (`1 Organization = 1 Clinic`) via **Better Auth**, server-side session guards (`requireClinicSession`), and comprehensive compound query isolation.

---

## 2. Multi-Tenant Architecture & Auth (Phase B Active)

1. **Authentication Engine**: Better Auth with revocable server sessions, secure cookie management (`nextCookies()`), and full VPS reverse proxy compatibility (`useSecureCookies`).
2. **Clinic Isolation**:
   - Every clinic is an isolated `organization` tenant with dedicated members and invitations.
   - All database tables include mandatory `organization_id` foreign keys backed by explicit B-Tree indexes.
   - Zero client trust: `clinicId` is derived exclusively on the server from the verified session.
3. **Role-Based Access Control**:
   - 4 Clinic Roles: `owner`, `admin`, `doctor`, `receptionist`.
   - 9 Domain Statements: `clinic`, `team`, `patient`, `appointment`, `schedule`, `prescription`, `billing`, `knowledge`, `aiSettings`.
   - Granular RBAC enforcement blocking unauthorized schedule modifications and master tariff alterations.
4. **Staff Management & Onboarding**:
   - `/onboarding`: Interactive clinic organization creation and auto-activation.
   - Interactive Clinic Switcher in `AppTopbar` to jump seamlessly across multiple memberships.
   - `/settings/team`: Owner/Admin team management panel with role promotion/demotion, member removals, invitation cancellation, and dev invitation link generation.
   - `/accept-invitation/[id]`: Dedicated staff invitation acceptance screen.
5. **IDOR Hardening**: Compound entity queries on `/api/crm/appointments/[id]`, `/api/crm/patients/[id]`, and `/api/crm/schedules` preventing cross-tenant leakage.

---

## 3. Core Schema, Concurrency Locks & Master Data (Step 2 Completed)

1. **PostgreSQL Extension & Fast Fuzzy Matching**:
   - `pg_trgm` extension enabled via migration `0001_core_master_data_and_locks.sql`.
   - GIN trigram indexes on `medicine_master(brand_name, generic_name)` and `service_tariffs(name)`.
   - Parameterized helpers `fuzzyMatchMedicines` and `fuzzyMatchTariffs` in `lib/fuzzy-search.ts` providing similarity scores and `needsReview` boundary flags.
2. **Atomic Concurrency & Write Idempotency**:
   - Partial unique index on `appointments(organization_id, doctor_id, slot_start)` preventing double-booking of active slots with PostgreSQL error `23505`.
   - Partial unique index on `appointments(organization_id, idempotency_key)` preventing duplicate external booking writes.
   - Partial unique index on `patients(organization_id, phone_e164)` ensuring clean patient identification.
3. **Master Data & Settings Management**:
   - `/settings/clinic`: Clinic operating timezone, default slot cadence, weekly opening hours, GSTIN, and AES-256-GCM encrypted WhatsApp WABA credentials.
   - `/settings/schedules`: Clinician recurring weekly consultation hours and temporary slot blocking.
   - `/settings/catalog`: Standard drug formulary and service charge master with live pg_trgm fuzzy matching.
   - Idempotent seed script (`db/seed-master.ts`) seeding 25 realistic Indian outpatient medicines and 15 clinical service tariffs.

---

## 4. Shared Domain Services, Outbox & Gemini AI Core (Step 3 Completed)

1. **Comprehensive Shared Domain Services (`services/domain/*`)**:
   - `appointment-service.ts`: Timezone-aware open slot calculation (`Asia/Kolkata`), concurrency conflict fallback offering nearest open alternative slots (`suggestedSlots`), and transactional outbox write integration.
   - `schedule-service.ts`: 2-step doctor slot blocking workflow (`dryRun: true/false`) returning conflicting active appointments for clinician review before persisting block and triggering patient reschedule notices.
   - `prescription-service.ts`: Human-in-the-loop electronic prescriptions with deterministic medicine grounding via `pg_trgm` fuzzy search, automatic review flagging (`needsReview: true`), and immutable approval locks.
   - `billing-service.ts`: Official service tariff enforcement (AI cannot hallucinate prices), deterministic GST calculation, and invoice state transitions (`DRAFT` → `ISSUED`).
   - `notification-service.ts`: Transactional outbox engine with 2-phase worker claim (`FOR UPDATE SKIP LOCKED`), HMAC-SHA256 request signing, and exponential backoff retry scheduling.
2. **Gemini-First, Provider-Agnostic AI Core (`modules/ai/`)**:
   - Google GenAI SDK integration (`@google/genai`) with dual-tier task routing: `TIER_FAST` (`gemini-3.5-flash-lite`) and `TIER_REASONING` (`gemini-3.5-flash`) with automatic rate-limit and transient error fallback.
   - Multimodal native audio dictation support (up to 10MB payload size guard).
   - Inbound security guardrails preventing prompt injection and exfiltration attacks, accompanied by PII log redaction (`redactPiiForLogs`).
   - Outbound clinical safety guardrail detecting emergency red flags (chest pain, acute dyspnea) on patient-facing channels (`WHATSAPP`, `VOICE_DOGRAH`).
   - Non-blocking governance telemetry recording tokens and estimated cost in `ai_audit_logs`.

---

## 5. Dedicated Doctor AI Copilot Workspace (Step 4 Completed)

1. **Dedicated Clinical Cockpit (`/dashboard/copilot`)**:
   - Docked 3-pane layout (`isDockedWorkspace: true` in AppShell layout):
     - **Left Context Rail**: Searchable live OPD queue with status chips, clinician selector with automatic logged-in doctor profile linking, and selected patient clinical snapshot featuring an immediate red alert badge for confirmed allergies.
     - **Center Clinical Dictation Workspace**: High-density tactile voice recorder with animated Web Audio API waveform canvas, 3-minute safety limit countdown, Hinglish sample loader, and simultaneous side-by-side DRAFT Prescription and DRAFT Invoice review cards.
     - **Right Assistant Chat Rail**: Context-aware clinical chat assistant pre-loaded with OPD queue and selected patient context, streaming NDJSON tokens, tool progress indicators, and interactive action cards.
2. **Native Voice & Multimodal Extraction Pipeline**:
   - Multimodal Gemini audio transcription and structured extraction (`generateStructuredFromAudio`) or text dictation (`generateStructured`).
   - Structured JSON schema enforcing symptoms, diagnoses (ICD-10 codes), medicines, investigations, advice, and billing services.
3. **Deterministic Salt-Level Allergy Safety Cross-Check**:
   - Cross-checks prescribed medications against patient allergy history across 3 levels: spoken drug name, catalog brand name, and pharmacological active ingredient (`generic_name`).
   - Standardized synonym matching groups (e.g., `penicillin` ↔ `amoxicillin`, `sulfa` ↔ `sulfamethoxazole`, `nsaid` ↔ `aspirin`/`ibuprofen`/`diclofenac`).
   - Lowers safety severity into blocking red banners on draft cards when a lethal allergen is detected.
4. **Deterministic Catalog Grounding & HITL Safeguards**:
   - Fuzzy matches medicines against clinic `medicine_master` via `pg_trgm` (`PrescriptionDomainService.createDraftPrescription`).
   - Fuzzy matches services against clinic `service_tariffs` (`BillingDomainService.createDraftInvoice`).
   - Automatically detects and appends an official consultation tariff if the clinician did not state one explicitly.
   - Strictly enforces Human-In-The-Loop: LLMs create ONLY `DRAFT` prescriptions and `DRAFT` invoices. Final approval requires explicit doctor confirmation.
5. **Role-Aware Approval & Bounded Tool Loops**:
   - Approvals enforce RBAC: a `doctor` user approves the prescription (locks Rx and queues `prescription.approved`), keeping the invoice in `DRAFT_READY_FOR_DESK` for front desk settlement; users with `billing:issue` can issue invoices immediately.
   - Chat assistant runs bounded tool loops (max 5 iterations) strictly scoped by RBAC role. High-impact operations (e.g. `block_doctor_slot`) always run first as `dryRun: true` conflict checks and require manual card confirmation before execution.

---

## 6. The 12 Monolithic Modules

| # | Module | Operational Focus | Key Features |
|---|---|---|---|
| **01** | **Reception & Token Board** | Patient intake & queue flow | Full-screen kiosk display, audio chime, department & doctor room routing, ticket printing. |
| **02** | **Appointments & Scheduling** | Slot allocation & capacity | Multi-doctor slot booking, atomic concurrency lock, priority tagging, token issuance. |
| **03** | **OPD (Outpatient Department)** | Clinical consultation & EMR | Patient triage, vital sign anomaly detection, in-memory ICD-10 search, e-Prescription builder. |
| **04** | **IPD (Inpatient Department)** | Wards, beds, & admissions | Interactive bed visualizer, ward occupancy tracking, nurse round charts, discharge summaries. |
| **05** | **Patient Master & Records** | Demographics & longitudinal PHI | UHID sequence generation, ABHA ID linking, E.164 phone normalization, allergy tracking. |
| **06** | **Billing & Invoicing** | Hospital cash counter & accounts | OPD/IPD invoice generation, advance deductions, Indian GST (CGST/SGST/IGST), 80mm thermal POS slips. |
| **07** | **Pharmacy & Inventory** | Stock & medicine dispensing | Batch & lot number tracking, expiry date monitoring (<30d alerts), reorder triggers, GRN logs. |
| **08** | **Diagnostic & Lab Services** | Pathology & Radiology | Service tariff master, test sample tracking, investigation requests, report publishing. |
| **09** | **WhatsApp Patient Alerts** | Patient engagement & outreach | Official Meta WABA Cloud API v20+, encrypted API key storage, automated booking confirmations. |
| **10** | **Staff & Doctor Directory** | Credentialing & HR | Medical Council registration numbers (MCI/MMC), qualifications, departments, shift schedules. |
| **11** | **Reports & Analytics** | Executive & clinical intelligence | Daily patient footfall, department revenue splits, bed turnover, GST tax liabilities. |
| **12** | **Audit Logs & Settings** | Governance & system config | Immutable HIPAA/DISHA PHI access audit trail, print letterhead setup, multi-branch control. |

---

## 7. High-Density Clinical Philosophy

Clinical environments differ fundamentally from consumer web apps. Doctors, triage nurses, and hospital receptionists operate under severe time constraints where latency, excessive modal clicks, and mouse reliance cause dangerous bottlenecks.

1. **Anti-Fluff, High-Density Information Display**: Maximum clinically relevant data per square inch with compact typography and clean borders.
2. **Industrial Enter-as-Tab Navigation**: High-speed keyboard data entry replicating POS systems allowing staff to fill forms without touching the mouse.
3. **Zero-Latency Lookups**: Instant autocomplete for ICD-10 diagnosis codes and pg_trgm fuzzy matching on clinic formulary.
4. **Resilient Offline Fallback**: Caches records in Dexie.js (IndexedDB) and validates offline sessions via HMAC-SHA256 signatures.

---

## 8. Healthray Printout Engine & Multi-Channel Document Studio

1. **Dedicated Studio (`/settings/printouts` or `/settings/print`)**:
   - Covers 9 standardized clinical print templates: `opd_treatment`, `opd_case_paper`, `opd_consent_form`, `ipd_document`, `ipd_treatment`, `ipd_initial_assessment`, `lab_order`, `opd_billing`, and `thermal_print`.
   - Complete page setup controls: Margins (0-2in), single/double column split, typography (8-15 pt font size, 0-10 pt line spacing, multi-font support), header/footer branding, logo, doctor signature, and official stamp.
   - Field reordering dialog with visibility toggles (`PrintOrderModal`) matching Healthray's print order configurator.
   - Live interactive paper canvas preview (50% to 150% zoom) with instant 1-click test printing.
2. **End-to-End Clinical Module Integration**:
   - **Doctor AI Copilot (`/dashboard/copilot`)**: 1-click dual printing for OPD Treatment (Rx) and OPD Case Paper.
   - **OPD Clinical Console (`/opd`)**: 1-click generation of Prescriptions, Case Papers, Consent Forms, and Lab Requisitions.
   - **IPD Wards (`/ipd`)**: 1-click generation of Inpatient Discharge Summaries, Initial Nursing Assessments, and Medication Charts.
   - **Billing & POS (`/billing`)**: 1-click toggle between 80mm Thermal Receipts and A4 Tax Invoices.
   - **Print Isolation**: High-density `@media print` rules, unconstrained dialog viewports, and page-break utilities.
