import { formatSequenceNumber } from "@/utils/document-series";
import type { IpdAdmission, Bed } from "@/types/hms";

export interface IpdAdmissionInput {
  organizationId: string;
  branchId: string;
  patientId: string;
  primaryDoctorId: string;
  wardId: string;
  bedId: string;
  admissionReason: string;
  expectedDischargeDate?: string;
  advanceDepositPaid?: number;
}

export class IpdService {
  /**
   * Generates a new IPD admission
   */
  static admitPatient(input: IpdAdmissionInput, sequenceCounter: number): IpdAdmission {
    return {
      id: formatSequenceNumber("IPD", sequenceCounter),
      admissionNumber: formatSequenceNumber("IPD", sequenceCounter),
      organizationId: input.organizationId,
      branchId: input.branchId,
      patientId: input.patientId,
      primaryDoctorId: input.primaryDoctorId,
      wardId: input.wardId,
      bedId: input.bedId,
      admissionDate: new Date().toISOString().split("T")[0],
      expectedDischargeDate: input.expectedDischargeDate,
      status: "admitted",
      admissionReason: input.admissionReason,
      totalAdvancePaid: input.advanceDepositPaid || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculates ward bed occupancy statistics
   */
  static calculateOccupancy(bedsList: Bed[]): {
    total: number;
    occupied: number;
    available: number;
    occupancyRatePercent: number;
  } {
    const total = bedsList.length;
    if (total === 0) return { total: 0, occupied: 0, available: 0, occupancyRatePercent: 0 };

    const occupied = bedsList.filter((b) => b.status === "occupied").length;
    const available = bedsList.filter((b) => b.status === "available").length;
    const occupancyRatePercent = Number(((occupied / total) * 100).toFixed(1));

    return { total, occupied, available, occupancyRatePercent };
  }
}
