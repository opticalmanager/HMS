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

## 4. The 12 Monolithic Modules

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

## 5. High-Density Clinical Philosophy

Clinical environments differ fundamentally from consumer web apps. Doctors, triage nurses, and hospital receptionists operate under severe time constraints where latency, excessive modal clicks, and mouse reliance cause dangerous bottlenecks.

1. **Anti-Fluff, High-Density Information Display**: Maximum clinically relevant data per square inch with compact typography and clean borders.
2. **Industrial Enter-as-Tab Navigation**: High-speed keyboard data entry replicating POS systems allowing staff to fill forms without touching the mouse.
3. **Zero-Latency Lookups**: Instant autocomplete for ICD-10 diagnosis codes and pg_trgm fuzzy matching on clinic formulary.
4. **Resilient Offline Fallback**: Caches records in Dexie.js (IndexedDB) and validates offline sessions via HMAC-SHA256 signatures.
