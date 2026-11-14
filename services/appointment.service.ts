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
}
