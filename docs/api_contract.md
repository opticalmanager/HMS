# Apex HMS — API Contract & Service Interfaces

## 1. Internal Clinical Service Layer

Apex HMS encapsulates business logic into monolithic domain services residing in `services/domain/*` and `services/*`:

### 1. `ClinicService` (`services/domain/clinic-service.ts`)
```ts
static getClinicProfile(organizationId: string): Promise<SanitizedClinicProfile>;

static updateClinicProfile(
  organizationId: string,
  input: z.infer<typeof updateClinicProfileSchema>
): Promise<SanitizedClinicProfile>;
```

### 2. `DoctorService` (`services/domain/doctor-service.ts`)
```ts
static listDoctors(
  organizationId: string,
  options?: { isActiveOnly?: boolean }
): Promise<DoctorEntity[]>;

static getDoctorById(
  organizationId: string,
  doctorId: string
): Promise<DoctorEntity | null>;

static getDoctorByUserId(
  organizationId: string,
  userId: string
): Promise<DoctorEntity | null>;

static createDoctor(
  organizationId: string,
  input: z.infer<typeof createDoctorSchema>
): Promise<DoctorEntity>;

static updateDoctor(
  organizationId: string,
  doctorId: string,
  input: z.infer<typeof updateDoctorSchema>
): Promise<DoctorEntity | null>;
```

### 3. `ScheduleService` (`services/domain/schedule-service.ts`)
```ts
static listSchedules(
  organizationId: string,
  doctorId?: string
): Promise<DoctorScheduleEntity[]>;

static createSchedule(
  organizationId: string,
  input: z.infer<typeof createDoctorScheduleSchema>
): Promise<DoctorScheduleEntity>;

static updateSchedule(
  organizationId: string,
  scheduleId: string,
  input: z.infer<typeof updateDoctorScheduleSchema>
): Promise<DoctorScheduleEntity | null>;

static listSlotBlocks(
  organizationId: string,
  options?: { doctorId?: string; fromDate?: Date; toDate?: Date }
): Promise<DoctorSlotBlockEntity[]>;

static createSlotBlock(
  organizationId: string,
  input: z.infer<typeof createDoctorSlotBlockSchema>,
  createdByUserId?: string
): Promise<DoctorSlotBlockEntity>;

static deleteSlotBlock(
  organizationId: string,
  blockId: string
): Promise<boolean>;

static deleteSchedule(
  organizationId: string,
  scheduleId: string
): Promise<boolean>;
```

### 4. `AppointmentDomainService` (`services/domain/appointment-service.ts`)
```ts
static listAppointments(
  clinicId: string,
  options?: { limit?: number; doctorId?: string; patientId?: string; status?: string; appointmentDate?: string }
): Promise<AppointmentEntity[]>;

static getAppointmentById(
  clinicId: string,
  appointmentId: string
): Promise<AppointmentEntity | null>;

static createAppointment(
  clinicId: string,
  input: CreateAppointmentInput
): Promise<{ appointment: AppointmentEntity; isDuplicate?: boolean }>;

static updateAppointment(
  clinicId: string,
  appointmentId: string,
  input: UpdateAppointmentInput
): Promise<AppointmentEntity | null>;

static cancelAppointment(
  clinicId: string,
  appointmentId: string
): Promise<AppointmentEntity | null>;
```

### 5. `CatalogService` (`services/domain/catalog-service.ts`)
```ts
static listMedicines(
  organizationId: string,
  query?: string,
  limit?: number
): Promise<Array<MedicineMasterEntity | FuzzyMedicineResult>>;

static createMedicine(
  organizationId: string,
  input: z.infer<typeof createMedicineSchema>
): Promise<MedicineMasterEntity>;

static updateMedicine(
  organizationId: string,
  medicineId: string,
  input: z.infer<typeof updateMedicineSchema>
): Promise<MedicineMasterEntity | null>;

static listTariffs(
  organizationId: string,
  query?: string,
  limit?: number
): Promise<Array<ServiceTariffEntity | FuzzyTariffResult>>;

static createTariff(
  organizationId: string,
  input: z.infer<typeof createTariffSchema>
): Promise<ServiceTariffEntity>;

static updateTariff(
  organizationId: string,
  tariffId: string,
  input: z.infer<typeof updateTariffSchema>
): Promise<ServiceTariffEntity | null>;
```

