import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { clinicalStore } from "../services/clinical-store";
import { AppointmentService } from "../services/appointment.service";
import type { DoctorBlock, DoctorWeeklySchedule, Appointment } from "../types/hms";

describe("Appointment & Calendar Engine Tests", () => {
  beforeEach(() => {
    clinicalStore.seedDemoData();
  });
  describe("Doctor Break & Slot Blocking Logic", () => {
    it("should detect when a slot falls within a doctor block range", () => {
      const sampleBlock: DoctorBlock = {
        id: "block-test-1",
        doctorId: "doc-1",
        doctorName: "Dr. Gaurav Kumar",
        startDate: "2026-11-14",
        endDate: "2026-11-14",
        startTime: "13:00",
        endTime: "14:00",
        reason: "Lunch & Academic Rounds",
        blockType: "break",
        createdAt: "2026-11-14T08:00:00Z",
      };

      const blocks = [sampleBlock];

      // Slot at 01:30 PM (13:30) is inside 13:00 - 14:00
      const resInside = AppointmentService.isSlotBlocked("doc-1", "2026-11-14", "01:30 PM", blocks);
      assert.equal(resInside.isBlocked, true);
      assert.equal(resInside.reason, "Lunch & Academic Rounds");

      // Slot at 10:00 AM (10:00) is outside 13:00 - 14:00
      const resOutside = AppointmentService.isSlotBlocked("doc-1", "2026-11-14", "10:00 AM", blocks);
      assert.equal(resOutside.isBlocked, false);

      // Block applies to all doctors when doctorId is 'all'
      const globalBlock: DoctorBlock = {
        id: "block-global-1",
        doctorId: "all",
        doctorName: "All Hospital Doctors",
        startDate: "2026-11-14",
        endDate: "2026-11-14",
        startTime: "15:00",
        endTime: "16:00",
        reason: "Hospital Accreditation Audit",
        blockType: "meeting",
        createdAt: "2026-11-14T08:00:00Z",
      };

      assert.equal(AppointmentService.isSlotBlocked("doc-2", "2026-11-14", "03:30 PM", [globalBlock]).isBlocked, true);
      assert.equal(AppointmentService.isSlotBlocked("doc-3", "2026-11-14", "03:30 PM", [globalBlock]).isBlocked, true);
    });

    it("should add and remove doctor blocks through clinicalStore", () => {
      const initialCount = clinicalStore.getSnapshot().doctorBlocks.length;

      const newBlock: DoctorBlock = {
        id: "block-new-test",
        doctorId: "doc-3",
        doctorName: "Dr. Rajesh Varma",
        startDate: "2026-11-15",
        endDate: "2026-11-15",
        startTime: "09:00",
        endTime: "12:00",
        reason: "Emergency Knee Arthroscopy",
        blockType: "ot",
        createdAt: new Date().toISOString(),
      };

      clinicalStore.addDoctorBlock(newBlock);
      assert.equal(clinicalStore.getSnapshot().doctorBlocks.length, initialCount + 1);

      const found = clinicalStore.getSnapshot().doctorBlocks.find((b) => b.id === "block-new-test");
      assert.ok(found);
      assert.equal(found?.reason, "Emergency Knee Arthroscopy");

      // Remove the block
      clinicalStore.removeDoctorBlock("block-new-test");
      assert.equal(clinicalStore.getSnapshot().doctorBlocks.length, initialCount);
      assert.equal(clinicalStore.getSnapshot().doctorBlocks.find((b) => b.id === "block-new-test"), undefined);
    });
  });

  describe("Doctor Weekly Schedule & Slot Generation", () => {
    it("should generate proper time slots based on slot duration", () => {
      const slots = AppointmentService.generateTimeSlots("09:00", "11:00", 30);
      assert.deepEqual(slots, ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM"]);
    });

    it("should generate 15-minute intervals when slot duration is 15", () => {
      const slots = AppointmentService.generateTimeSlots("10:00", "11:00", 15);
      assert.equal(slots.length, 4);
      assert.deepEqual(slots, ["10:00 AM", "10:15 AM", "10:30 AM", "10:45 AM"]);
    });

    it("should update doctor weekly schedule in clinicalStore", () => {
      const schedule: DoctorWeeklySchedule = {
        doctorId: "doc-1",
        doctorName: "Dr. Gaurav Kumar",
        department: "Cardiology",
        slotDurationMinutes: 20,
        maxOverbookingSlots: 2,
        days: {
          1: {
            isActive: true,
            morningStart: "09:00",
            morningEnd: "13:00",
            eveningStart: "16:00",
            eveningEnd: "20:00",
          },
        },
      };

      clinicalStore.updateDoctorAvailability(schedule);
      const stored = clinicalStore.getSnapshot().doctorAvailabilities["doc-1"];
      assert.ok(stored);
      assert.equal(stored.slotDurationMinutes, 20);
      assert.equal(stored.days[1].isActive, true);
      assert.equal(stored.days[1].morningStart, "09:00");
    });
  });

  describe("Appointment Lifecycle & Status Transitions", () => {
    it("should create an appointment with sequential token number", () => {
      const newApt = AppointmentService.createAppointmentRecord(
        {
          organizationId: "org-apex-001",
          branchId: "br-main-001",
          patientId: "pat-unit-1",
          patientName: "UnitTest Patient",
          patientPhone: "9876543210",
          patientUhid: "UHID-2026-TEST",
          doctorId: "doc-1",
          doctorName: "Dr. Gaurav Kumar",
          department: "Cardiology",
          appointmentDate: "2026-11-20",
          timeSlot: "11:30 AM",
          priority: "normal",
          chiefComplaints: "Routine test checkup",
          consultationFee: 800,
        },
        500
      );

      assert.equal(newApt.tokenNumber, 501);
      assert.equal(newApt.status, "scheduled");
      assert.equal(newApt.isPaid, false);

      clinicalStore.addAppointment(newApt);
      const inStore = clinicalStore.getSnapshot().appointments.find((a) => a.id === newApt.id);
      assert.ok(inStore);
    });

    it("should transition appointment status through full clinical workflow", () => {
      const aptId = "apt-unit-status";
      const sample: Appointment = {
        id: aptId,
        organizationId: "org-apex-001",
        branchId: "br-main-001",
        patientId: "pat-1",
        patientName: "Status Workflow Patient",
        patientPhone: "9876543210",
        patientUhid: "UHID-2026-STATUS",
        doctorId: "doc-2",
        doctorName: "Dr. Ananya Sharma",
        department: "General Medicine",
        appointmentDate: "2026-11-14",
        timeSlot: "10:30 AM",
        tokenNumber: 999,
        status: "scheduled",
        priority: "normal",
        consultationFee: 500,
        isPaid: false,
        source: "walk_in",
        appointmentType: "new",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      clinicalStore.addAppointment(sample);

      // Check-in (arrived)
      clinicalStore.updateAppointmentStatus(aptId, "arrived");
      assert.equal(clinicalStore.getSnapshot().appointments.find((a) => a.id === aptId)?.status, "arrived");

      // Enter doctor cabin (in_consultation)
      clinicalStore.updateAppointmentStatus(aptId, "in_consultation");
      assert.equal(clinicalStore.getSnapshot().appointments.find((a) => a.id === aptId)?.status, "in_consultation");

      // Complete consultation (completed)
      clinicalStore.updateAppointmentStatus(aptId, "completed");
      assert.equal(clinicalStore.getSnapshot().appointments.find((a) => a.id === aptId)?.status, "completed");
    });

    it("should reschedule an appointment to a new date and time", () => {
      const aptId = "apt-unit-resched";
      const sample: Appointment = {
        id: aptId,
        organizationId: "org-apex-001",
        branchId: "br-main-001",
        patientId: "pat-1",
        patientName: "Reschedule Patient",
        patientPhone: "9876543210",
        patientUhid: "UHID-2026-RESCHED",
        doctorId: "doc-1",
        doctorName: "Dr. Gaurav Kumar",
        department: "Cardiology",
        appointmentDate: "2026-11-14",
        timeSlot: "09:30 AM",
        tokenNumber: 777,
        status: "scheduled",
        priority: "normal",
        consultationFee: 800,
        isPaid: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      clinicalStore.addAppointment(sample);

      clinicalStore.rescheduleAppointment(aptId, "2026-11-18", "04:30 PM");
      const updated = clinicalStore.getSnapshot().appointments.find((a) => a.id === aptId);
      assert.equal(updated?.appointmentDate, "2026-11-18");
      assert.equal(updated?.timeSlot, "04:30 PM");
    });

    it("should cancel an appointment with a reason", () => {
      const aptId = "apt-unit-cancel";
      const sample: Appointment = {
        id: aptId,
        organizationId: "org-apex-001",
        branchId: "br-main-001",
        patientId: "pat-1",
        patientName: "Cancel Patient",
        patientPhone: "9876543210",
        patientUhid: "UHID-2026-CANCEL",
        doctorId: "doc-1",
        doctorName: "Dr. Gaurav Kumar",
        department: "Cardiology",
        appointmentDate: "2026-11-14",
        timeSlot: "02:00 PM",
        tokenNumber: 888,
        status: "scheduled",
        priority: "normal",
        consultationFee: 800,
        isPaid: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      clinicalStore.addAppointment(sample);

      clinicalStore.cancelAppointment(aptId, "Patient travel delay");
      const updated = clinicalStore.getSnapshot().appointments.find((a) => a.id === aptId);
      assert.equal(updated?.status, "cancelled");
      assert.equal(updated?.cancellationReason, "Patient travel delay");
    });
  });

  describe("Screenshot Mock Verification: Nov 14 2026 Master ASHDIK record", () => {
    it("should find the pre-seeded (V185) Master ASHDIK appointment from screenshot", () => {
      const list = clinicalStore.getSnapshot().appointments;
      const ashdik = list.find((a) => a.patientName === "Master ASHDIK");
      assert.ok(ashdik);
      assert.equal(ashdik?.appointmentDate, "2026-11-14");
      assert.equal(ashdik?.source, "sys");
      assert.equal(ashdik?.tokenNumber, 185);
      assert.equal(ashdik?.appointmentType, "new");
    });
  });
});
