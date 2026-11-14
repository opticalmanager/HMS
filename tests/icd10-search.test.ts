import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { searchIcd10, getIcd10ByCode } from "@/utils/icd10";

describe("In-Memory ICD-10 Search & Diagnostic Catalog", () => {
  it("searches diagnosis by condition name", () => {
    const results = searchIcd10("diabetes");
    assert.ok(results.length > 0);
    assert.ok(results.some((r) => r.code.startsWith("E11")));
  });

  it("searches diagnosis by disease code", () => {
    const results = searchIcd10("I10");
    assert.equal(results.length, 1);
    assert.equal(results[0].code, "I10");
    assert.ok(results[0].description.toLowerCase().includes("hypertension"));
  });

  it("searches common tropical infections (Dengue, Malaria, Typhoid)", () => {
    const dengue = searchIcd10("dengue");
    assert.ok(dengue.some((r) => r.code === "A90"));

    const malaria = searchIcd10("malaria");
    assert.ok(malaria.some((r) => r.code === "B54"));

    const typhoid = searchIcd10("typhoid");
    assert.ok(typhoid.some((r) => r.code === "A01.0"));
  });

  it("retrieves exact match using getIcd10ByCode", () => {
    const item = getIcd10ByCode("J18.9");
    assert.ok(item);
    assert.equal(item?.description, "Pneumonia, unspecified organism");
    assert.equal(item?.category, "Pneumonia");
    assert.equal(item?.chapter, "Respiratory");
  });

  it("returns empty array / undefined for unmatched terms", () => {
    const results = searchIcd10("xyznonexistentcondition999");
    assert.equal(results.length, 0);

    const code = getIcd10ByCode("ZZZ.999");
    assert.equal(code, undefined);
  });
});
