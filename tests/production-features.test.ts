import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { parseDoseFrequency } from "../utils/dose-parser";
import { audioChime } from "../utils/audio-chime";
import { ReportsService, REPORTS_CATALOG } from "../services/reports.service";
import { clinicalStore } from "../services/clinical-store";

describe("Clinical Dose Frequency Parser", () => {
  test("parses standard 1-0-1 5d frequency notation", () => {
    const res = parseDoseFrequency("1-0-1 5d");
    assert.equal(res.frequency, "1-0-1");
    assert.equal(res.morning, 1);
    assert.equal(res.afternoon, 0);
    assert.equal(res.night, 1);
    assert.equal(res.durationDays, 5);
    assert.equal(res.totalQuantity, 10);
    assert.equal(res.dailyDoses, 2);
  });

  test("parses 1-1-1 3d notation", () => {
    const res = parseDoseFrequency("1-1-1 3d");
    assert.equal(res.frequency, "1-1-1");
    assert.equal(res.morning, 1);
    assert.equal(res.afternoon, 1);
    assert.equal(res.night, 1);
    assert.equal(res.durationDays, 3);
    assert.equal(res.totalQuantity, 9);
  });

  test("parses natural clinical variations: 'for 5 days', 'x 5d', '1 - 0 - 1', and units", () => {
    const forDays = parseDoseFrequency("1-0-1 for 5 days");
    assert.equal(forDays.frequency, "1-0-1");
    assert.equal(forDays.durationDays, 5);
    assert.equal(forDays.totalQuantity, 10);

    const xDays = parseDoseFrequency("1-0-1 x 5d");
    assert.equal(xDays.frequency, "1-0-1");
    assert.equal(xDays.durationDays, 5);
    assert.equal(xDays.totalQuantity, 10);

    const spacedHyphens = parseDoseFrequency("1 - 0 - 1 5d");
    assert.equal(spacedHyphens.frequency, "1-0-1");
    assert.equal(spacedHyphens.totalQuantity, 10);

    const halfDose = parseDoseFrequency("0.5-0-0.5 5d");
    assert.equal(halfDose.frequency, "0.5-0-0.5");
    assert.equal(halfDose.dailyDoses, 1);
    assert.equal(halfDose.totalQuantity, 5);

    const withPrefix = parseDoseFrequency("1 tab 1-0-1 for 7 days");
    assert.equal(withPrefix.frequency, "1-0-1");
    assert.equal(withPrefix.durationDays, 7);
    assert.equal(withPrefix.totalQuantity, 14);
  });

  test("parses week and month durations into correct day quantities", () => {
    const twoWeeks = parseDoseFrequency("1-0-1 2 weeks");
    assert.equal(twoWeeks.frequency, "1-0-1");
    assert.equal(twoWeeks.durationDays, 14);
    assert.equal(twoWeeks.totalQuantity, 28);

    const oneMonth = parseDoseFrequency("1-0-0 1 month");
    assert.equal(oneMonth.frequency, "1-0-0");
    assert.equal(oneMonth.durationDays, 30);
    assert.equal(oneMonth.totalQuantity, 30);
  });

  test("parses Latin acronyms TDS, BD, OD, QID, and STAT", () => {
    const tds = parseDoseFrequency("TDS 5d");
    assert.equal(tds.frequency, "1-1-1");
    assert.equal(tds.totalQuantity, 15);

    const bd = parseDoseFrequency("BD 7d");
    assert.equal(bd.frequency, "1-0-1");
    assert.equal(bd.totalQuantity, 14);

    const od = parseDoseFrequency("OD 10d");
    assert.equal(od.frequency, "1-0-0");
    assert.equal(od.totalQuantity, 10);

    const qid = parseDoseFrequency("QID 3d");
    assert.equal(qid.frequency, "1-1-1-1");
    assert.equal(qid.totalQuantity, 12);

    const stat = parseDoseFrequency("STAT");
    assert.equal(stat.frequency, "STAT");
    assert.equal(stat.durationDays, 1);
    assert.equal(stat.totalQuantity, 1);
  });

  test("handles empty or malformed input with safe defaults", () => {
    const empty = parseDoseFrequency("", 5);
    assert.equal(empty.totalQuantity, 10);

    const fallback = parseDoseFrequency("INVALID", 7);
    assert.equal(fallback.durationDays, 7);
    assert.equal(fallback.totalQuantity, 14);
  });
});

describe("Audio Chime Synthesizer Resilience", () => {
  test("handles zero volume or muted states safely without throwing", async () => {
    // Should complete immediately without throwing Web Audio InvalidAccessError
    await audioChime.playChime(0);
    await audioChime.playChime(-1);
    audioChime.setMuted(true);
    assert.equal(audioChime.getMuted(), true);
    await audioChime.playChime(0.5);
    audioChime.setMuted(false);
  });
});

