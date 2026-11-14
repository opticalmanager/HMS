import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clinicalStore } from "../services/clinical-store";
import { BillingService } from "../services/billing.service";
import type {
  PatientAllergy,
  ClinicalAttachment,
  OpdConsultationRecord,
  Invoice,
  InvoiceItem,
} from "../types/hms";

describe("OPD Doctor Consultation & Clinical Desk Engine Tests", () => {
  describe("Screenshot Queue & Patient Verification", () => {
    it("should find all 5 seeded patients from the Healthray screenshot", () => {
      const appointments = clinicalStore.getSnapshot().appointments;
      const patients = clinicalStore.getSnapshot().patients;

      // 1. MR. VIJAY (V189)
      const vijayApt = appointments.find((a) => a.tokenNumber === 189);
      assert.ok(vijayApt);
      assert.equal(vijayApt?.patientName, "MR. VIJAY");
      assert.equal(vijayApt?.patientPhone, "+91 7015511542");
      assert.equal(vijayApt?.appointmentDate, "2026-11-16");

      const vijayPat = patients.find((p) => p.id === "pat-vijay-189");
      assert.ok(vijayPat);
      assert.equal(vijayPat?.age, 22);
      assert.equal(vijayPat?.gender, "male");

      // 2. MS. SREYA SANGHAI (V188)
      const sreyaApt = appointments.find((a) => a.tokenNumber === 188);
      assert.ok(sreyaApt);
      assert.equal(sreyaApt?.patientName, "MS. SREYA SANGHAI");
      assert.equal(sreyaApt?.patientPhone, "+91 9773721991");

      // 3. MR. VIMAL PANDE (V187)
      const vimalApt = appointments.find((a) => a.tokenNumber === 187);
      assert.ok(vimalApt);
      assert.equal(vimalApt?.patientName, "MR. VIMAL PANDE");
      assert.equal(vimalApt?.patientPhone, "+91 9971583332");

      // 4. MR. KUSHAGRA SRIVASTAVA (V186)
      const kushagraApt = appointments.find((a) => a.tokenNumber === 186);
      assert.ok(kushagraApt);
      assert.equal(kushagraApt?.patientName, "MR. KUSHAGRA SRIVASTAVA");
      assert.equal(kushagraApt?.patientPhone, "+91 8919362051");

      // 5. MASTER ASHDIK (V185)
      const ashdikApt = appointments.find((a) => a.tokenNumber === 185);
      assert.ok(ashdikApt);
      assert.ok(ashdikApt.patientName && ashdikApt.patientName.toUpperCase().includes("ASHDIK"));
    });
  });

  describe("Patient Allergy Management", () => {
    it("should retrieve pre-seeded allergies for Mr. Vijay", () => {
      const allergies = clinicalStore.getSnapshot().patientAllergies;
      const vijayAllergies = allergies.filter((a) => a.patientId === "pat-vijay-189");
      assert.ok(vijayAllergies.length >= 2);

      const sulfa = vijayAllergies.find((a) => a.allergen.includes("Sulfa"));
      assert.ok(sulfa);
      assert.equal(sulfa?.severity, "moderate");
      assert.equal(sulfa?.allergyType, "drug");
    });

    it("should add and remove a patient allergy", () => {
      const initialCount = clinicalStore.getSnapshot().patientAllergies.length;
      const newAllergy: PatientAllergy = {
        id: "allg-unit-test",
        patientId: "pat-vijay-189",
        allergyType: "contact",
        allergen: "Latex Rubber Gloves",
        severity: "mild",
        reaction: "Contact dermatitis and erythema",
        onsetDate: "2026-05-01",
        createdAt: new Date().toISOString(),
      };

      clinicalStore.addPatientAllergy(newAllergy);
      assert.equal(clinicalStore.getSnapshot().patientAllergies.length, initialCount + 1);

      const stored = clinicalStore.getSnapshot().patientAllergies.find((a) => a.id === "allg-unit-test");
      assert.ok(stored);
      assert.equal(stored?.allergen, "Latex Rubber Gloves");

      // Remove allergy
      clinicalStore.removePatientAllergy("allg-unit-test");
      assert.equal(clinicalStore.getSnapshot().patientAllergies.length, initialCount);
      assert.equal(
        clinicalStore.getSnapshot().patientAllergies.find((a) => a.id === "allg-unit-test"),
        undefined
      );
    });
  });

  describe("Clinical Attachments Tray Management", () => {
    it("should add, retrieve, and remove clinical documents", () => {
      const initialCount = clinicalStore.getSnapshot().clinicalAttachments.length;
      const attachment: ClinicalAttachment = {
        id: "att-unit-1",
        appointmentId: "apt-v189",
        patientId: "pat-vijay-189",
        fileName: "Corneal_Pentacam_Scan.pdf",
        fileSize: 1024 * 480,
        fileType: "application/pdf",
        fileUrl: "/placeholder-scan.png",
        category: "radiology",
        notes: "Left eye cornea normal K1 K2",
        uploadedAt: new Date().toISOString(),
      };

      clinicalStore.addClinicalAttachment(attachment);
      assert.equal(clinicalStore.getSnapshot().clinicalAttachments.length, initialCount + 1);

      const found = clinicalStore.getSnapshot().clinicalAttachments.find((a) => a.id === "att-unit-1");
      assert.ok(found);
      assert.equal(found?.fileName, "Corneal_Pentacam_Scan.pdf");
      assert.equal(found?.category, "radiology");

      // Remove attachment
      clinicalStore.removeClinicalAttachment("att-unit-1");
      assert.equal(clinicalStore.getSnapshot().clinicalAttachments.length, initialCount);
      assert.equal(
        clinicalStore.getSnapshot().clinicalAttachments.find((a) => a.id === "att-unit-1"),
        undefined
      );
    });
  });

  describe("OPD Consultation Lifecycle (Draft & Complete)", () => {
    it("should save consultation draft in clinicalStore", () => {
      const draftRecord: OpdConsultationRecord = {
        id: "opd-draft-test",
        appointmentId: "apt-v189",
        patientId: "pat-vijay-189",
        doctorId: "doc-1",
        doctorName: "Dr. Rajeev Prasad",
        consultationDate: "2026-11-16",
        chiefComplaints: "Blurry distance vision and asthenopia",
        symptomsDuration: "2 weeks",
        clinicalHistoryChips: ["No prior ocular surgery"],
        vitals: {
          patientId: "pat-vijay-189",
          recordedAt: new Date().toISOString(),
          systolicBp: 122,
          diastolicBp: 80,
          pulseRate: 74,
          spo2: 99,
          temperature: 98.4,
          heightCm: 172,
          weightKg: 68,
        },
        diagnoses: [
          {
            icdCode: "H52.13",
            description: "Myopia, bilateral (Simple Myopia)",
            type: "final",
          },
        ],
        prescriptions: [
          {
            id: "rx-unit-1",
            medicineName: "Carboxymethylcellulose 0.5% Drops",
            dosage: "1 drop",
            frequency: "1-1-1",
            timing: "with_food",
            durationDays: 30,
            instructions: "Instill in both eyes",
            quantity: 1,
          },
        ],
        investigations: [
          {
            id: "inv-1",
            testName: "Fundus Photo & Retinal Imaging",
            category: "ocular",
            status: "ordered",
            orderedAt: new Date().toISOString(),
          },
        ],
        clinicalAdvice: ["Follow 20-20-20 rule"],
        followUpDays: 14,
        doctorNotes: "OD 6/6 with -1.50 DS, OS 6/6 with -1.75 DS",
        isDraft: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      clinicalStore.saveConsultationDraft(draftRecord);
      const saved = clinicalStore.getSnapshot().opdConsultations["apt-v189"];
      assert.ok(saved);
      assert.equal(saved.isDraft, true);
      assert.equal(saved.chiefComplaints, "Blurry distance vision and asthenopia");
      assert.equal(saved.prescriptions.length, 1);
    });

    it("should complete consultation and transition appointment to completed", () => {
      const aptId = "apt-v186";
      const completeRecord: OpdConsultationRecord = {
        id: `opd-${aptId}`,
        appointmentId: aptId,
        patientId: "pat-kushagra-186",
        doctorId: "doc-1",
        doctorName: "Dr. Rajeev Prasad",
        consultationDate: "2026-11-16",
        chiefComplaints: "Headaches while coding",
        clinicalHistoryChips: [],
        vitals: {
          patientId: "pat-kushagra-186",
          recordedAt: new Date().toISOString(),
          systolicBp: 120,
          diastolicBp: 80,
        },
        diagnoses: [
          {
            icdCode: "H52.20",
            description: "Unspecified astigmatism",
            type: "final",
          },
        ],
        prescriptions: [],
        investigations: [],
        clinicalAdvice: ["Refraction glasses prescribed"],
        isDraft: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      clinicalStore.completeOpdConsultation(completeRecord);

      const saved = clinicalStore.getSnapshot().opdConsultations[aptId];
      assert.ok(saved);
      assert.equal(saved.isDraft, false);
      assert.ok(saved.completedAt);

      const apt = clinicalStore.getSnapshot().appointments.find((a) => a.id === aptId);
      assert.equal(apt?.status, "completed");
    });
  });

  describe("OPD Billing Calculations & Thermal Slip", () => {
    it("should calculate OPD bill with consultation fee and procedure", () => {
      const items: InvoiceItem[] = [
        {
          id: "item-1",
          description: "OPD Consultation - Dr. Rajeev Prasad",
          category: "consultation",
          quantity: 1,
          unitPrice: 500,
          gstRate: 0,
          amount: 500,
        },
        {
          id: "item-2",
          description: "Refraction & Vision Assessment",
          category: "procedure",
          quantity: 1,
          unitPrice: 300,
          gstRate: 0,
          amount: 300,
        },
      ];

      const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      assert.equal(subtotal, 800);

      const discountPercent = 10;
      const discountTotal = (subtotal * discountPercent) / 100;
      assert.equal(discountTotal, 80);

      const grandTotal = subtotal - discountTotal;
      assert.equal(grandTotal, 720);

      const sampleInvoice: Invoice = {
        id: "inv-opd-test",
        invoiceNumber: "INV-2026-8888",
        organizationId: "org-apex-001",
        branchId: "br-main-001",
        patientId: "pat-vijay-189",
        patientName: "MR. VIJAY",
        patientPhone: "+91 7015511542",
        invoiceType: "opd",
        items,
        subtotal,
        taxTotal: 0,
        discountTotal,
        grandTotal,
        amountPaid: 720,
        balanceDue: 0,
        paymentStatus: "paid",
        paymentMode: "cash",
        createdAt: new Date().toISOString(),
      };

      clinicalStore.addInvoice(sampleInvoice);
      const inStore = clinicalStore.getSnapshot().invoices.find((i) => i.id === "inv-opd-test");
      assert.ok(inStore);
      assert.equal(inStore?.grandTotal, 720);
      assert.equal(inStore?.paymentStatus, "paid");

      // Verify thermal text output
      const thermalText = BillingService.generateThermalReceiptText(
        "Visual Eyez Eye Care Hospital",
        sampleInvoice,
        "+91 9871900034"
      );
      assert.ok(thermalText.toUpperCase().includes("VISUAL EYEZ"));
      assert.ok(thermalText.includes("MR. VIJAY"));
      assert.ok(thermalText.includes("720"));
    });
  });
});
