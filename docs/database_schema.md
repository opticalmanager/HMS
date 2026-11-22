# Apex HMS — Database Schema Specifications

## 1. Schema Overview

The database is built on PostgreSQL using **Drizzle ORM**. Schemas are modularized into domain files under `db/schema/` and unified via `db/schema/index.ts`. All tenant tables strictly enforce multi-tenant isolation via mandatory `organization_id` foreign keys and dedicated B-Tree indexes. PostgreSQL extension `pg_trgm` provides fast fuzzy matching on medical catalogs, while partial unique indexes guarantee concurrency safety and write idempotency.

---

## 2. Table Catalog

### 0. Better Auth Core & Multi-Tenant Tables (`db/schema/auth.ts`)
- **`user`**: Clinical staff & users (`id` UUID PK, `name`, `email` UNIQUE, `emailVerified`, `image`).
- **`session`**: Server-side revocable sessions (`id` UUID PK, `userId` FK -> user.id, `token` UNIQUE, `expiresAt`, `ipAddress`, `userAgent`, `activeOrganizationId` UUID).
- **`account`**: User credentials & OAuth links (`id` UUID PK, `userId` FK, `accountId`, `providerId`, `password` hash).
- **`verification`**: Email verification & password reset tokens (`id` UUID PK, `identifier`, `value`, `expiresAt`).
- **`organizations`**: Hospital & clinic tenant roots (`id` UUID PK, `name`, `slug` UNIQUE, `logo`, `metadata`).
- **`member`**: Clinic staff memberships with RBAC roles (`id` UUID PK, `organizationId` FK, `userId` FK, `role` [owner/admin/doctor/receptionist]). Indexed on `organization_id`.
- **`invitation`**: Staff onboarding invitations (`id` UUID PK, `organizationId` FK, `email`, `role`, `status`, `expiresAt`, `inviterId` FK). Indexed on `organization_id`.
- **`apikey`**: Machine-to-machine integration credentials (`id` UUID PK, `referenceId`, `key`, `metadata`, `permissions`).

### 1. `clinic_profiles` (`db/schema/clinic-profiles.ts`)
1-to-1 operational profile per clinic organization.
- `id` (UUID, PK)
- `organizationId` (UUID, UNIQUE FK -> organizations.id, ON DELETE CASCADE, Indexed)
- `timezone` (TEXT, default: 'Asia/Kolkata')
- `defaultSlotMinutes` (INTEGER, default: 15)
- `workingHoursJson` (JSONB: weekly opening/closing windows by day)
- `wabaId` (TEXT, UNIQUE nullable, Meta WABA ID)
- `broadcastWebhookUrl` (TEXT, nullable)
- `broadcastApiKeyEnc` (TEXT, nullable, AES-256-GCM encrypted format `iv:authTag:ciphertext`)
- `gstin` (TEXT, nullable, 15-char Indian GSTIN)
- `invoicePrefix` (TEXT, default: 'INV')
- `createdAt`, `updatedAt` (TIMESTAMPTZ)

### 2. `doctors` (`db/schema/doctors.ts`)
Clinician directory tied to tenant clinics and Better Auth users.
- `id` (UUID, PK)
- `organizationId` (UUID, FK -> organizations.id, ON DELETE CASCADE, Indexed)
- `userId` (UUID, nullable FK -> user.id, ON DELETE SET NULL)
- `fullName` (TEXT, NOT NULL)
- `specialty` (TEXT, NOT NULL)
- `phoneE164` (TEXT, nullable)
- `consultationFee` (NUMERIC(10,2), default: '500.00')
- `isActive` (BOOLEAN, default: true)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)
- **Indexes**:
  - `doctors_organization_id_idx` on (`organization_id`)
  - `doctors_org_phone_idx` on (`organization_id`, `phone_e164`)
  - `doctors_org_user_unique_idx` (UNIQUE) on (`organization_id`, `user_id`) WHERE `user_id IS NOT NULL`

### 3. `doctor_schedules` & `doctor_slot_blocks` (`db/schema/schedules.ts`)
Weekly consultation hours and calendar leave/break blocks.
- **`doctor_schedules`**:
  - `id` (UUID, PK)
  - `organizationId` (UUID, FK -> organizations.id, Indexed)
  - `doctorId` (UUID, FK -> doctors.id, Indexed)
  - `dayOfWeek` (SMALLINT, 0=Sun to 6=Sat)
  - `startTime` (TEXT, HH:mm 24h)
  - `endTime` (TEXT, HH:mm 24h)
  - `slotDurationMins` (INTEGER, default: 15)
  - `isActive` (BOOLEAN, default: true)
  - `createdAt`, `updatedAt` (TIMESTAMPTZ)
  - **Check Constraint**: `CHECK (start_time < end_time)`
