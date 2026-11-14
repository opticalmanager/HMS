# Apex HMS — Clinical Modules Workflow Guide

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
2. Admitting nurse selects an available bed (ICU, Private Deluxe, General Ward) and allocates it with admission diagnosis, primary consultant, and advance deposit.
3. Nursing Medication Administration Record (MAR) shift checklist tracks Morning (08:00), Afternoon (14:00), Evening (20:00), and Night (02:00) medication rounds with 1-click nurse sign-off.
4. Length of stay and room tariffs are calculated continuously.

### Step 6: Discharge Summary & Billing Settlement
1. Attending clinician generates the official Discharge Summary (provisional diagnosis, hospital course, discharge medications, follow-up advice).
2. Accountant reviews invoice, advance deposits, and discounts.
3. Indian GST tax engine automatically calculates CGST + SGST (intra-state) or IGST (inter-state).
4. Invoice is settled via Cash, UPI (with dynamic QR code), Card, or Insurance.
5. 80mm ESC/POS thermal receipt or A4 itemized invoice is printed.
6. Cashier shift drawer reconciliation balances opening float, collections, safe drops, and closing cash counts.

### Step 7: 16 Clinical & Financial Management Reports
Hospital administrators and department heads access 16 operational reports in `/reports`:
1. Doctor Revenue Share Report
2. Cashier Shift Collections Register
3. GSTR-1 Outward Supplies Report
4. GSTR-3B Tax Summary
5. Bed Occupancy & ALOS Report
6. OPD Daily Footfall & Census
7. Pharmacy Dispense & Profit Margins
8. IPD Discharge & Mortality Register
9. Inventory Near-Expiry Stock Valuation
10. Department-wise Revenue Breakdown
11. Outstanding / Due Payments Ledger
12. Lab Diagnostic Test Utilization
13. Patient Demographics & Geography
14. Referral Doctor Incentives Report
15. Discount & Concession Audit Report
16. Procedure & OT Utilization Report

All reports support instant date-range filtering, in-memory aggregation, and one-click export to CSV / Excel.