### 5. `FuzzySearch` (`lib/fuzzy-search.ts`)
```ts
export async function fuzzyMatchMedicines(
  organizationId: string,
  query: string,
  limit?: number
): Promise<FuzzyMedicineResult[]>;

export async function fuzzyMatchTariffs(
  organizationId: string,
  query: string,
  limit?: number
): Promise<FuzzyTariffResult[]>;
```

### 6. `Phone` & `Crypto` Utilities
```ts
// lib/phone.ts
export function normalizePhoneE164(
  input: string | null | undefined,
  defaultCountryCode?: string
): string | null;

// lib/crypto.ts (server-only)
export function encryptBroadcastApiKey(plaintext: string): string;
export function decryptBroadcastApiKey(cipherString: string): string;
```

---

## 2. HTTP Route Handlers & CRM REST API

### 1. `GET /api/crm/settings/clinic`
- **Purpose**: Retrieve clinic timezone, slot duration, working hours, and WABA status.
- **RBAC Requirement**: `{ clinic: ["read"] }`
- **Response**: `{ success: true, clinicId, role, profile: {...} }`

### 2. `PUT /api/crm/settings/clinic`
- **Purpose**: Update clinic operational configuration. Encrypts WABA API key with AES-256-GCM.
- **RBAC Requirement**: `{ clinic: ["update"] }`
- **Payload**: `{ timezone, defaultSlotMinutes, invoicePrefix, gstin?, wabaId?, broadcastWebhookUrl?, broadcastApiKey?, workingHoursJson? }`
- **Response**: `{ success: true, profile: {...} }`

### 3. `GET /api/crm/schedules`
- **Purpose**: List recurring weekly consultation schedules by clinic or doctor.
- **RBAC Requirement**: `{ schedule: ["read"] }`
- **Query Params**: `doctorId?`
- **Response**: `{ success: true, count, schedules: [...] }`

### 4. `POST /api/crm/schedules`
- **Purpose**: Create a recurring weekly schedule block.
- **RBAC Requirement**: `{ schedule: ["manage_own"] }`. Doctors may only create schedules for their own clinician record; Receptionists get 403 Forbidden.
- **Payload**: `{ doctorId, dayOfWeek, startTime, endTime, slotDurationMins, isActive? }`
- **Response**: `{ success: true, schedule: {...} }` with HTTP 201.

### 5. `PUT /api/crm/schedules`
- **Purpose**: Update a recurring weekly schedule block.
- **RBAC Requirement**: `{ schedule: ["manage_own"] }`. Doctors get 403 Forbidden when attempting to modify another doctor's schedule.
- **Payload**: `{ id, dayOfWeek?, startTime?, endTime?, slotDurationMins?, isActive? }`
- **Response**: `{ success: true, schedule: {...} }`

### 6. `DELETE /api/crm/schedules`
- **Purpose**: Delete a recurring weekly schedule block.
- **RBAC Requirement**: `{ schedule: ["manage_own"] }`. Doctors get 403 Forbidden when attempting to delete another doctor's schedule.
- **Query Params**: `id=<scheduleUuid>`
- **Response**: `{ success: true, message: "Schedule removed successfully" }`

### 6. `GET /api/crm/schedules/blocks`
- **Purpose**: List doctor calendar leaves and temporary slot blocks.
- **RBAC Requirement**: `{ schedule: ["read"] }`
- **Query Params**: `doctorId?`, `fromDate?`, `toDate?`
- **Response**: `{ success: true, count, blocks: [...] }`

### 7. `POST /api/crm/schedules/blocks`
- **Purpose**: Register a temporary doctor slot block (leave, meeting, break).
- **RBAC Requirement**: `{ schedule: ["manage_own"] }`. Doctors may only block their own slots; Receptionists get 403.
- **Payload**: `{ doctorId, startAt, endAt, reason?, createdVia? }`
- **Response**: `{ success: true, block: {...} }` with HTTP 201.

