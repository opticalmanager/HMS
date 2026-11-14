import { abdmAdapter } from "@/lib/abdm/mock-adapter";
import type { CareContextLinkItem } from "@/types/abdm";

export class AbdmService {
  /**
   * Generates OTP for ABHA creation or Aadhaar KYC verification
   */
  static async requestAbhaOtp(identifier: string, authMode: "AADHAAR_OTP" | "MOBILE_OTP" = "AADHAAR_OTP") {
    return await abdmAdapter.generateOtp({ identifier, authMode });
  }

  /**
   * Verifies OTP and generates verified ABHA Card details
   */
  static async verifyAbhaOtp(txnId: string, otp: string) {
    return await abdmAdapter.verifyOtp({ txnId, otp });
  }

  /**
   * Links clinical episodes (OPD / IPD) to the national ABDM health record locker
   */
  static async linkClinicalEncounter(
    uhid: string,
    abhaAddress: string,
    contexts: CareContextLinkItem[]
  ) {
    return await abdmAdapter.linkCareContexts({
      patientReference: uhid,
      abhaAddress,
      careContexts: contexts,
    });
  }
}