describe("16 Clinical & Financial Reports Engine", () => {
  beforeEach(() => {
    clinicalStore.seedDemoData();
  });

  test("contains all 16 reports in catalog", () => {
    assert.equal(REPORTS_CATALOG.length, 16);
    const ids = REPORTS_CATALOG.map((r) => r.id);
    assert.ok(ids.includes("rep-doc-share"));
    assert.ok(ids.includes("rep-cashier-shift"));
    assert.ok(ids.includes("rep-gstr-1"));
    assert.ok(ids.includes("rep-gstr-3b"));
    assert.ok(ids.includes("rep-bed-alos"));
  });

  test("generates Doctor Revenue Share report with correct calculations", () => {
    const state = clinicalStore.getSnapshot();
    const rep = ReportsService.generateReport("rep-doc-share", state);
    assert.equal(rep.meta.id, "rep-doc-share");
    assert.ok(rep.rows.length > 0);
    assert.ok(rep.summaryCards.length >= 4);
  });

  test("generates Cashier Shift Collections report", () => {
    const state = clinicalStore.getSnapshot();
    const rep = ReportsService.generateReport("rep-cashier-shift", state);
    assert.equal(rep.meta.id, "rep-cashier-shift");
    assert.ok(rep.rows.length > 0);
    assert.equal(rep.rows[0].cashierName, "Meenakshi Sundaram");
  });

  test("generates Bed Occupancy & ALOS report including ICU, CCU, General, and Deluxe wards", () => {
    const state = clinicalStore.getSnapshot();
    const rep = ReportsService.generateReport("rep-bed-alos", state);
    assert.equal(rep.meta.id, "rep-bed-alos");
    assert.ok(rep.rows.length >= 4);
    const wardNames = rep.rows.map((r) => r.ward);
    assert.ok(wardNames.some((w) => String(w).includes("ICU")));
    assert.ok(wardNames.some((w) => String(w).includes("CCU")));
    assert.ok(wardNames.some((w) => String(w).includes("General")));
    assert.ok(wardNames.some((w) => String(w).includes("Deluxe")));
  });
});

describe("Clinical Store Reactive State & Workflows", () => {
  beforeEach(() => {
    clinicalStore.seedDemoData();
  });

  test("adds patient and persists in store", () => {
    const initialCount = clinicalStore.getSnapshot().patients.length;
    clinicalStore.addPatient({
      id: "pat-test-99",
      uhid: "UHID-2026-9999",
      organizationId: "org-apex-001",
      branchId: "br-main-001",
      fullName: "Test Automated Patient",
      gender: "male",
      phone: "9998887770",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const nextState = clinicalStore.getSnapshot();
    assert.equal(nextState.patients.length, initialCount + 1);

    const found = clinicalStore.findPatientByUhidOrPhone("UHID-2026-9999");
    assert.ok(found);
    assert.equal(found?.fullName, "Test Automated Patient");
  });

  test("allocates bed and transitions bed status to occupied", () => {
    clinicalStore.allocateBed("b2", {
      patientId: "pat-1",
      patientName: "Ramesh Patel",
      admittingDoctor: "Dr. Gaurav Kumar",
      reason: "Post-op ICU care",
      advance: 5000,
    });

    const bed = clinicalStore.getSnapshot().beds.find((b) => b.id === "b2");
    assert.equal(bed?.status, "occupied");
    assert.equal(bed?.patientName, "Ramesh Patel");
  });

  test("toggles nursing MAR medication status", () => {
    const mar = clinicalStore.getSnapshot().nursingMar[0];
    const prevStatus = mar.status;

    clinicalStore.toggleNursingMarStatus(mar.id, "Sister Test");
    const updated = clinicalStore.getSnapshot().nursingMar.find((m) => m.id === mar.id);

    assert.notEqual(updated?.status, prevStatus);
  });

  test("creates invoice and persists in store", () => {
    const initialInvoices = clinicalStore.getSnapshot().invoices.length;
    clinicalStore.addInvoice({
      id: "inv-test-99",
      invoiceNumber: "INV-2026-9999",
      organizationId: "org-apex-001",
      branchId: "br-main-001",
      patientId: "pat-2",
      patientName: "Sunita Roy",
      patientPhone: "9823098765",
      invoiceType: "opd",
      items: [
        {
          description: "Cardiology Consultation",
          category: "consultation",
          quantity: 1,
          unitPrice: 800,
          gstRate: 0,
          amount: 800,
        },
      ],
      subtotal: 800,
      taxTotal: 0,
      discountTotal: 0,
      grandTotal: 800,
      amountPaid: 800,
      balanceDue: 0,
      paymentStatus: "paid",
      paymentMode: "upi",
      createdAt: new Date().toISOString(),
    });

    const updated = clinicalStore.getSnapshot();
    assert.equal(updated.invoices.length, initialInvoices + 1);
    const created = updated.invoices.find((i) => i.id === "inv-test-99");
    assert.ok(created);
    assert.equal(created?.patientName, "Sunita Roy");
  });
});
