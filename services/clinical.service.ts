import { formatSequenceNumber } from "@/utils/document-series";
import { evaluateVital, calculateBmi } from "@/types/vitals";
import type { OpdConsultation, VitalRecord, PrescriptionItem, DiagnosisEntry } from "@/types/hms";

export interface CreateConsultationInput {
  organizationId: string;
  branchId: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  vitals?: VitalRecord;
  chiefComplaints: string[];
  historyOfPresentIllness?: string;
  clinicalFindings?: string;
  diagnoses: DiagnosisEntry[];
  prescriptions: PrescriptionItem[];
  labInvestigationsRecommended?: string[];
  advice?: string;
  followUpDate?: string;
}

export class ClinicalService {
  /**
   * Evaluates patient vitals and flags any anomalies
   */
  static processVitals(vitals: VitalRecord): VitalRecord & {
    bpStatus: string;
    pulseStatus: string;
    spo2Status: string;
    tempStatus: string;
    bmiInfo: { bmi: number; category: string };
  } {
    const bpStatus = vitals.systolicBp ? evaluateVital("systolicBp", vitals.systolicBp) : "normal";
    const pulseStatus = vitals.pulseRate ? evaluateVital("pulseRate", vitals.pulseRate) : "normal";
    const spo2Status = vitals.spo2 ? evaluateVital("spo2", vitals.spo2) : "normal";
    const tempStatus = vitals.temperature ? evaluateVital("temperature", vitals.temperature) : "normal";

    const bmiInfo = calculateBmi(vitals.weightKg || 0, vitals.heightCm || 0);

    return {
      ...vitals,
      bmi: bmiInfo.bmi,
      bpStatus,
      pulseStatus,
      spo2Status,
      tempStatus,
      bmiInfo,
    };
  }

  /**
   * Creates an OPD consultation record with a formal sequential number
   */
  static buildConsultation(
    input: CreateConsultationInput,
    sequenceCounter: number
  ): OpdConsultation {
    return {
      id: formatSequenceNumber("OPD", sequenceCounter),
      organizationId: input.organizationId,
      branchId: input.branchId,
      patientId: input.patientId,
      doctorId: input.doctorId,
      appointmentId: input.appointmentId,
      consultationDate: new Date().toISOString().split("T")[0],
      vitals: input.vitals,
      chiefComplaints: input.chiefComplaints,
      historyOfPresentIllness: input.historyOfPresentIllness,
      clinicalFindings: input.clinicalFindings,
      diagnoses: input.diagnoses,
      prescriptions: input.prescriptions,
      labInvestigationsRecommended: input.labInvestigationsRecommended || [],
      advice: input.advice,
      followUpDate: input.followUpDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
