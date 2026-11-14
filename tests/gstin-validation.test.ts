import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateGstin, getStateFromGstin, calculateGstBreakdown } from "@/utils/gstin";

describe("GSTIN Validation and Tax Computations", () => {
  it("validates valid 15-character Indian GSTIN", () => {
    assert.equal(validateGstin("27AAAAA0000A1Z5"), true);
    assert.equal(validateGstin("29BBBBB1111B2Z3"), true);
  });

  it("rejects invalid GSTIN strings", () => {
    assert.equal(validateGstin("123"), false);
    assert.equal(validateGstin("99AAAAA0000A1Z5"), false); // Invalid state code 99
    assert.equal(validateGstin("27AAAAA0000A1Z"), false); // 14 chars
    assert.equal(validateGstin(""), false);
  });

  it("extracts state from valid GSTIN", () => {
    assert.equal(getStateFromGstin("27AAAAA0000A1Z5"), "Maharashtra");
    assert.equal(getStateFromGstin("29BBBBB1111B2Z3"), "Karnataka");
    assert.equal(getStateFromGstin("invalid"), null);
  });

  it("calculates intra-state GST breakdown (CGST + SGST)", () => {
    const res = calculateGstBreakdown(1000, 18, "27", "27");
    assert.equal(res.isInterState, false);
    assert.equal(res.cgstRate, 9);
    assert.equal(res.sgstRate, 9);
    assert.equal(res.igstRate, 0);
    assert.equal(res.cgstAmount, 90);
    assert.equal(res.sgstAmount, 90);
    assert.equal(res.igstAmount, 0);
    assert.equal(res.totalTax, 180);
    assert.equal(res.totalAmount, 1180);
  });

  it("calculates inter-state GST breakdown (IGST)", () => {
    const res = calculateGstBreakdown(1000, 18, "27", "29");
    assert.equal(res.isInterState, true);
    assert.equal(res.cgstRate, 0);
    assert.equal(res.sgstRate, 0);
    assert.equal(res.igstRate, 18);
    assert.equal(res.cgstAmount, 0);
    assert.equal(res.sgstAmount, 0);
    assert.equal(res.igstAmount, 180);
    assert.equal(res.totalTax, 180);
    assert.equal(res.totalAmount, 1180);
  });
});
