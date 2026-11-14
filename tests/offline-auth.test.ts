import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateOfflineSignature,
  signOfflineSession,
  verifyOfflineSession,
  type OfflineSessionPayload,
} from "@/lib/offline-auth";

describe("Offline HMAC-SHA256 Clinical Authentication", () => {
  const validPayload: OfflineSessionPayload = {
    id: "usr-100",
    email: "dr.gaurav@apexhms.org",
    fullName: "Dr. Gaurav Kumar",
    role: "doctor",
    organizationId: "org-apex-main",
    branchId: "br-main",
    isActive: true,
    exp: Date.now() + 86400 * 1000, // +24 hours in ms
  };

  it("generates deterministic HMAC-SHA256 signature", () => {
    const rawStr = JSON.stringify(validPayload);
    const sig1 = generateOfflineSignature(rawStr);
    const sig2 = generateOfflineSignature(rawStr);
    assert.equal(sig1, sig2);
    assert.equal(sig1.length, 64);
  });

  it("verifies untampered offline session successfully", () => {
    const { profile, signature } = signOfflineSession(validPayload);
    const verified = verifyOfflineSession(profile, signature);

    assert.ok(verified);
    assert.equal(verified?.id, validPayload.id);
    assert.equal(verified?.role, "doctor");
  });

  it("rejects tampered session payload", () => {
    const { signature } = signOfflineSession(validPayload);
    const tamperedPayload = JSON.stringify({ ...validPayload, role: "super_admin" });

    const verified = verifyOfflineSession(tamperedPayload, signature);
    assert.equal(verified, null);
  });

  it("rejects expired offline session tokens", () => {
    const expiredPayload: OfflineSessionPayload = {
      ...validPayload,
      exp: Date.now() - 3600 * 1000, // Expired 1 hr ago
    };
    const { profile, signature } = signOfflineSession(expiredPayload);
    const verified = verifyOfflineSession(profile, signature);
    assert.equal(verified, null);
  });

  it("rejects deactivated user accounts", () => {
    const deactivatedPayload: OfflineSessionPayload = {
      ...validPayload,
      isActive: false,
    };
    const { profile, signature } = signOfflineSession(deactivatedPayload);
    const verified = verifyOfflineSession(profile, signature);
    assert.equal(verified, null);
  });
});
