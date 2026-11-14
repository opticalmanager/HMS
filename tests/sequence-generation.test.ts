import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatSequenceNumber, parseSequenceNumber } from "@/utils/document-series";

describe("Document Series & Sequence Generation", () => {
  it("formats token numbers with 3-digit padding", () => {
    assert.equal(formatSequenceNumber("TKN", 1), "TKN-001");
    assert.equal(formatSequenceNumber("TKN", 42), "TKN-042");
    assert.equal(formatSequenceNumber("TKN", 999), "TKN-999");
  });

  it("formats UHID with default year and 6-digit padding", () => {
    assert.equal(formatSequenceNumber("UHID", 1, { year: 2026 }), "UHID-2026-000001");
    assert.equal(formatSequenceNumber("UHID", 15420, { year: 2026 }), "UHID-2026-015420");
  });

  it("formats OPD, IPD, and Invoices accurately", () => {
    assert.equal(formatSequenceNumber("OPD", 78, { year: 2026 }), "OPD-2026-000078");
    assert.equal(formatSequenceNumber("IPD", 12, { year: 2026 }), "IPD-2026-000012");
    assert.equal(formatSequenceNumber("INV", 554, { year: 2026 }), "INV-2026-000554");
  });

  it("formats branch-scoped documents", () => {
    assert.equal(
      formatSequenceNumber("INV", 554, { year: 2026, branchCode: "AMC" }),
      "INV-AMC-2026-000554"
    );
  });

  it("correctly parses generated sequence strings", () => {
    const parsedUhid = parseSequenceNumber("UHID-2026-000123");
    assert.ok(parsedUhid);
    assert.equal(parsedUhid?.prefix, "UHID");
    assert.equal(parsedUhid?.year, 2026);
    assert.equal(parsedUhid?.sequence, 123);

    const parsedTkn = parseSequenceNumber("TKN-045");
    assert.ok(parsedTkn);
    assert.equal(parsedTkn?.prefix, "TKN");
    assert.equal(parsedTkn?.sequence, 45);

    const parsedBranch = parseSequenceNumber("INV-AMC-2026-000554");
    assert.ok(parsedBranch);
    assert.equal(parsedBranch?.branchCode, "AMC");
    assert.equal(parsedBranch?.prefix, "INV");
    assert.equal(parsedBranch?.year, 2026);
    assert.equal(parsedBranch?.sequence, 554);
  });

  it("returns null for malformed sequence codes", () => {
    assert.equal(parseSequenceNumber("INVALID-STRING"), null);
    assert.equal(parseSequenceNumber(""), null);
    assert.equal(parseSequenceNumber("UHID-ABC-DEF"), null);
  });
});
