import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MockAbdmAdapter } from "@/lib/abdm/mock-adapter";

describe("ABDM NHA Milestone 1 & 2 Adapter", () => {
  const adapter = new MockAbdmAdapter(true, "IN01100001");

  it("Milestone 1: generates OTP transaction ID for Aadhaar KYC", async () => {
    const res = await adapter.generateOtp({
      identifier: "123456789012",
      authMode: "AADHAAR_OTP",
    });

    assert.ok(res.txnId.startsWith("ABDM-TXN-"));
    assert.equal(res.authMode, "AADHAAR_OTP");
    assert.ok(res.message.includes("9012"));
  });

  it("Milestone 1: verifies OTP and returns verified ABHA profile", async () => {
    const profile = await adapter.verifyOtp({
      txnId: "ABDM-TXN-TEST",
      otp: "123456",
    });

    assert.ok(profile.abhaNumber);
    assert.equal(profile.abhaAddress, "gaurav.kumar@abdm");
    assert.equal(profile.fullName, "Gaurav Kumar");
  });

  it("Milestone 2: links patient care context with hospital encounter", async () => {
    const linkRes = await adapter.linkCareContexts({
      patientReference: "UHID-2026-0041",
      abhaAddress: "gaurav.kumar@abdm",
      careContexts: [
        { referenceNumber: "OPD-2026-000041", display: "OPD Consultation (Cardiology)" },
      ],
    });

    assert.equal(linkRes.status, "SUCCESS");
    assert.equal(linkRes.careContextsLinked, 1);
  });

  it("generates compliant HL7 FHIR R4 Bundle", () => {
    const bundle = adapter.generateFhirR4Bundle(
      "UHID-2026-000123",
      "Ramesh Patel",
      "OPD-2026-000123",
      [{ code: "E11.9", display: "Type 2 diabetes mellitus" }],
      [{ name: "Metformin 500mg", dosage: "500mg", frequency: "1 tab BD" }]
    );

    assert.equal(bundle.resourceType, "Bundle");
    assert.equal(bundle.type, "document");
    assert.ok(bundle.entry.length >= 3);
  });
});
