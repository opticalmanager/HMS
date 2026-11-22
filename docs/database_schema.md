# Apex HMS — Database Schema Specifications

## 1. Schema Overview

The database is built on PostgreSQL using **Drizzle ORM**. Schemas are modularized into 13 domain files under `db/schema/` and unified via `db/schema/index.ts`. All tenant tables strictly enforce multi-tenant isolation via mandatory `organization_id` foreign keys and dedicated B-Tree indexes.

---

## 2. Table Catalog

### 0. Better Auth Core & Multi-Tenant Tables (`db/schema/auth.ts`)
- **`user`**: Clinical staff & users (`id` UUID PK, `name`, `email` UNIQUE, `emailVerified`, `image`).
- **`session`**: Server-side revocable sessions (`id` UUID PK, `userId` FK -> user.id, `token` UNIQUE, `expiresAt`, `ipAddress`, `userAgent`, `activeOrganizationId` UUID).
- **`account`**: User credentials & OAuth links (`id` UUID PK, `userId` FK, `accountId`, `providerId`, `password` hash).
- **`verification`**: Email verification & password reset tokens (`id` UUID PK, `identifier`, `value`, `expiresAt`).
- **`organization`**: Hospital & clinic tenant roots (`id` UUID PK, `name`, `slug` UNIQUE, `logo`, `metadata`).
- **`member`**: Clinic staff memberships with RBAC roles (`id` UUID PK, `organizationId` FK, `userId` FK, `role` [owner/admin/doctor/receptionist]). Indexed on `organization_id`.
- **`invitation`**: Staff onboarding invitations (`id` UUID PK, `organizationId` FK, `email`, `role`, `status`, `expiresAt`, `inviterId` FK). Indexed on `organization_id`.
- **`apikey`**: Machine-to-machine integration credentials (`id` UUID PK, `referenceId`, `key`, `metadata`, `permissions`).

### 1. `organizations` & `branches`
- **`organizations`**: Multi-tenant parent hospital entity.
  - `id` (UUID, PK)
  - `name` (TEXT)
  - `slug` (TEXT, UNIQUE)
  - `abdmFacilityId` (TEXT, NHA HIP ID)
  - `isActive` (BOOLEAN)
- **`branches`**: Physical hospital campuses or clinics.
  - `id` (UUID, PK)
  - `organizationId` (UUID, FK -> organizations.id, Indexed)
  - `name` (TEXT)
  - `branchCode` (TEXT)
  - `gstin` (TEXT, 15-character Indian GSTIN)
  - `stateCode` (TEXT, default: "27")
  - `printHeaderConfig` (JSONB: hospitalName, tagline, regNumber, logoBase64)

### 2. `profiles`
Hospital staff, clinicians, and administrative users.
- `id` (UUID, PK, matches Supabase Auth UID)
- `organizationId` (UUID, FK -> organizations.id, Indexed)
- `branchId` (UUID, FK -> branches.id)
- `email` (TEXT, NOT NULL)
- `fullName` (TEXT, NOT NULL)
- `role` (ENUM: `super_admin`, `hospital_admin`, `doctor`, `nurse`, `receptionist`, `pharmacist`, `accountant`, `lab_technician`)
- `department` (TEXT)
- `medicalLicenseNumber` (TEXT, MCI / MMC registration number)
- `qualification` (TEXT)
- `defaultConsultationFee` (NUMERIC(10,2))

