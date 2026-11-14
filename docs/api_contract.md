# Apex HMS — API Contract & Service Interfaces

## 1. Internal Clinical Service Layer

Apex HMS encapsulates business logic into monolithic services residing in `services/`:

### 1. `AuthService`
```ts
static resolveSessionFromCookies(cookiesObj: {
  supabaseToken?: string;
  offlineProfile?: string;
  offlineSig?: string;
}): CurrentUserSession | null;
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
static calculateInvoiceTotals(
  rawItems: CreateInvoiceInput["items"],
  hospitalStateCode?: string,
  patientStateCode?: string
): {
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
};

static generateInvoice(
  input: CreateInvoiceInput,
  sequenceCounter: number
): Invoice;

static generateThermalReceiptText(
  hospitalName: string,
  invoice: Invoice,
  branchPhone: string
): string;
```

### 6. `InventoryService`
```ts
static getNearExpiryItems(
  items: Array<InventoryItem & { expiryDate: string }>,
  thresholdDays?: number
): Array<InventoryItem & { daysRemaining: number }>;

static getLowStockAlerts(items: InventoryItem[]): InventoryItem[];

static dispenseMedications(
  currentStock: number,
  dispenseQty: number
): { success: boolean; remainingStock: number; error?: string };
```

### 7. `WabaService`
```ts
static sendAppointmentConfirmation(input: {
  phone: string;
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  timeSlot: string;
  tokenNumber: number;
  hospitalName: string;
}): Promise<{ success: boolean; data?: WabaSendResponse; error?: string }>;

static sendPrescriptionReady(input: {
  phone: string;
  patientName: string;
  consultationNumber: string;
  doctorName: string;
  pdfDownloadUrl: string;
}): Promise<{ success: boolean; data?: WabaSendResponse; error?: string }>;
```

### 8. `AbdmService`
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

## 2. HTTP Route Handlers

### 1. `GET /api/webhooks/whatsapp`
- **Purpose**: Meta Webhook verification handshake.
- **Parameters**: `hub.mode`, `hub.verify_token`, `hub.challenge`.
- **Response**: Plain text challenge string with HTTP 200.

### 2. `POST /api/webhooks/whatsapp`
- **Purpose**: Meta Webhook event delivery status and incoming message ingestion.
- **Payload**: Standard Meta `WabaWebhookPayload`.
- **Response**: `{ status: "success" }` with HTTP 200.