- **`doctor_slot_blocks`**:
  - `id` (UUID, PK)
  - `organizationId` (UUID, FK -> organizations.id, Indexed)
  - `doctorId` (UUID, FK -> doctors.id, Indexed)
  - `startAt` (TIMESTAMPTZ, NOT NULL)
  - `endAt` (TIMESTAMPTZ, NOT NULL)
  - `reason` (TEXT, nullable)
  - `createdVia` (TEXT: 'WEB' | 'WHATSAPP', default: 'WEB')
  - `createdByUserId` (UUID, nullable FK -> user.id)
  - `createdAt`, `updatedAt` (TIMESTAMPTZ)
  - **Index**: `doctor_slot_blocks_org_doc_range_idx` on (`organization_id`, `doctor_id`, `start_at`, `end_at`)

### 4. `medicine_master` & `service_tariffs` (`db/schema/catalog.ts`)
Standard clinic formulary and procedure charge master with `pg_trgm` GIN indexes.
- **`medicine_master`**:
  - `id` (UUID, PK)
  - `organizationId` (UUID, FK -> organizations.id, Indexed)
  - `brandName` (TEXT, NOT NULL)
  - `genericName` (TEXT, NOT NULL)
  - `strength` (TEXT, nullable)
  - `form` (ENUM: `TABLET`, `CAPSULE`, `SYRUP`, `INJECTION`, `DROPS`, `OINTMENT`, `OTHER`)
  - `defaultDosage` (TEXT, nullable)
  - `defaultFrequency` (ENUM: `OD`, `BD`, `TDS`, `SOS`)
  - `defaultDurationDays` (INTEGER, nullable)
  - `isActive` (BOOLEAN, default: true)
  - `createdAt`, `updatedAt` (TIMESTAMPTZ)
  - **GIN Indexes**:
    - `medicine_master_brand_trgm_idx` USING gin (`brand_name` gin_trgm_ops)
    - `medicine_master_generic_trgm_idx` USING gin (`generic_name` gin_trgm_ops)
- **`service_tariffs`**:
  - `id` (UUID, PK)
  - `organizationId` (UUID, FK -> organizations.id, Indexed)
  - `name` (TEXT, NOT NULL)
  - `category` (ENUM: `CONSULTATION`, `LAB`, `PROCEDURE`, `DIAGNOSTIC`, `OTHER`)
  - `price` (NUMERIC(10,2), NOT NULL)
  - `taxRate` (NUMERIC(5,2), default: '0.00')
  - `hsnSacCode` (TEXT, nullable)
  - `isActive` (BOOLEAN, default: true)
  - `createdAt`, `updatedAt` (TIMESTAMPTZ)
  - **GIN Index**: `service_tariffs_name_trgm_idx` USING gin (`name` gin_trgm_ops)

### 5. `prescriptions` (`db/schema/prescriptions.ts`)
Electronic outpatient prescriptions with mandatory Human-In-The-Loop approval.
- `id` (UUID, PK)
- `organizationId` (UUID, FK -> organizations.id, Indexed)
- `appointmentId` (UUID, nullable FK -> appointments.id)
- `doctorId` (UUID, FK -> doctors.id, Indexed)
- `patientId` (UUID, FK -> patients.id, Indexed)
- `status` (ENUM: `DRAFT`, `APPROVED`, default: 'DRAFT')
- `rawTranscript` (TEXT, nullable, voice dictation or copilot transcription)
- `chiefComplaint` (TEXT, nullable)
- `diagnosis` (TEXT, nullable)
- `itemsJson` (JSONB: medicineId, brandName, genericName, dosage, frequency, durationDays, instructions)
- `followUpDate` (TIMESTAMPTZ, nullable)
- `approvedByUserId` (UUID, nullable FK -> user.id)
- `approvedAt` (TIMESTAMPTZ, nullable)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)

### 6. `webhook_outbox` (`db/schema/outbox.ts`)
Transactional outbox decoupling database commits from synchronous third-party HTTP delivery.
- `id` (UUID, PK)
- `organizationId` (UUID, FK -> organizations.id, Indexed)
- `eventType` (TEXT, NOT NULL)
- `payloadJson` (JSONB, NOT NULL)
- `status` (ENUM: `PENDING`, `PROCESSING`, `SENT`, `FAILED`, default: 'PENDING')
- `attempts` (INTEGER, default: 0)
- `maxAttempts` (INTEGER, default: 5)
- `nextRetryAt` (TIMESTAMPTZ, nullable)
- `lastError` (TEXT, nullable)
- `sentAt` (TIMESTAMPTZ, nullable)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)
- **Partial Index**: `webhook_outbox_status_retry_idx` on (`status`, `next_retry_at`) WHERE `status IN ('PENDING', 'FAILED')`

