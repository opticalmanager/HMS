export * from "@/types/abdm";

export const ABDM_ENDPOINTS = {
  SESSIONS: "/v0.5/sessions",
  GENERATE_AADHAAR_OTP: "/v0.5/registration/aadhaar/generateOtp",
  VERIFY_AADHAAR_OTP: "/v0.5/registration/aadhaar/verifyOTP",
  DISCOVER_CARE_CONTEXT: "/v0.5/care-contexts/discover",
  LINK_CARE_CONTEXT: "/v0.5/links/link/init",
  CONFIRM_CARE_CONTEXT: "/v0.5/links/link/confirm",
  CONSENT_REQUEST: "/v0.5/consent-requests/init",
};