### 3. `patients`
Universal patient master file with longitudinal clinical identifiers.
- `id` (UUID, PK)
- `organizationId` (UUID, FK -> organizations.id, Indexed)
- `branchId` (UUID, FK -> branches.id)
- `uhid` (TEXT, UNIQUE, e.g. `UHID-2026-000001`)
- `fullName` (TEXT, NOT NULL)
- `gender` (ENUM: `male`, `female`, `other`)
- `dateOfBirth` (TEXT, YYYY-MM-DD)
- `age` (INTEGER)
- `phone` (TEXT, NOT NULL)
- `bloodGroup` (ENUM: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`)
- `abhaId` (TEXT, 14-digit ABHA ID)
- `abhaAddress` (TEXT, e.g. `patient@abdm`)
- `allergies` (JSONB)
- `chronicConditions` (JSONB)

### 4. `appointments`
Outpatient appointment bookings and live queue tokens.
- `id` (UUID, PK)
- `organizationId` (UUID, FK -> organizations.id, Indexed)
- `branchId` (UUID, FK -> branches.id)
- `patientId` (UUID, FK -> patients.id)
- `doctorId` (UUID, FK -> profiles.id)
- `department` (TEXT)
- `tokenNumber` (INTEGER, sequential daily token)
- `appointmentDate` (TEXT, YYYY-MM-DD)
- `timeSlot` (TEXT, HH:mm)
- `status` (ENUM: `scheduled`, `arrived`, `in_consultation`, `completed`, `cancelled`, `no_show`)
- `priority` (ENUM: `normal`, `urgent`, `emergency`)
- `consultationFee` (NUMERIC(10,2))
- `isPaid` (BOOLEAN)

### 5. `opd_consultations`
Clinical encounter records and doctor consultations.
- `id` (UUID, PK)
- `organizationId` (UUID, FK -> organizations.id, Indexed)
- `branchId` (UUID, FK -> branches.id)
- `consultationNumber` (TEXT, UNIQUE, e.g. `OPD-2026-000001`)
- `patientId` (UUID, FK -> patients.id)
- `doctorId` (UUID, FK -> profiles.id)
- `appointmentId` (UUID, FK -> appointments.id)
- `systolicBp`, `diastolicBp`, `pulseRate`, `temperature`, `spo2`, `bmi` (NUMERIC / INTEGER)
- `chiefComplaints` (JSONB)
- `historyOfPresentIllness` (TEXT)
- `diagnoses` (JSONB, array of `{ icdCode, description, type }`)
- `prescriptions` (JSONB, array of `{ medicineName, dosage, frequency, timing, durationDays, quantity }`)
- `labInvestigations` (JSONB, array of recommended lab tests)
- `isAbdmLinked` (TEXT)

### 6. `wards`, `beds`, `ipd_admissions`, & `nurse_rounds`
Inpatient Department (IPD) ward matrix, bed occupancy, and nursing observations.
- **`wards`**: `id`, `organizationId` (FK, Indexed), `branchId` (FK), `name`, `type` (`general`, `semi_private`, `private`, `icu`, `nicu`, `emergency`), `dailyRate`.
- **`beds`**: `id`, `organizationId` (FK, Indexed), `wardId` (FK), `bedNumber`, `status` (`available`, `occupied`, `cleaning`, `maintenance`), `currentPatientId`.
- **`ipd_admissions`**: `id`, `organizationId` (FK, Indexed), `branchId` (FK), `admissionNumber` (`IPD-2026-000001`), `patientId`, `primaryDoctorId`, `wardId`, `bedId`, `admissionDate`, `status`, `totalAdvancePaid`, `dischargeSummary`.
- **`nurse_rounds`**: `id`, `organizationId` (FK, Indexed), `admissionId` (FK), `recordedByNurseId` (FK), `systolicBp`, `diastolicBp`, `pulseRate`, `temperature`, `spo2`, `bloodSugar`, `ivFluidsGiven`, `notes`.

### 7. `invoices` & `payments`
Hospital billing, cash counter, and GST computations.
- **`invoices`**: `id`, `organizationId` (FK, Indexed), `branchId` (FK), `invoiceNumber` (`INV-2026-000001`), `patientId`, `billerId`, `invoiceType` (`opd`, `ipd`, `pharmacy`, `lab`), `items` (JSONB), `subtotal`, `taxTotal`, `discountTotal`, `grandTotal`, `amountPaid`, `balanceDue`, `paymentStatus`.
- **`payments`**: `id`, `organizationId` (FK, Indexed), `receiptNumber`, `invoiceId`, `patientId`, `collectedBy`, `amount`, `paymentMode` (`cash`, `upi`, `card`, `netbanking`, `insurance`).

### 8. `inventory_items`, `inventory_batches`, & `stock_movements`
Pharmacy management, batch lot tracking, and expiry controls.
- **`inventory_items`**: `id`, `organizationId` (FK, Indexed), `branchId` (FK), `sku`, `name`, `genericName`, `category`, `reorderLevel`, `gstRate`.
- **`inventory_batches`**: `id`, `organizationId` (FK, Indexed), `itemId`, `batchNumber`, `expiryDate`, `quantityInStock`, `purchasePrice`, `sellingPrice`.
- **`stock_movements`**: `id`, `organizationId` (FK, Indexed), `itemId`, `batchId`, `movementType` (`purchase_grn`, `dispense_opd`, `dispense_ipd`, `adjustment`, `expired_scrap`), `quantity`.

### 9. `hospital_services`
Tariff master for pathology, radiology, procedures, and consultations.
- `id`, `organizationId` (FK, Indexed), `code`, `name`, `category`, `department`, `standardRate`, `gstRate`, `sampleRequired`.

### 10. `whatsapp_templates` & `whatsapp_messages`
Meta WABA v20+ message queue and delivery receipts.
- **`whatsapp_templates`**: `id`, `organizationId` (FK, Indexed), `templateName`, `category`, `status`, `bodyText`.
- **`whatsapp_messages`**: `id`, `organizationId` (FK, Indexed), `patientId`, `recipientPhone`, `wabaMessageId`, `templateName`, `status` (`queued`, `sent`, `delivered`, `read`, `failed`).

### 11. `audit_logs`
Immutable HIPAA / DISHA compliance audit trail.
- `id`, `organizationId` (FK, Indexed), `userId`, `userEmail`, `userRole`, `action`, `module`, `entityType`, `entityId`, `oldData`, `newData`, `ipAddress`, `userAgent`, `timestamp`.

---

## 3. Explicit B-Tree Tenant Indexes (16 Tables)

To protect against cross-tenant data leakage and guarantee indexed query performance across high-volume collections, explicit B-Tree indexes exist on `organization_id` for:
1. `branches` (`branches_organization_id_idx`)
2. `profiles` (`profiles_organization_id_idx`)
3. `patients` (`patients_organization_id_idx`)
4. `appointments` (`appointments_organization_id_idx`)
5. `opd_consultations` (`opd_consultations_organization_id_idx`)
6. `wards` (`wards_organization_id_idx`)
7. `beds` (`beds_organization_id_idx`)
8. `ipd_admissions` (`ipd_admissions_organization_id_idx`)
9. `nurse_rounds` (`nurse_rounds_organization_id_idx`)
10. `invoices` (`invoices_organization_id_idx`)
11. `payments` (`payments_organization_id_idx`)
12. `inventory_items` (`inventory_items_organization_id_idx`)
13. `inventory_batches` (`inventory_batches_organization_id_idx`)
14. `stock_movements` (`stock_movements_organization_id_idx`)
15. `hospital_services` (`hospital_services_organization_id_idx`)
16. `audit_logs` (`audit_logs_organization_id_idx`)
(plus `whatsapp_templates`, `whatsapp_messages`, `member`, and `invitation`).
