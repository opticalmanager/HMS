# Apex HMS — Clinical Modules Workflow Guide

## 0. Authentication, Clinic Registration & Multi-Tenant Onboarding

### User Registration & Instant Organization Provisioning
1. **Clinical Signup (`/signup`)**:
   - Clinical staff or hospital owner registers with **Full Legal Name**, **Official Email**, an optional **Clinic / Hospital Name**, **Password** (min 8 chars), and **Confirm Password**.
   - Features password visibility toggles (`Eye` / `EyeOff`) and real-time password matching validation.
   - When invited to an existing hospital via an invitation link (`?next=/accept-invitation/[id]`), the signup flow bypasses duplicate clinic creation and routes the newly registered staff member directly to their invitation acceptance page.
   - For standalone owners, the system automatically provisions the clinic organization (e.g., `"[Name]'s Clinic"` or custom name) with a unique slug, assigns the registering user the `owner` role, sets the organization active, and transitions directly to `/dashboard`.
   - If organization provisioning is deferred, the user is safely routed to `/onboarding`.
2. **Clinical Staff Login (`/login`) & Invitation Flow**:
   - Secure authentication via Better Auth email and password with `next` query parameter support.
   - Evaluates active organization memberships. If organizations exist, the primary clinic is activated and the user is redirected to `next` (or `/dashboard`).
   - If an invited staff member signs in with 0 active organizations, the system preserves their invitation target URL (`/accept-invitation/[id]`) rather than trapping them in `/onboarding`.
3. **Staff Invitation & Acceptance (`/accept-invitation/[id]`)**:
   - Dedicated invitation acceptance screen displaying hospital name, invited email, designated RBAC role badge, and role capability descriptions.
   - One-click acceptance (`acceptInvitation`) activates the clinic membership (`setActive`) and routes directly to `/dashboard`.
   - One-click decline (`rejectInvitation`) safely voids the invitation and returns to `/dashboard`.
4. **Team & RBAC Management (`/settings/team`)**:
   - Restricted to `owner` and `admin` roles.
   - Real-time role promotions/demotions with sole-owner protection (cannot demote or remove the sole owner).
   - Owner hierarchy enforcement: administrative staff cannot demote or remove hospital owners; only owners possess owner-level management privileges.
   - Copyable dev invitation acceptance links and invitation cancellation.
5. **Operational Settings Hub & Unified Navigation (`/settings`)**:
   - Comprehensive Settings Hub providing multi-channel operational management across 5 dedicated panels:
     - **Clinic Profile (`/settings/clinic`)**: Timezone, slot duration, WABA ID, broadcast webhook, and AES-256-GCM encrypted API key.
     - **Doctor Schedules & Availability (`/settings/schedules`)**: Weekly doctor shift recurring hours, slot durations, and temporary doctor slot blocks.
     - **Master Catalog & Tariffs (`/settings/catalog`)**: Formularies for prescription drugs (`medicine_master`) with `pg_trgm` fuzzy matching, and clinic service tariffs (`service_tariffs`) with GST calculations.
     - **Clinic Staff & RBAC (`/settings/team`)**: Staff membership, invitation status, and role management.
     - **Hospital Branding & Letterhead (`/settings`)**: A4 letterhead designer, document sequence codes, branch GSTIN, and ABDM gateway.
   - All 5 panels are unified via `components/shell/SettingsNav.tsx` (1-click tab switching), linked via the sidebar settings sub-navigation tree, indexed in the `Ctrl+K` Global Command Palette, and accessible via the Topbar user profile dropdown.
6. **Multi-Origin & Reverse Proxy Resilience**:
   - `lib/auth.ts` dynamically validates incoming request origins against trusted local patterns (`localhost:*`, `127.0.0.1:*`, private LAN subnets) and production domains, eliminating `Invalid origin` rejections across reverse proxies, Docker standalone environments, and local dev ports.

---