### 8. `DELETE /api/crm/schedules/blocks`
- **Purpose**: Delete a doctor slot block.
- **RBAC Requirement**: `{ schedule: ["manage_own"] }`
- **Query Params**: `id=<blockUuid>`
- **Response**: `{ success: true, message: "Slot block removed successfully" }`

### 9. `GET /api/crm/catalog/medicines`
- **Purpose**: Search drug formulary. If `q` is provided, executes pg_trgm fuzzy matching returning similarity `score` and `needsReview`.
- **RBAC Requirement**: `{ knowledge: ["read"] }`
- **Query Params**: `q?`, `limit?`
- **Response**: `{ success: true, count, medicines: [...] }`

### 10. `POST /api/crm/catalog/medicines`
- **Purpose**: Add an approved drug to clinic formulary master.
- **RBAC Requirement**: `{ knowledge: ["manage"] }`. Only Owner & Admin permitted; Receptionist & Doctor get 403.
- **Payload**: `{ brandName, genericName, strength?, form, defaultDosage?, defaultFrequency?, defaultDurationDays?, isActive? }`
- **Response**: `{ success: true, medicine: {...} }` with HTTP 201.

### 11. `PATCH /api/crm/catalog/medicines`
- **Purpose**: Update an approved drug entry.
- **RBAC Requirement**: `{ knowledge: ["manage"] }`
- **Payload**: `{ id, brandName?, genericName?, strength?, form?, defaultDosage?, defaultFrequency?, defaultDurationDays?, isActive? }`
- **Response**: `{ success: true, medicine: {...} }`

### 12. `GET /api/crm/catalog/tariffs`
- **Purpose**: List or fuzzy match clinical service tariffs and procedure charge master.
- **RBAC Requirement**: `{ billing: ["read"] }`
- **Query Params**: `q?`, `limit?`
- **Response**: `{ success: true, count, tariffs: [...] }`

### 13. `POST /api/crm/catalog/tariffs`
- **Purpose**: Create a new clinical service tariff or procedure.
- **RBAC Requirement**: `{ billing: ["void"] }`. Owner & Admin permitted; Receptionist & Doctor get 403 Forbidden.
- **Payload**: `{ name, category, price, taxRate?, hsnSacCode?, isActive? }`
- **Response**: `{ success: true, tariff: {...} }` with HTTP 201.

### 14. `PATCH /api/crm/catalog/tariffs`
- **Purpose**: Update tariff pricing or tax rate.
- **RBAC Requirement**: `{ billing: ["void"] }`
- **Payload**: `{ id, name?, category?, price?, taxRate?, hsnSacCode?, isActive? }`
- **Response**: `{ success: true, tariff: {...} }`

### 15. `POST /api/crm/appointments`
- **Purpose**: Atomically schedule an appointment with concurrency locking, slot block conflict detection, and write idempotency.
- **RBAC Requirement**: `{ appointment: ["create"] }`
- **Payload**: `{ patientId, doctorId, branchId?, department, appointmentDate, timeSlot, slotStart?, slotEnd?, source?, idempotencyKey?, tokenNumber?, priority?, chiefComplaints?, consultationFee? }`
- **Response**: HTTP 201 `{ success: true, appointment: {...}, duplicate: false }` on new booking; HTTP 200 `{ success: true, appointment: {...}, duplicate: true }` on duplicate idempotency key retry; HTTP 409 `{ success: false, error: "...", code: "SLOT_CONFLICT" | "SLOT_BLOCKED" }` on concurrent collision or slot block.

### 16. `PATCH /api/crm/appointments/:id`
- **Purpose**: Update appointment status or reschedule with concurrency checking.
- **RBAC Requirement**: `{ appointment: ["update"] }`
- **Payload**: `{ appointmentDate?, timeSlot?, slotStart?, slotEnd?, status?, priority?, chiefComplaints?, consultationFee?, isPaid? }`
- **Response**: `{ success: true, appointment: {...} }` or HTTP 409 on slot collision.
