import { formatSequenceNumber } from "@/utils/document-series";
import type { Appointment, AppointmentPriority } from "@/types/hms";

export interface BookAppointmentInput {
  organizationId: string;
  branchId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientUhid: string;
  doctorId: string;
  doctorName: string;
  department: string;
  appointmentDate: string; // YYYY-MM-DD
  timeSlot: string; // HH:mm
  priority?: AppointmentPriority;
  chiefComplaints?: string;
  consultationFee: number;
}

export class AppointmentService {
  /**
   * Generates next token number for a given doctor on a given date
   */
  static generateNextToken(currentDailyCount: number): number {
    return currentDailyCount + 1;
  }

  /**
   * Validates and structures an appointment booking record
   */
  static createAppointmentRecord(
    input: BookAppointmentInput,
    currentTokenCount: number
  ): Appointment {
    const token = this.generateNextToken(currentTokenCount);

    return {
      id: `apt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      organizationId: input.organizationId,
      branchId: input.branchId,
      patientId: input.patientId,
      patientName: input.patientName,
      patientPhone: input.patientPhone,
      patientUhid: input.patientUhid,
      doctorId: input.doctorId,
      doctorName: input.doctorName,
      department: input.department,
      tokenNumber: token,
      appointmentDate: input.appointmentDate,
      timeSlot: input.timeSlot,
      status: "scheduled",
      priority: input.priority || "normal",
      chiefComplaints: input.chiefComplaints,
      consultationFee: input.consultationFee,
      isPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Formats token for live display board and thermal receipt
   */
  static formatTokenLabel(tokenNumber: number): string {
    return formatSequenceNumber("TKN", tokenNumber);
  }

  /**
   * Checks if a doctor's slot is blocked by lunch, OT, or leave
   * Accepts either (blocks, doctorId, date, timeSlot) or (doctorId, date, timeSlot, blocks)
   */
  static isSlotBlocked(
    arg1: any,
    arg2: any,
    arg3: any,
    arg4?: any
  ): { isBlocked: boolean; reason?: string } {
    let blocks: Array<{ doctorId: string; startDate: string; endDate: string; startTime?: string; endTime?: string; reason: string }> = [];
    let doctorId = "";
    let date = "";
    let timeSlot = "";

    if (Array.isArray(arg1)) {
      blocks = arg1;
      doctorId = arg2;
      date = arg3;
      timeSlot = arg4 || "";
    } else {
      doctorId = arg1;
      date = arg2;
      timeSlot = arg3;
      blocks = arg4 || [];
    }

    const parseToMinutes = (timeStr: string): number => {
      if (!timeStr) return -1;
      const clean = timeStr.trim().toUpperCase();
      const isPm = clean.includes("PM");
      const isAm = clean.includes("AM");
      const timePart = clean.replace(/[AP]M/, "").trim();
      const [hStr, mStr] = timePart.split(":");
      let h = parseInt(hStr, 10);
      const m = parseInt(mStr || "0", 10);
      if (isNaN(h)) return -1;
      if (isPm && h < 12) h += 12;
      if (isAm && h === 12) h = 0;
      return h * 60 + m;
    };

    const slotMins = parseToMinutes(timeSlot);

    for (const b of blocks) {
      if (b.doctorId === "all" || b.doctorId === doctorId) {
        if (date >= b.startDate && date <= b.endDate) {
          if (!b.startTime && !b.endTime) {
            return { isBlocked: true, reason: b.reason };
          }
          if (b.startTime && b.endTime) {
            const startMins = parseToMinutes(b.startTime);
            const endMins = parseToMinutes(b.endTime);
            if (slotMins >= startMins && slotMins <= endMins) {
              return { isBlocked: true, reason: b.reason };
            }
          }
        }
      }
    }
    return { isBlocked: false };
  }

  /**
   * Generates time slots for a given start and end time with custom interval
   * Accepts numbers or strings ("09:00", "11:00")
   */
  static generateTimeSlots(
    start: number | string = 8,
    end: number | string = 20,
    intervalMins: number = 15
  ): string[] {
    let startHour: number;
    let startMin = 0;
    let endHour: number;
    let endMin = 0;

    if (typeof start === "string") {
      const [h, m] = start.split(":").map(Number);
      startHour = h;
      startMin = m || 0;
    } else {
      startHour = start;
    }

    if (typeof end === "string") {
      const [h, m] = end.split(":").map(Number);
      endHour = h;
      endMin = m || 0;
    } else {
      endHour = end;
    }

    const startTotal = startHour * 60 + startMin;
    const endTotal = endHour * 60 + endMin;

    const slots: string[] = [];
    for (let t = startTotal; t < endTotal; t += intervalMins) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      const period = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const displayM = m.toString().padStart(2, "0");
      slots.push(`${displayH.toString().padStart(2, "0")}:${displayM} ${period}`);
    }
    return slots;
  }
}