## 1. End-to-End Patient Journey

The hospital monolith coordinates patient care through a seamless multi-department pipeline:

```
[Patient Arrival] ──► [Reception / Registration] ──► [Token Generated]
                              │
                              ▼
                      [Nursing Triage] (BP, Pulse, SpO2, Temp, BMI)
                              │
                              ▼
                   [OPD Consultation Room]
           (Doctor Diagnosis: ICD-10 + e-Prescription)
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
            ▼                                   ▼
   [Outpatient Pathway]                [Inpatient Pathway (IPD)]
            │                                   │
            ▼                                   ▼
   [Pharmacy & Billing]                 [Bed & Ward Allocation]
  (Stock Dispense + POS Slip)           (Nurse Rounds + Care Plan)
            │                                   │
            ▼                                   ▼
 [WhatsApp Rx PDF Dispatched]          [Discharge Summary & Final Bill]
            │                                   │
            └─────────────────┬─────────────────┘
                              │
                              ▼
           [ABDM NHA Care Context Linked (FHIR R4)]
```

---

## 2. Detailed Clinical & Financial Procedures

### Step 1: Reception & Token Issuance
1. Reception staff enters patient mobile number or scans ABHA QR code.
2. If patient exists, demographics auto-populate via autocomplete; otherwise, a unique `UHID-YYYY-XXXXXX` is generated.
3. Patient selects visiting department and doctor from the multi-doctor slot engine.
4. Fast-track Walk-in Token generator issues instant token slip (`TKN-XXX`) and announces the token on the full-screen reception TV board (`/token-board`) with Web Audio API chime.
5. An automated WhatsApp appointment confirmation is dispatched.

### Step 2: Nursing Triage & Vitals
1. Triage nurse records vitals: Blood Pressure, Pulse, SpO2, Temperature, Weight, Height.
2. System calculates BMI automatically and evaluates vitals against adult clinical benchmarks.
3. Hypertensive Staging highlights normotensive, pre-hypertension, stage 1, or stage 2 hypertension.
4. Any critical vital elevates the patient's queue priority to `urgent` or `emergency`.

### Step 3: Doctor Consultation (OPD)
1. Doctor opens `/opd` master-detail split workspace; the active queue patient is loaded.
2. Doctor searches diagnoses via zero-latency in-memory ICD-10 dictionary.
3. Prescriptions are added using Enter-as-Tab keyboard shortcuts and shorthand dose frequency parser (`1-0-1 5d`, `TDS 3d`).
4. 1-Click Regimen Cloner loads established treatment protocols for HTN, Diabetes, URTI, or Gastritis.
5. Doctor clicks "Complete Encounter", generating an official A4 letterhead prescription, an invoice in Billing, and an automated WhatsApp PDF notification.

### Step 4: Pharmacy Dispensing & GRN Inward
1. Pharmacist opens `/inventory`.
2. Prescribed medications are checked for stock and expiry. Batches expiring within 30/60/90 days are flagged.
3. Inward supplier consignments are processed via Goods Received Notes (GRN) capturing supplier invoice, batch, expiry, purchase rate, and selling MRP, automatically updating stock levels.
4. Discrepancies and damages are resolved via the Stock Adjustment workflow.

### Step 5: IPD Admission, Bed Matrix & Nursing MAR
1. If patient requires admission, staff opens the live Bed Matrix (`/ipd`).
2. Admitting nurse selects an available bed across specialized wards: ICU (Intensive Care), CCU (Coronary Care), General Ward, or Deluxe Suite, and allocates it with admission diagnosis, primary consultant, and advance deposit.
3. Nursing Medication Administration Record (MAR) shift checklist tracks Morning (08:00), Afternoon (14:00), Evening (20:00), and Night (02:00) medication rounds with 1-click nurse sign-off.
4. Length of stay and room tariffs are calculated continuously.

