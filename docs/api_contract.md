# Apex HMS — API Contract & Service Interfaces

## 1. Internal Clinical Service Layer

Apex HMS encapsulates business logic into monolithic domain services residing in `services/`:

### 1. `AuthService` & `lib/auth-guard.ts`
```ts
// Server-side tenant session guard (Never trusts client-supplied organizationId)
export async function requireClinicSession(
  permissionOrOptions?: PermissionCheck | RequireClinicSessionOptions,
  maybeOptions?: RequireClinicSessionOptions
): Promise<ClinicSessionResult>;

// Server component page session guard
export async function requirePageSession(
  options?: RequireClinicSessionOptions | PermissionCheck
): Promise<ClinicSessionResult>;

// Standardized auth error response handler
export function handleAuthError(err: unknown): NextResponse;
```

### 2. `AppointmentService`
```ts
static generateNextToken(currentDailyCount: number): number;

static createAppointmentRecord(
  input: BookAppointmentInput,
  currentTokenCount: number
): Appointment;

static formatTokenLabel(tokenNumber: number): string;
```

### 3. `ClinicalService`
```ts
static processVitals(vitals: VitalRecord): VitalRecord & {
  bpStatus: string;
  pulseStatus: string;
  spo2Status: string;
  tempStatus: string;
  bmiInfo: { bmi: number; category: string };
};

static buildConsultation(
  input: CreateConsultationInput,
  sequenceCounter: number
): OpdConsultation;
```

### 4. `IpdService`
```ts
static admitPatient(
  input: IpdAdmissionInput,
  sequenceCounter: number
): IpdAdmission;

static calculateOccupancy(bedsList: Bed[]): {
  total: number;
  occupied: number;
  available: number;
  occupancyRatePercent: number;
};
```

### 5. `BillingService`
```ts
static calculateLineItem(item: RawBillingLineItem): InvoiceItem;

static generateInvoice(
  patientId: string,
  items: InvoiceItem[],
  invoiceType: "opd" | "ipd" | "pharmacy" | "lab",
  sequenceCounter: number,
  discountTotal?: number
): Invoice;

static formatThermalReceipt(invoice: Invoice, branchConfig: BranchReceiptConfig): string;
```

### 6. `AbdmService`
```ts
static requestAbhaOtp(
  identifier: string,
  authMode?: "AADHAAR_OTP" | "MOBILE_OTP"
): Promise<AbhaGenerateOtpResponse>;

static verifyAbhaOtp(
  txnId: string,
  otp: string
): Promise<AbhaProfile>;

static linkClinicalEncounter(
  uhid: string,
  abhaAddress: string,
  contexts: CareContextLinkItem[]
): Promise<CareContextLinkResponse>;
```

---

## 2. HTTP Route Handlers & CRM REST API

### 1. `GET /api/auth/[...all]` & `POST /api/auth/[...all]`
- **Purpose**: Better Auth server engine handling multi-tenant session lifecycle, organization onboarding, staff invitations, and API keys.

### 2. `GET /api/crm/appointments`
- **Purpose**: Retrieve appointments scoped strictly to active clinic organization.
- **RBAC Requirement**: `{ appointment: ["read"] }`
- **Response**: `{ success: true, clinicId, role, count, appointments: [...] }`

### 3. `POST /api/crm/appointments`
- **Purpose**: Book appointment scoped strictly to active clinic organization.
- **RBAC Requirement**: `{ appointment: ["create"] }`
- **Payload**: `{ patientId, doctorId, branchId, department, appointmentDate, timeSlot, priority?, chiefComplaints?, consultationFee? }`
- **Response**: `{ success: true, appointment: {...} }` with HTTP 201.

### 4. `GET /api/crm/appointments/[id]`
- **Purpose**: IDOR-hardened appointment fetch with compound filter `eq(organizationId, clinicId) AND eq(id, id)`.
- **RBAC Requirement**: `{ appointment: ["read"] }`
- **Response**: `{ success: true, clinicId, role, appointment: {...} }` or HTTP 404 if not in current tenant.

### 5. `PATCH /api/crm/appointments/[id]`
- **Purpose**: IDOR-hardened appointment status or slot update with compound filter `eq(organizationId, clinicId) AND eq(id, id)`.
- **RBAC Requirement**: `{ appointment: ["update"] }`
- **Payload**: `{ status?, timeSlot?, appointmentDate?, priority?, isPaid? }`
- **Response**: `{ success: true, appointment: {...} }` or HTTP 404.

### 6. `DELETE /api/crm/appointments/[id]`
- **Purpose**: IDOR-hardened appointment cancellation with compound filter `eq(organizationId, clinicId) AND eq(id, id)`.
- **RBAC Requirement**: `{ appointment: ["cancel"] }`
- **Response**: `{ success: true, message: "Appointment successfully cancelled", appointment: {...} }` or HTTP 404.

### 7. `GET /api/crm/patients`
- **Purpose**: Retrieve patient directory scoped strictly to active clinic organization.
- **RBAC Requirement**: `{ patient: ["read"] }`
- **Response**: `{ success: true, clinicId, role, count, patients: [...] }`

### 8. `POST /api/crm/patients`
- **Purpose**: Register new patient master record scoped strictly to active clinic organization.
- **RBAC Requirement**: `{ patient: ["create"] }`
- **Payload**: `{ fullName, gender, phone, dateOfBirth?, age?, email?, address?, bloodGroup? }`
- **Response**: `{ success: true, patient: {...} }` with HTTP 201.

### 9. `GET /api/crm/patients/[id]`
- **Purpose**: IDOR-hardened patient record fetch with compound filter `eq(organizationId, clinicId) AND eq(id, id)`.
- **RBAC Requirement**: `{ patient: ["read"] }`
- **Response**: `{ success: true, clinicId, role, patient: {...} }` or HTTP 404 if not in current tenant.

### 10. `PATCH /api/crm/patients/[id]`
- **Purpose**: IDOR-hardened patient record update with compound filter `eq(organizationId, clinicId) AND eq(id, id)`.
- **RBAC Requirement**: `{ patient: ["update"] }`
- **Payload**: `{ fullName?, gender?, phone?, allergies?, chronicConditions?, address? }`
- **Response**: `{ success: true, patient: {...} }` or HTTP 404.

### 11. `DELETE /api/crm/patients/[id]`
- **Purpose**: IDOR-hardened patient record deletion with compound filter `eq(organizationId, clinicId) AND eq(id, id)`.
- **RBAC Requirement**: `{ patient: ["delete"] }`
- **Response**: `{ success: true, message: "Patient record successfully deleted", patient: {...} }` or HTTP 404.

### 12. `GET /api/webhooks/whatsapp` & `POST /api/webhooks/whatsapp`
- **Purpose**: Meta Webhook verification handshake and incoming message / delivery status ingestion.
