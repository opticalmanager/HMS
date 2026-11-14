/**
 * Ayushman Bharat Digital Mission (ABDM) / National Health Authority (NHA) FHIR R4 Types
 */

export interface AbhaGenerateOtpRequest {
  identifier: string; // 12-digit Aadhaar or 10-digit Mobile
  authMode: "AADHAAR_OTP" | "MOBILE_OTP";
}

export interface AbhaGenerateOtpResponse {
  txnId: string;
  message: string;
  authMode: string;
}

export interface AbhaVerifyOtpRequest {
  txnId: string;
  otp: string;
}

export interface AbhaProfile {
  abhaNumber: string; // e.g. "91-1234-5678-9012"
  abhaAddress: string; // e.g. "patient@abdm"
  fullName: string;
  gender: "M" | "F" | "O";
  dateOfBirth: string; // YYYY-MM-DD
  mobile: string;
  address?: string;
  district?: string;
  state?: string;
  pincode?: string;
  profilePhoto?: string;
  verifiedAt: string;
}

export interface CareContextLinkItem {
  referenceNumber: string; // e.g. OPD Visit ID or IPD Admission ID
  display: string; // e.g. "OPD Consultation - 2026-11-14 (Cardiology)"
}

export interface CareContextLinkRequest {
  patientReference: string; // UHID
  abhaAddress: string;
  careContexts: CareContextLinkItem[];
}

export interface CareContextLinkResponse {
  status: "SUCCESS" | "PENDING" | "FAILED";
  transactionId: string;
  linkedAt: string;
  careContextsLinked: number;
}

export interface FhirBundleEntry {
  fullUrl: string;
  resource: {
    resourceType: string;
    id: string;
    status?: string;
    subject?: { reference: string; display: string };
    code?: { coding: Array<{ system: string; code: string; display: string }> };
    effectiveDateTime?: string;
    [key: string]: unknown;
  };
}

export interface FhirR4RecordBundle {
  resourceType: "Bundle";
  id: string;
  type: "document";
  timestamp: string;
  entry: FhirBundleEntry[];
}
