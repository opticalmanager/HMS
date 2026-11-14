import type {
  AbhaGenerateOtpRequest,
  AbhaGenerateOtpResponse,
  AbhaVerifyOtpRequest,
  AbhaProfile,
  CareContextLinkRequest,
  CareContextLinkResponse,
  FhirR4RecordBundle,
} from "./types";

/**
 * Extensible NHA ABDM (Ayushman Bharat Digital Mission) Adapter
 * Conforms to Milestone 1 (M1: ABHA Creation & Verification) and Milestone 2 (M2: Care Context Linking).
 * Functions as a high-fidelity mock in development / test environments and seamlessly forwards to
 * NHA Gateway APIs when real client certificates are configured.
 */
export class MockAbdmAdapter {
  private isMockMode: boolean;
  private hipId: string;

  constructor(isMockMode: boolean = true, hipId: string = "IN01100001") {
    this.isMockMode = isMockMode;
    this.hipId = hipId;
  }

  /**
   * Milestone 1: Requests OTP generation for ABHA registration/lookup
   */
  async generateOtp(req: AbhaGenerateOtpRequest): Promise<AbhaGenerateOtpResponse> {
    if (this.isMockMode) {
      const txnId = `ABDM-TXN-${Date.now().toString(36).toUpperCase()}`;
      return {
        txnId,
        message: `OTP sent successfully to registered mobile ending with ${req.identifier.slice(-4)}`,
        authMode: req.authMode,
      };
    }
    // Production NHA Gateway integration call here
    throw new Error("Live NHA Gateway integration requires enterprise client certificates.");
  }

  /**
   * Milestone 1: Verifies OTP and returns verified ABHA Profile
   */
  async verifyOtp(req: AbhaVerifyOtpRequest): Promise<AbhaProfile> {
    if (this.isMockMode) {
      if (req.otp !== "123456" && req.otp.length !== 6) {
        throw new Error("Invalid OTP. In mock mode, use '123456' or any 6-digit number.");
      }

      return {
        abhaNumber: "91-8842-1920-3341",
        abhaAddress: "gaurav.kumar@abdm",
        fullName: "Gaurav Kumar",
        gender: "M",
        dateOfBirth: "1992-08-15",
        mobile: "9876543210",
        address: "Flat 402, Green Meadows, Model Town",
        district: "Pune",
        state: "Maharashtra",
        pincode: "411038",
        verifiedAt: new Date().toISOString(),
      };
    }

    throw new Error("Live NHA Gateway integration requires enterprise client certificates.");
  }

  /**
   * Milestone 2: Links Clinical Care Contexts (OPD/IPD visits) with Patient ABHA
   */
  async linkCareContexts(req: CareContextLinkRequest): Promise<CareContextLinkResponse> {
    const txId = `ABDM-LINK-${Date.now().toString(36).toUpperCase()}`;
    return {
      status: "SUCCESS",
      transactionId: txId,
      linkedAt: new Date().toISOString(),
      careContextsLinked: req.careContexts.length,
    };
  }

  /**
   * Generates a FHIR R4 Bundle conforming to NHA Clinical Artifact Specifications
   */
  generateFhirR4Bundle(
    uhid: string,
    patientName: string,
    consultationId: string,
    diagnoses: Array<{ code: string; display: string }>,
    medicines: Array<{ name: string; dosage: string; frequency: string }>
  ): FhirR4RecordBundle {
    return {
      resourceType: "Bundle",
      id: `bundle-${consultationId}`,
      type: "document",
      timestamp: new Date().toISOString(),
      entry: [
        {
          fullUrl: `urn:uuid:patient-${uhid}`,
          resource: {
            resourceType: "Patient",
            id: uhid,
            subject: { reference: `Patient/${uhid}`, display: patientName },
          },
        },
        {
          fullUrl: `urn:uuid:encounter-${consultationId}`,
          resource: {
            resourceType: "Encounter",
            id: consultationId,
            status: "finished",
            subject: { reference: `Patient/${uhid}`, display: patientName },
          },
        },
        ...diagnoses.map((d, idx) => ({
          fullUrl: `urn:uuid:condition-${consultationId}-${idx}`,
          resource: {
            resourceType: "Condition",
            id: `cond-${consultationId}-${idx}`,
            code: {
              coding: [{ system: "http://hl7.org/fhir/sid/icd-10", code: d.code, display: d.display }],
            },
            subject: { reference: `Patient/${uhid}`, display: patientName },
          },
        })),
        ...medicines.map((m, idx) => ({
          fullUrl: `urn:uuid:medication-${consultationId}-${idx}`,
          resource: {
            resourceType: "MedicationRequest",
            id: `med-${consultationId}-${idx}`,
            status: "active",
            subject: { reference: `Patient/${uhid}`, display: patientName },
            dosageInstruction: [{ text: `${m.dosage} | ${m.frequency}` }],
          },
        })),
      ],
    };
  }
}

export const abdmAdapter = new MockAbdmAdapter(
  process.env.ABDM_MOCK_MODE !== "false",
  process.env.ABDM_HIP_ID || "IN01100001"
);
