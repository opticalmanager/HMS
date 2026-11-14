import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AppointmentService } from "@/services/appointment.service";
import { ClinicalService } from "@/services/clinical.service";
import { InventoryService } from "@/services/inventory.service";
import { IpdService } from "@/services/ipd.service";

describe("Clinical Services Domain Workflows", () => {
  it("AppointmentService generates sequential token and appointment record", () => {
    const apt = AppointmentService.createAppointmentRecord(
      {
        organizationId: "org-1",
        branchId: "br-1",
        patientId: "pat-100",
        patientName: "Meera Nair",
        patientPhone: "9823055555",
        patientUhid: "UHID-2026-000100",
        doctorId: "doc-1",
        doctorName: "Dr. Gaurav Kumar",
        department: "Cardiology",
        appointmentDate: "2026-11-14",
        timeSlot: "11:00 AM",
        consultationFee: 800,
      },
      15
    );

    assert.equal(apt.tokenNumber, 16);
    assert.equal(apt.status, "scheduled");
    assert.equal(apt.priority, "normal");
    assert.equal(apt.isPaid, false);
    assert.equal(AppointmentService.formatTokenLabel(apt.tokenNumber), "TKN-016");
  });

  it("ClinicalService evaluates vitals and flags hypertensive status", () => {
    const rawVitals = {
      patientId: "pat-100",
      recordedAt: new Date().toISOString(),
      systolicBp: 155, // Warning
      diastolicBp: 95,
      pulseRate: 78,
      temperature: 98.4,
      spo2: 99,
      heightCm: 170,
      weightKg: 70,
    };

    const processed = ClinicalService.processVitals(rawVitals);
    assert.equal(processed.bpStatus, "warning");
    assert.equal(processed.pulseStatus, "normal");
    assert.equal(processed.spo2Status, "normal");
    assert.equal(processed.bmi, 24.2);
    assert.equal(processed.bmiInfo.category, "Normal");
  });

  it("IpdService admits patient and computes bed occupancy rate", () => {
    const admission = IpdService.admitPatient(
      {
        organizationId: "org-1",
        branchId: "br-1",
        patientId: "pat-100",
        primaryDoctorId: "doc-1",
        wardId: "ward-icu",
        bedId: "bed-01",
        admissionReason: "Severe Acute Myocardial Infarction",
        advanceDepositPaid: 15000,
      },
      1
    );

    assert.equal(admission.admissionNumber, "IPD-2026-000001");
    assert.equal(admission.status, "admitted");
    assert.equal(admission.totalAdvancePaid, 15000);

    const beds = [
      { id: "1", organizationId: "org", branchId: "br", wardId: "w", wardName: "ICU", wardType: "icu" as const, bedNumber: "B1", status: "occupied" as const, dailyRate: 5000 },
      { id: "2", organizationId: "org", branchId: "br", wardId: "w", wardName: "ICU", wardType: "icu" as const, bedNumber: "B2", status: "available" as const, dailyRate: 5000 },
      { id: "3", organizationId: "org", branchId: "br", wardId: "w", wardName: "ICU", wardType: "icu" as const, bedNumber: "B3", status: "available" as const, dailyRate: 5000 },
      { id: "4", organizationId: "org", branchId: "br", wardId: "w", wardName: "ICU", wardType: "icu" as const, bedNumber: "B4", status: "occupied" as const, dailyRate: 5000 },
    ];

    const occ = IpdService.calculateOccupancy(beds);
    assert.equal(occ.total, 4);
    assert.equal(occ.occupied, 2);
    assert.equal(occ.available, 2);
    assert.equal(occ.occupancyRatePercent, 50.0);
  });

  it("InventoryService correctly dispenses stock and blocks insufficient quantity", () => {
    const res1 = InventoryService.dispenseMedications(100, 30);
    assert.equal(res1.success, true);
    assert.equal(res1.remainingStock, 70);

    const res2 = InventoryService.dispenseMedications(20, 50);
    assert.equal(res2.success, false);
    assert.ok(res2.error?.includes("Insufficient stock"));
  });

  it("InventoryService identifies near-expiry medications and low-stock items", () => {
    const sampleItems = [
      {
        id: "1",
        organizationId: "org",
        branchId: "br",
        sku: "M1",
        name: "Drug A",
        category: "tablet" as const,
        batchNumber: "B1",
        expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 10 days away
        quantityInStock: 15,
        reorderLevel: 50,
        purchasePrice: 10,
        sellingPrice: 20,
        gstRate: 12,
      },
      {
        id: "2",
        organizationId: "org",
        branchId: "br",
        sku: "M2",
        name: "Drug B",
        category: "tablet" as const,
        batchNumber: "B2",
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 180 days away
        quantityInStock: 150,
        reorderLevel: 50,
        purchasePrice: 10,
        sellingPrice: 20,
        gstRate: 12,
      },
    ];

    const nearExpiry = InventoryService.getNearExpiryItems(sampleItems, 30);
    assert.equal(nearExpiry.length, 1);
    assert.equal(nearExpiry[0].sku, "M1");

    const lowStock = InventoryService.getLowStockAlerts(sampleItems);
    assert.equal(lowStock.length, 1);
    assert.equal(lowStock[0].sku, "M1");
  });
});
