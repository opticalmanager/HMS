import Dexie, { Table } from "dexie";
import type { Patient, VitalRecord, PrescriptionItem, DiagnosisEntry } from "@/types/hms";

export interface OfflineConsultationDraft {
  id: string; // Temporary local UUID
  patientId: string;
  patientUhid: string;
  patientName: string;
  doctorId: string;
  consultationDate: string;
  vitals?: VitalRecord;
  chiefComplaints: string[];
  diagnoses: DiagnosisEntry[];
  prescriptions: PrescriptionItem[];
  labInvestigations: string[];
  notes?: string;
  syncStatus: "pending" | "synced" | "failed";
  createdAt: number;
}

export interface OfflineTokenEntry {
  id: string;
  tokenNumber: number;
  patientId: string;
  patientName: string;
  department: string;
  doctorId: string;
  status: string;
  timestamp: number;
}

export class HmsOfflineDatabase extends Dexie {
  patients!: Table<Patient, string>;
  consultationsQueue!: Table<OfflineConsultationDraft, string>;
  tokensQueue!: Table<OfflineTokenEntry, string>;

  constructor() {
    super("HmsClinicalOfflineDb");

    this.version(1).stores({
      patients: "id, uhid, phone, fullName, organizationId",
      consultationsQueue: "id, patientId, doctorId, syncStatus, createdAt",
      tokensQueue: "id, tokenNumber, doctorId, status, timestamp",
    });
  }
}

export const offlineDb = typeof window !== "undefined" ? new HmsOfflineDatabase() : null;
