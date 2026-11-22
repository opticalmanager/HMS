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

static blockDoctorSlot(input: {
  organizationId: string;
  doctorId: string;
  startAt: Date;
  endAt: Date;
  reason?: string;
  createdVia?: string;
  createdByUserId?: string;
  dryRun?: boolean;
  notifyAffectedPatients?: boolean;
}): Promise<BlockDoctorSlotResult>;

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

static getAvailableSlots(options: {
  organizationId: string;
  doctorId: string;
  date: string;
  maxSlots?: number;
}): Promise<AvailableSlotItem[]>;

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

### 5. `PrescriptionDomainService` (`services/domain/prescription-service.ts`)
```ts
static createDraftPrescription(input: {
  organizationId: string;
  doctorId: string;
  patientId: string;
  appointmentId?: string;
  rawTranscript?: string;
  extraction: VisitExtraction;
}): Promise<PrescriptionEntity>;

static listPrescriptions(
  organizationId: string,
  options?: { patientId?: string; doctorId?: string; appointmentId?: string; status?: "DRAFT" | "APPROVED" | "CANCELLED"; limit?: number }
): Promise<PrescriptionEntity[]>;

static getPrescriptionById(
  organizationId: string,
  prescriptionId: string
): Promise<PrescriptionEntity | null>;

static updateDraftPrescription(input: {
  organizationId: string;
  prescriptionId: string;
  chiefComplaint?: string | null;
  symptoms?: string[];
  diagnosis?: string | null;
  medicines?: Array<...>;
  instructions?: string | null;
}): Promise<PrescriptionEntity>;

static approvePrescription(input: {
  organizationId: string;
  prescriptionId: string;
  approvedByUserId: string;
}): Promise<PrescriptionEntity>;
```

### 6. `BillingDomainService` (`services/domain/billing-service.ts`)
```ts
static createDraftInvoiceFromItems(input: {
  organizationId: string;
  patientId: string;
  appointmentId?: string;
  items: Array<{ spokenServiceName: string; quantity?: number; customAmountIfStated?: number }>;
  billerUserId?: string;
}): Promise<InvoiceEntity>;

static listInvoices(
  organizationId: string,
  options?: { patientId?: string; status?: "DRAFT" | "ISSUED" | "PAID" | "VOID"; limit?: number }
): Promise<InvoiceEntity[]>;

static getInvoiceById(
  organizationId: string,
  invoiceId: string
): Promise<InvoiceEntity | null>;

static updateDraftInvoice(input: {
  organizationId: string;
  invoiceId: string;
  items: Array<{ spokenServiceName: string; quantity?: number; customAmountIfStated?: number }>;
}): Promise<InvoiceEntity>;

static issueInvoice(input: {
  organizationId: string;
  invoiceId: string;
}): Promise<InvoiceEntity>;

static voidInvoice(input: {
  organizationId: string;
  invoiceId: string;
}): Promise<InvoiceEntity>;
```

### 7. `NotificationDomainService` (`services/domain/notification-service.ts`)
```ts
static enqueueWebhookEvent(
  tx: any,
  input: {
    organizationId: string;
    eventType: string;
    payload: Record<string, any>;
  }
): Promise<WebhookOutboxEntity>;

static dispatchPendingOutboxEvents(options?: {
  batchSize?: number;
}): Promise<{ processedCount: number; successCount: number; failureCount: number; skippedCount: number }>;

static generateOutboxSignature(payloadString: string, secret: string): string;
```

### 8. `AI Core (LlmClient)` (`modules/ai/llm-client.ts`)
```ts
export class LlmClient {
  constructor(options?: { provider?: LLMProvider });
  generateStructured<T>(req: StructuredPromptRequest, schema: z.ZodSchema<T>): Promise<T>;
  generateStructuredFromAudio<T>(req: AudioPromptRequest, schema: z.ZodSchema<T>): Promise<T>;
  generateText(req: TextPromptRequest): Promise<string>;
  streamText(req: TextPromptRequest): AsyncGenerator<string>;
}
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

### 17. `POST /api/crm/prescriptions`
- **Purpose**: Create a human-in-the-loop DRAFT prescription with fuzzy drug grounding from doctor dictation extraction.
- **RBAC Requirement**: `{ prescription: ["draft"] }`. Allows doctor, admin, owner.
- **Payload**: `{ doctorId, patientId, appointmentId?, rawTranscript?, extraction: VisitExtraction }`
- **Response**: HTTP 201 `{ success: true, prescription: {...} }` with status `"DRAFT"`.

### 18. `GET /api/crm/prescriptions`
- **Purpose**: List prescriptions scoped to active clinic organization.
- **RBAC Requirement**: `{ prescription: ["draft"] }`
- **Query Params**: `patientId?`, `doctorId?`, `appointmentId?`, `status?`, `limit?`
- **Response**: `{ success: true, count, prescriptions: [...] }`

### 19. `POST /api/crm/prescriptions/:id/approve`
- **Purpose**: Atomically approve a DRAFT prescription, record clinician sign-off, lock against subsequent edits, and enqueue `prescription.approved` outbox event.
- **RBAC Requirement**: `{ prescription: ["approve"] }`. Doctors, Admins, and Owners only; Receptionists get 403 Forbidden.
- **Response**: `{ success: true, prescription: {...} }` or HTTP 409 if already approved.

### 20. `POST /api/crm/invoices`
- **Purpose**: Create a DRAFT invoice with deterministic pricing grounded against official clinic `service_tariffs`.
- **RBAC Requirement**: `{ billing: ["draft"] }`
- **Payload**: `{ patientId, appointmentId?, items: [{ spokenServiceName, quantity?, customAmountIfStated? }] }`
- **Response**: HTTP 201 `{ success: true, invoice: {...} }` with status `"DRAFT"`.

### 21. `GET /api/crm/invoices`
- **Purpose**: List invoices scoped to active clinic organization.
- **RBAC Requirement**: `{ billing: ["read"] }`
- **Query Params**: `patientId?`, `status?`, `limit?`
- **Response**: `{ success: true, count, invoices: [...] }`

### 22. `POST /api/crm/invoices/:id/issue`
- **Purpose**: Finalize a DRAFT invoice to `"ISSUED"`, generate sequential invoice number, and enqueue `invoice.issued` outbox event.
- **RBAC Requirement**: `{ billing: ["issue"] }`
- **Response**: `{ success: true, invoice: {...} }` or HTTP 409 if not in DRAFT status.

### 23. `POST /api/internal/outbox/dispatch`
- **Purpose**: Trigger transactional outbox processor to claim and dispatch pending outbound events (appointment confirmed/cancelled, prescription approved, invoice issued) to clinic's configured WhatsApp/webhook endpoint with HMAC-SHA256 signature.
- **Authorization**: Protected by Bearer token matching `INTERNAL_CRON_SECRET` or an authenticated `owner`/`admin` session.
- **Query Params**: `limit?` (default 20, max 100)
- **Response**: `{ success: true, processedCount, successCount, failureCount, skippedCount }`