### 7. `ai_audit_logs` (`db/schema/ai-audit.ts`)
Strict governance and token telemetry audit trail. Zero PHI / zero raw audio logged.
- `id` (UUID, PK)
- `organizationId` (UUID, FK -> organizations.id, Indexed)
- `traceId` (TEXT, Indexed)
- `channel` (ENUM: `WEB_COPILOT`, `WHATSAPP`, `VOICE_DOGRAH`)
- `actorRole` (TEXT, nullable)
- `actorId` (TEXT, nullable)
- `actionType` (TEXT, NOT NULL)
- `model` (TEXT, nullable)
- `toolCallsJson` (JSONB: tool names and sanitized args)
- `latencyMs` (INTEGER, nullable)
- `tokensIn` (INTEGER, default: 0)
- `tokensOut` (INTEGER, default: 0)
- `estimatedCostUsd` (NUMERIC(10,6), default: '0.000000')
- `status` (ENUM: `SUCCESS`, `ERROR`, `BLOCKED`)
- `errorCode` (TEXT, nullable)
- `createdAt` (TIMESTAMPTZ)

### 8. `patients` (`db/schema/patients.ts`)
Universal patient master file with longitudinal clinical identifiers.
- `id` (UUID, PK)
- `organizationId` (UUID, FK -> organizations.id, Indexed)
- `branchId` (UUID, nullable FK -> branches.id)
- `uhid` (TEXT, UNIQUE, e.g. `UHID-2026-000001`)
- `fullName` (TEXT, NOT NULL)
- `gender` (ENUM: `male`, `female`, `other`)
- `dateOfBirth` (TEXT, YYYY-MM-DD)
- `age` (INTEGER)
- `phone` (TEXT, NOT NULL)
- `phoneE164` (TEXT, nullable)
- `bloodGroup` (ENUM: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`)
- `abhaId` (TEXT, 14-digit ABHA ID)
- `allergies` (JSONB)
- `chronicConditions` (JSONB)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)
- **Partial Unique Index**: `patients_org_phone_e164_unique_idx` on (`organization_id`, `phone_e164`) WHERE `phone_e164 IS NOT NULL`

### 9. `appointments` (`db/schema/appointments.ts`)
Outpatient appointments with concurrency locking and write idempotency.
- `id` (UUID, PK)
- `organizationId` (UUID, FK -> organizations.id, Indexed)
- `branchId` (UUID, nullable FK -> branches.id)
- `patientId` (UUID, FK -> patients.id)
- `doctorId` (UUID, FK -> doctors.id)
- `department` (TEXT)
- `tokenNumber` (INTEGER)
- `appointmentDate` (TEXT, YYYY-MM-DD)
- `timeSlot` (TEXT, HH:mm)
- `slotStart` (TIMESTAMPTZ, nullable)
- `slotEnd` (TIMESTAMPTZ, nullable)
- `source` (ENUM: `WEB`, `WHATSAPP`, `VOICE_DOGRAH`, default: 'WEB')
- `idempotencyKey` (TEXT, nullable)
- `status` (ENUM: `scheduled`, `arrived`, `in_consultation`, `completed`, `cancelled`, `no_show`)
- `priority` (ENUM: `normal`, `urgent`, `emergency`)
- `consultationFee` (NUMERIC(10,2))
- `isPaid` (BOOLEAN)
- `createdAt`, `updatedAt` (TIMESTAMPTZ)
- **Partial Unique Concurrency Index**:
  `appointments_doctor_slot_concurrency_idx` on (`organization_id`, `doctor_id`, `slot_start`)
  WHERE `status IN ('scheduled', 'arrived', 'in_consultation') AND slot_start IS NOT NULL`
- **Partial Unique Idempotency Index**:
  `appointments_idempotency_key_idx` on (`organization_id`, `idempotency_key`)
  WHERE `idempotency_key IS NOT NULL`

### 10. `invoices` & `payments` (`db/schema/billing.ts`)
- **`invoices`**: `id`, `organizationId` (FK, Indexed), `branchId` (FK), `patientId` (FK), `appointmentId` (nullable FK -> appointments.id), `billerId` (FK), `invoiceNumber` (UNIQUE), `status` (ENUM: `DRAFT`, `ISSUED`, `PAID`, `VOID`, default: 'ISSUED'), `invoiceType`, `items` (JSONB), `subtotal`, `taxTotal`, `discountTotal`, `grandTotal`, `amountPaid`, `balanceDue`, `paymentStatus`.
- **`payments`**: `id`, `organizationId` (FK, Indexed), `receiptNumber`, `invoiceId` (FK), `patientId` (FK), `collectedBy`, `amount`, `paymentMode`.

---

## 3. Concurrency & Integrity Invariants

1. **Atomic Doctor Slot Concurrency**: Two active appointments can never be scheduled for the same doctor at the same slot start time under the same organization. Overlapping inserts fail atomically with PostgreSQL error `23505`. When an appointment transitions to `cancelled` or `no_show`, the slot is freed immediately for re-booking.
2. **External Write Idempotency**: All booking channels (Web, WhatsApp, Voice Dograh) can pass an `idempotency_key`. Retried webhook requests or network replays are rejected with code `23505` to prevent duplicate patient records or double-charging.
3. **Mandatory Tenant Scoping**: Every table has a NOT NULL `organization_id` foreign key referencing `organizations.id` with `ON DELETE CASCADE` and an explicit index.
