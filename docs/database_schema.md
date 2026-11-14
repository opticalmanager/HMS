# Apex HMS — Database Schema Specifications

## 1. Schema Overview

The database is built on PostgreSQL using **Drizzle ORM**. Schemas are modularized into 12 domain files under `db/schema/` and unified via `db/schema/index.ts`.

---

## 2. Table Catalog

### 1. `organizations` & `branches`
- **`organizations`**: Multi-tenant parent hospital entity.
  - `id` (UUID, PK)
  - `name` (TEXT)
  - `code` (TEXT, UNIQUE)
  - `abdmFacilityId` (TEXT, NHA HIP ID)
  - `isActive` (BOOLEAN)
- **`branches`**: Physical hospital campuses or clinics.
  - `id` (UUID, PK)
  - `organizationId` (UUID, FK -> organizations.id)
  - `name` (TEXT)
  - `branchCode` (TEXT)
  - `gstin` (TEXT, 15-character Indian GSTIN)
  - `stateCode` (TEXT, default: "27")
  - `printHeaderConfig` (JSONB: hospitalName, tagline, regNumber, logoBase64)

### 2. `profiles`
Hospital staff, clinicians, and administrative users.
- `id` (UUID, PK, matches Supabase Auth UID)
- `organizationId` (UUID, FK -> organizations.id)
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

### 6. `wards`, `beds`, & `ipd_admissions`
Inpatient Department (IPD) ward matrix and bed occupancy.
- **`wards`**: `id`, `name`, `type` (`general`, `semi_private`, `private`, `icu`, `nicu`, `emergency`), `dailyRate`.
- **`beds`**: `id`, `wardId` (FK), `bedNumber`, `status` (`available`, `occupied`, `cleaning`, `maintenance`), `currentPatientId`.
- **`ipd_admissions`**: `id`, `admissionNumber` (`IPD-2026-000001`), `patientId`, `primaryDoctorId`, `wardId`, `bedId`, `admissionDate`, `status`, `totalAdvancePaid`, `dischargeSummary`.

### 7. `invoices` & `payments`
Hospital billing, cash counter, and GST computations.
- **`invoices`**: `id`, `invoiceNumber` (`INV-2026-000001`), `patientId`, `billerId`, `invoiceType` (`opd`, `ipd`, `pharmacy`, `lab`), `items` (JSONB), `subtotal`, `taxTotal`, `discountTotal`, `grandTotal`, `amountPaid`, `balanceDue`, `paymentStatus`.
- **`payments`**: `id`, `receiptNumber`, `invoiceId`, `amount`, `paymentMode` (`cash`, `upi`, `card`, `netbanking`, `insurance`).

### 8. `inventory_items`, `inventory_batches`, & `stock_movements`
Pharmacy management and batch expiry controls.
- **`inventory_items`**: `id`, `sku`, `name`, `genericName`, `category`, `reorderLevel`, `gstRate`.
- **`inventory_batches`**: `id`, `itemId`, `batchNumber`, `expiryDate`, `quantityInStock`, `purchasePrice`, `sellingPrice`.
- **`stock_movements`**: `id`, `itemId`, `batchId`, `movementType` (`purchase_grn`, `dispense_opd`, `dispense_ipd`, `adjustment`, `expired_scrap`), `quantity`.

### 9. `hospital_services`
Tariff master for pathology, radiology, procedures, and consultations.
- `id`, `code`, `name`, `category`, `department`, `standardRate`, `gstRate`, `sampleRequired`.

### 10. `whatsapp_templates` & `whatsapp_messages`
Meta WABA v20+ message queue and delivery receipts.
- **`whatsapp_templates`**: `id`, `templateName`, `category`, `status`, `bodyText`.
- **`whatsapp_messages`**: `id`, `patientId`, `recipientPhone`, `wabaMessageId`, `templateName`, `status` (`queued`, `sent`, `delivered`, `read`, `failed`).

### 11. `audit_logs`
Immutable HIPAA / DISHA compliance audit trail.
- `id`, `userId`, `userEmail`, `userRole`, `action`, `module`, `entityType`, `entityId`, `oldData`, `newData`, `ipAddress`, `userAgent`, `timestamp`.