### Step 6: Discharge Summary & Billing Settlement
1. Attending clinician generates the official Discharge Summary (provisional diagnosis, hospital course, discharge medications, follow-up advice).
2. Accountant reviews invoice, selects any registered patient via autocomplete or enters walk-in details, and can quick-populate charges from the Hospital Service Catalog.
3. Indian GST tax engine automatically calculates CGST + SGST (intra-state) or IGST (inter-state).
4. Invoice is settled via Cash, UPI (with dynamic QR code), Card, or Insurance.
5. 80mm ESC/POS thermal receipt or A4 itemized invoice is printed with strict chrome isolation.
6. Cashier shift drawer reconciliation balances opening float, collections, safe drops, and closing cash counts.

### Step 7: 16 Healthray Clinical & Financial Management Categories & Sub-Reports
Hospital administrators, accountants, and clinical heads access 16 operational report categories with dedicated sub-tabs in `/reports`:
1. **Bill / Receipt Report**: Bills, Bill Item Wise, Bill Receipt, Group Wise, Item Wise Tax, Doctor Share, Discount, Procedure, Operator Wise, Emergency Bills
2. **Collection Reports**: Total Collection (with formula summary: Current Period + Past Bill Collections = Net Collection), Operator Wise, Department Wise, Refund Report, Daily Cashier Shift Summary, Hospital Status
3. **Revenue Sharing**: Treating Doctor Share (40/60 split), Department Payout Split
4. **Referral Reports**: Doctor & Agent Referrals, Diagnostic Referrals
5. **Patient Report**: Ledger Report, Patient Directory with ABHA, Patient Due / Deposit
6. **Rx Report**: Drug Dispense & Prescription Frequency, Near-Expiry Stock Valuation
7. **Consultation Report**: OPD Daily Footfall, Speciality-wise Census, Wait Times
8. **Hospital Expenses**: Operational & Petty Cash Register, Vendor Purchase Register
9. **Custom Report**: Custom MIS Queries, Department Summary
10. **OPD Tracking**: Patient Turnaround & Queue Timers, Hourly Footfall Tracker
11. **Patient Deposit & Refund**: Advance Deposits, Reversals & Refunds
12. **Statutory GST Reports**: GSTR-1 Outward Supplies, GSTR-3B Tax Summary
13. **TAT Reports**: Turnaround Time (Registration to Consultation), Diagnostic Lab TAT
14. **Download History**: Export Audit Log, User Access Log
15. **Revenue Leakage Reports**: Concessions, Waivers & Discounts Audit, Cancelled Invoices Register
16. **OTP & ABDM Authorization**: ABHA Milestone Linkage (M1 KYC & M2 Care Context), Consent & Auth Logs

#### UI/UX Architecture & Ergonomics:
- **Left Collapsible Category Drawer (`w-56` / 224px)**: Real-time search filtering, active category badge counts, and `<` / `>` toggle button for maximizing tabular workspace.
- **Horizontal Sub-Tabs Ribbon**: Instant tab-switching across sub-reports with zero latency.
- **Multi-Field Filter Ribbon**: Duration selector (Today, Yesterday, Last 7/30 Days, This Month, Custom), Start/End date and time inputs, Doctor & Department selectors, Payment Mode filter, UHID/Patient search, OPD/IPD encounter radio buttons, and Due/Cancelled/Settled checkboxes.
- **Top KPI Statistical Summary Cards**: Formatted in Indian Lakh/Crore (`₹`), mint green badge card (`#e8f5e9`) for Total Paid, soft coral card (`#ffebee`) for Total Due, and math formula cards for Collections.
- **Enterprise High-Density Data Table**: Sticky headers and sticky left columns (`No.`, `UHID`, `Patient Name`, `Bill #`), status badges, and bottom Grand Total sums row.
- **Reports Export Engine**: One-click Excel/CSV export (`exportToCsv` with UTF-8 BOM) and official A4 Print Preview with hospital headers.
