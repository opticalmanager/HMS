# Apex HMS — Ayushman Bharat Digital Mission (ABDM) Integration Guide

## 1. National Health Authority (NHA) Context

The **Ayushman Bharat Digital Mission (ABDM)** aims to build a digital health backbone for India.
Apex HMS conforms to the NHA National Health Stack architecture:
- **Health Facility Registry (HFR)**: Registered hospital entity with a unique HIP ID (e.g. `IN01100001`).
- **Ayushman Bharat Health Account (ABHA)**: 14-digit national patient identifier (`91-XXXX-XXXX-XXXX`) and PHR address (`patient@abdm`).
- **Health Information Exchange (HIU & HIP)**: Secure sharing of medical records encoded as HL7 FHIR R4 document bundles.

---

## 2. Supported Milestones

### Milestone 1 (M1): ABHA Creation & Verification
1. **Aadhaar / Mobile OTP Trigger**:
   - `AbdmService.requestAbhaOtp(identifier, authMode)`
   - Sends OTP to the patient's Aadhaar-linked mobile number.
2. **OTP Verification & Profile Fetch**:
   - `AbdmService.verifyAbhaOtp(txnId, otp)`
   - Returns verified patient demographic payload: Full Name, Gender, Date of Birth, Address, ABHA Number, and ABHA Address.
   - Demographics are automatically bound to the internal patient file (`patients` table).

### Milestone 2 (M2): Care Context Linking
Once a patient completes an outpatient consultation or inpatient admission, the clinical encounter is linked to their national ABHA profile:
- **`patientReference`**: Hospital UHID (`UHID-2026-000001`).
- **`careContexts`**:
  - Reference Number: `OPD-2026-000001` or `IPD-2026-000001`.
  - Display: `OPD Consultation - 14-Nov-2026 (Cardiology)`.

---

## 3. FHIR R4 Clinical Artifact Bundle

When requested by an authorized Health Information User (HIU) with patient consent, Apex HMS compiles the clinical encounter into an HL7 FHIR R4 `document` Bundle:

```json
{
  "resourceType": "Bundle",
  "id": "bundle-OPD-2026-000041",
  "type": "document",
  "timestamp": "2026-11-14T10:30:00Z",
  "entry": [
    {
      "fullUrl": "urn:uuid:patient-UHID-2026-0041",
      "resource": {
        "resourceType": "Patient",
        "id": "UHID-2026-0041"
      }
    },
    {
      "fullUrl": "urn:uuid:condition-1",
      "resource": {
        "resourceType": "Condition",
        "code": {
          "coding": [{
            "system": "http://hl7.org/fhir/sid/icd-10",
            "code": "I10",
            "display": "Essential (primary) hypertension"
          }]
        }
      }
    },
    {
      "fullUrl": "urn:uuid:medication-1",
      "resource": {
        "resourceType": "MedicationRequest",
        "dosageInstruction": [{ "text": "40 mg | 1-0-0" }]
      }
    }
  ]
}
```

---

## 4. Mock Adapter vs Live Sandbox

Apex HMS includes `MockAbdmAdapter` (`lib/abdm/mock-adapter.ts`):
- When `ABDM_MOCK_MODE="true"`, developers and test runners can test ABHA flows without needing active government client certificates. Entering OTP `123456` produces verified mock responses.
- When `ABDM_MOCK_MODE="false"`, the adapter forwards calls directly to the NHA Gateway endpoints (`https://dev.abdm.gov.in/gateway/v0.5`).
