import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  ReportsService,
  HEALTHRAY_REPORT_CATEGORIES,
  REPORTS_CATALOG,
} from "../services/reports.service";
import { clinicalStore } from "../services/clinical-store";

describe("Healthray 16-Category Enterprise Reports Suite", () => {
  const state = clinicalStore.getSnapshot();

  test("defines all 16 Healthray Report Categories with sub-tabs", () => {
    assert.equal(HEALTHRAY_REPORT_CATEGORIES.length, 16);

    const expectedTitles = [
      "Bill / Receipt Report",
      "Collection Reports",
      "Revenue Sharing",
      "Referral Reports",
      "Patient Report",
      "Rx Report",
      "Consultation Report",
      "Hospital Expenses",
      "Custom Report",
      "OPD Tracking",
      "Patient Deposit & Refund",
      "Statutory GST Reports",
      "TAT Reports",
      "Download History",
      "Revenue Leakage Reports",
      "OTP & ABDM Authorization",
    ];

    expectedTitles.forEach((title, idx) => {
      assert.equal(HEALTHRAY_REPORT_CATEGORIES[idx].title, title);
      assert.ok(HEALTHRAY_REPORT_CATEGORIES[idx].subTabs.length > 0);
    });
  });

  test("Category 1: Bill / Receipt Report generates bills subtab with standard 6 KPI cards", () => {
    const rep = ReportsService.generateReport("bills", state);
    assert.equal(rep.meta.id, "bills");
    assert.ok(rep.rows.length > 0);
    assert.equal(rep.summaryCards.length, 6);

    const labels = rep.summaryCards.map((c) => c.label);
    assert.ok(labels.includes("TOTAL BILL CREATED"));
    assert.ok(labels.includes("TOTAL TAX"));
    assert.ok(labels.includes("TOTAL DISCOUNT"));
    assert.ok(labels.includes("TOTAL PAYABLE"));
    assert.ok(labels.includes("TOTAL PAID"));
    assert.ok(labels.includes("TOTAL DUE"));

    // Verify paid and due variant highlights
    const paidCard = rep.summaryCards.find((c) => c.label === "TOTAL PAID");
    assert.equal(paidCard?.variant, "paid");

    const dueCard = rep.summaryCards.find((c) => c.label === "TOTAL DUE");
    assert.equal(dueCard?.variant, "due");
  });

  test("Category 2: Collection Reports generates total collection with formula card", () => {
    const rep = ReportsService.generateReport("coll-total", state);
    assert.equal(rep.meta.id, "coll-total");
    assert.ok(rep.formulaSummary);
    assert.equal(
      rep.formulaSummary.currentPeriod + rep.formulaSummary.pastPeriod,
      rep.formulaSummary.netCollection
    );

    const formulaCard = rep.summaryCards.find((c) => c.variant === "formula");
    assert.ok(formulaCard);
    assert.ok(formulaCard.value.includes("+"));
    assert.ok(formulaCard.value.includes("="));
  });

  test("generates report data for every sub-tab across all 16 categories without throwing", () => {
    HEALTHRAY_REPORT_CATEGORIES.forEach((cat) => {
      cat.subTabs.forEach((tab) => {
        const res = ReportsService.generateReport(tab.id, state);
        assert.ok(res.meta, `Meta should exist for subtab ${tab.id}`);
        assert.ok(Array.isArray(res.rows), `Rows should be array for ${tab.id}`);
        assert.ok(Array.isArray(res.summaryCards), `Summary cards should exist for ${tab.id}`);
      });
    });
  });

  test("filters invoices by payment mode and search query correctly", () => {
    const upiReport = ReportsService.generateReport("bills", state, {
      paymentMode: "upi",
    });
    assert.ok(upiReport.rows.every((r) => r.mode === "UPI"));

    const searchReport = ReportsService.generateReport("bills", state, {
      searchQuery: "Ramesh",
    });
    assert.ok(searchReport.rows.every((r) => r.patientName.includes("Ramesh")));
  });

  test("filters invoices by encounter type (OPD / IPD)", () => {
    const ipdReport = ReportsService.generateReport("bills", state, {
      encounterType: "ipd",
    });
    assert.ok(ipdReport.rows.every((r) => r.type === "IPD"));
  });

  test("filters invoices by Start Time and End Time range accurately", () => {
    // There is an invoice at 09:40 and one at 10:14
    const morningShift = ReportsService.generateReport("bills", state, {
      startDate: "2026-11-14",
      endDate: "2026-11-14",
      startTime: "09:00",
      endTime: "09:59",
    });
    assert.ok(morningShift.rows.length > 0);
    assert.ok(morningShift.rows.every((r) => r.date.includes("09:40")));

    const laterShift = ReportsService.generateReport("bills", state, {
      startDate: "2026-11-14",
      endDate: "2026-11-14",
      startTime: "10:00",
      endTime: "11:00",
    });
    assert.ok(laterShift.rows.length > 0);
    assert.ok(laterShift.rows.every((r) => r.date.includes("10:14")));
  });

  test("filters invoices by doctor and department dropdowns", () => {
    const cardiologyReport = ReportsService.generateReport("bills", state, {
      department: "Cardiology",
    });
    assert.ok(cardiologyReport.rows.length > 0);
    assert.ok(cardiologyReport.rows.every((r) => r.department.includes("Cardiology")));

    const pharmacyReport = ReportsService.generateReport("bills", state, {
      department: "Pharmacy",
    });
    assert.ok(pharmacyReport.rows.length > 0);
    assert.ok(pharmacyReport.rows.every((r) => r.department === "Pharmacy"));
  });

  test("combines all filter dimensions at once without crashing or corruption", () => {
    const multiFilterReport = ReportsService.generateReport("bills", state, {
      duration: "last30",
      startDate: "2026-10-15",
      endDate: "2026-11-15",
      startTime: "08:00",
      endTime: "20:00",
      department: "Cardiology",
      paymentMode: "upi",
      searchQuery: "Ramesh",
      encounterType: "opd",
      settled: true,
    });
    assert.ok(Array.isArray(multiFilterReport.rows));
    assert.ok(multiFilterReport.rows.length >= 1);
    assert.equal(multiFilterReport.rows[0].mode, "UPI");
    assert.equal(multiFilterReport.rows[0].patientName, "Ramesh Patel");
  });

  test("filters Doctor Revenue Share report by selected doctor and department", () => {
    const filteredDoc = ReportsService.generateReport("doctor-share", state, {
      doctorId: "usr-1",
    });
    assert.equal(filteredDoc.rows.length, 1);
    assert.ok(filteredDoc.rows[0].doctorName.includes("Gaurav"));
  });

  test("retains legacy 16 REPORTS_CATALOG for backward compatibility", () => {
    assert.equal(REPORTS_CATALOG.length, 16);
    const legacyIds = [
      "rep-doc-share",
      "rep-cashier-shift",
      "rep-gstr-1",
      "rep-gstr-3b",
      "rep-bed-alos",
      "rep-opd-footfall",
      "rep-pharm-margin",
      "rep-ipd-discharge",
      "rep-near-expiry",
      "rep-dept-revenue",
      "rep-outstanding-due",
      "rep-lab-utilization",
      "rep-patient-demographics",
      "rep-doctor-incentives",
      "rep-discount-audit",
      "rep-ot-utilization",
    ];

    legacyIds.forEach((id) => {
      const rep = ReportsService.generateReport(id, state);
      assert.ok(rep.meta.id === id);
    });
  });
});
