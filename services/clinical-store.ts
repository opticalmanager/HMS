"use client";

import { useSyncExternalStore } from "react";
import type {
  Patient,
  Appointment,
  VitalRecord,
  PrescriptionItem,
  DiagnosisEntry,
  OpdConsultation,
  Bed,
  IpdAdmission,
  Invoice,
  InventoryItem,
  DoctorBlock,
  DoctorWeeklySchedule,
  PatientAllergy,
  ClinicalAttachment,
  LabInvestigationOrder,
  OpdConsultationRecord,
} from "@/types/hms";

// --- Clinical Data Model Interfaces ---

export interface CashierShiftDrawer {
  id: string;
  cashierName: string;
  shiftDate: string;
  openedAt: string;
  closedAt?: string;
  openingCashFloat: number;
  cashCollections: number;
  cardCollections: number;
  upiCollections: number;
  cashDrops: number;
  closingCountedCash?: number;
  expectedCashTotal: number;
  variance?: number; // Over / Short
  status: "open" | "closed";
}

export interface NursingMarRecord {
  id: string;
  admissionId: string;
  bedNumber: string;
  patientName: string;
  medicationName: string;
  dosage: string;
  shift: "morning" | "afternoon" | "evening" | "night";
  scheduledTime: string;
  administeredTime?: string;
  administeredBy?: string;
  status: "pending" | "given" | "omitted" | "refused";
  notes?: string;
}

export interface GrnEntry {
  id: string;
  grnNumber: string; // GRN-2026-0001
  supplierName: string;
  supplierInvoiceNumber: string;
  poNumber: string;
  receivedDate: string;
  items: Array<{
    sku: string;
    itemName: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    purchaseRate: number;
    sellingRate: number;
    gstRate: number;
    totalAmount: number;
  }>;
  totalInvoiceAmount: number;
  verifiedBy: string;
}

export interface WhatsAppLogItem {
  id: string;
  recipientPhone: string;
  patientName: string;
  templateName: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  mediaUrl?: string;
  errorReason?: string;
  params: Record<string, string>;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  module: string;
  entity: string;
  ip: string;
  notes: string;
  metadata?: Record<string, unknown>;
}

export interface HospitalSettings {
  hospitalName: string;
  tagline: string;
  registrationNumber: string;
  phone: string;
  email: string;
  address: string;
  stateCode: string;
  gstin: string;
  letterheadConfig: {
    headerLogoUrl?: string;
    topMarginMm: number;
    bottomMarginMm: number;
    footerText: string;
    showQrCode: boolean;
    showDoctorCredentials: boolean;
  };
  documentSequences: {
    uhidPrefix: string;
    opdBillPrefix: string;
    ipdPrefix: string;
    pharmacyPrefix: string;
    invPrefix: string;
  };
  serviceCatalog: Array<{
    id: string;
    serviceCode: string;
    name: string;
    category: "consultation" | "procedure" | "lab_test" | "radiology" | "nursing" | "bed";
    standardRate: number;
    gstRate: number;
  }>;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  license: string;
  qualification: string;
  phone: string;
  status: "active" | "inactive" | "suspended";
}

export type RbacRole =
  | "super_admin"
  | "hospital_admin"
  | "medical_director"
  | "senior_consultant"
  | "junior_resident"
  | "chief_nursing_officer"
  | "staff_nurse"
  | "pharmacist"
  | "chief_cashier"
  | "receptionist"
  | "lab_technician"
  | "radiologist";

export type RbacPermission =
  | "view_phi"
  | "edit_clinical_emr"
  | "prescribe_medications"
  | "ipd_admission_discharge"
  | "dispense_pharmacy"
  | "billing_collections"
  | "issue_discounts"
  | "cancel_invoices"
  | "view_financial_reports"
  | "manage_staff"
  | "system_configuration"
  | "export_audit_logs";

export type RbacMatrix = Record<RbacRole, Record<RbacPermission, boolean>>;

export interface ClinicalStoreState {
  patients: Patient[];
  appointments: Appointment[];
  doctorBlocks: DoctorBlock[];
  doctorAvailabilities: Record<string, DoctorWeeklySchedule>;
  consultations: OpdConsultation[];
  patientAllergies: PatientAllergy[];
  clinicalAttachments: ClinicalAttachment[];
  opdConsultations: Record<string, OpdConsultationRecord>;
  beds: Bed[];
  admissions: IpdAdmission[];
  nursingMar: NursingMarRecord[];
  invoices: Invoice[];
  cashierShift: CashierShiftDrawer;
  inventory: InventoryItem[];
  grnRecords: GrnEntry[];
  whatsappLogs: WhatsAppLogItem[];
  auditLogs: AuditLogItem[];
  settings: HospitalSettings;
  staff: StaffMember[];
  rbacMatrix: RbacMatrix;
}

// --- Initial Realistic Hospital Dataset ---

const INITIAL_DOCTOR_BLOCKS: DoctorBlock[] = [
  {
    id: "blk-1",
    doctorId: "doc-1",
    doctorName: "Dr. Gaurav Kumar",
    startDate: "2026-11-14",
    endDate: "2026-11-14",
    startTime: "01:00 PM",
    endTime: "02:00 PM",
    reason: "lunch",
    notes: "Regular OPD Lunch Break",
    createdAt: "2026-11-14T08:00:00Z",
  },
  {
    id: "blk-2",
    doctorId: "doc-3",
    doctorName: "Dr. Rajesh Varma",
    startDate: "2026-11-14",
    endDate: "2026-11-14",
    startTime: "02:00 PM",
    endTime: "04:30 PM",
    reason: "ot_surgery",
    notes: "Total Knee Replacement OT Procedure",
    createdAt: "2026-11-14T08:00:00Z",
  },
];

const INITIAL_DOCTOR_AVAILABILITIES: Record<string, DoctorWeeklySchedule> = {
  "doc-1": {
    doctorId: "doc-1",
    doctorName: "Dr. Gaurav Kumar",
    department: "Cardiology",
    slotDurationMinutes: 15,
    maxOverbookingSlots: 5,
    days: {
      0: { isActive: false, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
      1: { isActive: true, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
      2: { isActive: true, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
      3: { isActive: true, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
      4: { isActive: true, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
      5: { isActive: true, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
      6: { isActive: true, morningStart: "09:00", morningEnd: "14:00", eveningStart: "16:00", eveningEnd: "18:00" },
    },
  },
  "doc-2": {
    doctorId: "doc-2",
    doctorName: "Dr. Ananya Sharma",
    department: "General Medicine",
    slotDurationMinutes: 15,
    maxOverbookingSlots: 6,
    days: {
      0: { isActive: false, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
      1: { isActive: true, morningStart: "09:30", morningEnd: "13:30", eveningStart: "16:30", eveningEnd: "20:30" },
      2: { isActive: true, morningStart: "09:30", morningEnd: "13:30", eveningStart: "16:30", eveningEnd: "20:30" },
      3: { isActive: true, morningStart: "09:30", morningEnd: "13:30", eveningStart: "16:30", eveningEnd: "20:30" },
      4: { isActive: true, morningStart: "09:30", morningEnd: "13:30", eveningStart: "16:30", eveningEnd: "20:30" },
      5: { isActive: true, morningStart: "09:30", morningEnd: "13:30", eveningStart: "16:30", eveningEnd: "20:30" },
      6: { isActive: true, morningStart: "09:30", morningEnd: "14:00", eveningStart: "16:00", eveningEnd: "19:00" },
    },
  },
  "doc-3": {
    doctorId: "doc-3",
    doctorName: "Dr. Rajesh Varma",
    department: "Orthopedics",
    slotDurationMinutes: 20,
    maxOverbookingSlots: 4,
    days: {
      0: { isActive: false, morningStart: "10:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "19:00" },
      1: { isActive: true, morningStart: "10:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "19:00" },
      2: { isActive: true, morningStart: "10:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "19:00" },
      3: { isActive: true, morningStart: "10:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "19:00" },
      4: { isActive: true, morningStart: "10:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "19:00" },
      5: { isActive: true, morningStart: "10:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "19:00" },
      6: { isActive: true, morningStart: "10:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "18:00" },
    },
  },
  // Alias keys matching StaffMember id (usr-1, usr-2, usr-3) for consistent lookup
  "usr-1": {
    doctorId: "usr-1",
    doctorName: "Dr. Gaurav Kumar",
    department: "Cardiology",
    slotDurationMinutes: 15,
    maxOverbookingSlots: 5,
    days: {
      0: { isActive: false, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
      1: { isActive: true, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
      2: { isActive: true, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
      3: { isActive: true, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
      4: { isActive: true, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
      5: { isActive: true, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
      6: { isActive: true, morningStart: "09:00", morningEnd: "14:00", eveningStart: "16:00", eveningEnd: "18:00" },
    },
  },
  "usr-2": {
    doctorId: "usr-2",
    doctorName: "Dr. Ananya Sharma",
    department: "General Medicine",
    slotDurationMinutes: 15,
    maxOverbookingSlots: 6,
    days: {
      0: { isActive: false, morningStart: "09:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "20:00" },
      1: { isActive: true, morningStart: "09:30", morningEnd: "13:30", eveningStart: "16:30", eveningEnd: "20:30" },
      2: { isActive: true, morningStart: "09:30", morningEnd: "13:30", eveningStart: "16:30", eveningEnd: "20:30" },
      3: { isActive: true, morningStart: "09:30", morningEnd: "13:30", eveningStart: "16:30", eveningEnd: "20:30" },
      4: { isActive: true, morningStart: "09:30", morningEnd: "13:30", eveningStart: "16:30", eveningEnd: "20:30" },
      5: { isActive: true, morningStart: "09:30", morningEnd: "13:30", eveningStart: "16:30", eveningEnd: "20:30" },
      6: { isActive: true, morningStart: "09:30", morningEnd: "14:00", eveningStart: "16:00", eveningEnd: "19:00" },
    },
  },
  "usr-3": {
    doctorId: "usr-3",
    doctorName: "Dr. Rajesh Varma",
    department: "Orthopedics",
    slotDurationMinutes: 20,
    maxOverbookingSlots: 4,
    days: {
      0: { isActive: false, morningStart: "10:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "19:00" },
      1: { isActive: true, morningStart: "10:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "19:00" },
      2: { isActive: true, morningStart: "10:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "19:00" },
      3: { isActive: true, morningStart: "10:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "19:00" },
      4: { isActive: true, morningStart: "10:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "19:00" },
      5: { isActive: true, morningStart: "10:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "19:00" },
      6: { isActive: true, morningStart: "10:00", morningEnd: "13:00", eveningStart: "16:00", eveningEnd: "18:00" },
    },
  },
};

const INITIAL_PATIENTS: Patient[] = [
  {
    id: "pat-1",
    uhid: "UHID-2026-0041",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    fullName: "Ramesh Patel",
    gender: "male",
    age: 52,
    dateOfBirth: "1974-05-12",
    phone: "9823012345",
    email: "ramesh.patel@example.com",
    address: "B-402, Sunshine Heights, Senapati Bapat Road, Pune",
    city: "Pune",
    pincode: "411016",
    bloodGroup: "B+",
    emergencyContactName: "Kavita Patel (Spouse)",
    emergencyContactPhone: "9823012346",
    abhaId: "91-8842-1920-3341",
    abhaAddress: "ramesh.patel@sbx",
    allergies: ["Penicillin", "Sulfa Drugs"],
    chronicConditions: ["Hypertension", "Dyslipidemia"],
    createdAt: "2026-11-10T08:30:00Z",
    updatedAt: "2026-11-14T10:00:00Z",
  },
  {
    id: "pat-2",
    uhid: "UHID-2026-0042",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    fullName: "Sunita Roy",
    gender: "female",
    age: 38,
    dateOfBirth: "1988-08-22",
    phone: "9823098765",
    email: "sunita.roy@example.com",
    address: "Flat 12, Lotus Apartments, Aundh, Pune",
    city: "Pune",
    pincode: "411007",
    bloodGroup: "O+",
    emergencyContactName: "Amit Roy (Brother)",
    emergencyContactPhone: "9823098760",
    abhaId: "91-4521-7788-9900",
    abhaAddress: "sunita.roy@sbx",
    allergies: ["None"],
    chronicConditions: ["Type 2 Diabetes"],
    createdAt: "2026-11-12T09:15:00Z",
    updatedAt: "2026-11-14T10:15:00Z",
  },
  {
    id: "pat-3",
    uhid: "UHID-2026-0043",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    fullName: "Vikram Singh",
    gender: "male",
    age: 45,
    dateOfBirth: "1981-02-14",
    phone: "9876543210",
    email: "vikram.singh@example.com",
    address: "Sector 14, Hinjewadi Phase 1, Pune",
    city: "Pune",
    pincode: "411057",
    bloodGroup: "A+",
    emergencyContactName: "Sita Singh (Wife)",
    emergencyContactPhone: "9876543211",
    abhaId: "91-6623-1092-8812",
    abhaAddress: "vikram.singh@sbx",
    allergies: ["Aspirin"],
    chronicConditions: ["Asthma"],
    createdAt: "2026-11-13T11:00:00Z",
    updatedAt: "2026-11-14T10:30:00Z",
  },
  {
    id: "pat-4",
    uhid: "UHID-2026-0044",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    fullName: "Pooja Mehta",
    gender: "female",
    age: 29,
    dateOfBirth: "1997-11-04",
    phone: "9811223344",
    email: "pooja.mehta@example.com",
    address: "Row House 7, Kalyani Nagar, Pune",
    city: "Pune",
    pincode: "411006",
    bloodGroup: "AB+",
    emergencyContactName: "Rajesh Mehta (Father)",
    emergencyContactPhone: "9811223345",
    allergies: ["None"],
    chronicConditions: ["None"],
    createdAt: "2026-11-14T08:00:00Z",
    updatedAt: "2026-11-14T08:00:00Z",
  },
  {
    id: "pat-5",
    uhid: "UHID-2026-0045",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    fullName: "Aakash Mehta",
    gender: "male",
    age: 61,
    dateOfBirth: "1965-03-19",
    phone: "9899001122",
    address: "Flat 501, Orchid Enclave, Kothrud, Pune",
    city: "Pune",
    pincode: "411038",
    bloodGroup: "O-",
    allergies: ["NSAIDs"],
    chronicConditions: ["Coronary Artery Disease", "Hypertension"],
    createdAt: "2026-11-10T14:20:00Z",
    updatedAt: "2026-11-14T09:00:00Z",
  },
  {
    id: "pat-vijay-189",
    uhid: "UHID-2026-0189",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    fullName: "MR. VIJAY",
    gender: "male",
    age: 22,
    dateOfBirth: "2004-03-15",
    phone: "+91 7015511542",
    city: "New Delhi",
    pincode: "110024",
    bloodGroup: "B+",
    allergies: ["Sulfa Drugs"],
    chronicConditions: ["Myopia (Bilateral)"],
    createdAt: "2026-11-14T08:00:00Z",
    updatedAt: "2026-11-14T08:00:00Z",
  },
  {
    id: "pat-sreya-188",
    uhid: "UHID-2026-0188",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    fullName: "MS. SREYA SANGHAI",
    gender: "female",
    age: 24,
    dateOfBirth: "2002-07-21",
    phone: "+91 9773721991",
    city: "New Delhi",
    pincode: "110024",
    bloodGroup: "O+",
    allergies: ["Penicillin"],
    chronicConditions: [],
    createdAt: "2026-11-14T08:30:00Z",
    updatedAt: "2026-11-14T08:30:00Z",
  },
  {
    id: "pat-vimal-187",
    uhid: "UHID-2026-0187",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    fullName: "MR. VIMAL PANDE",
    gender: "male",
    age: 63,
    dateOfBirth: "1963-10-10",
    phone: "+91 9971583332",
    city: "New Delhi",
    pincode: "110024",
    bloodGroup: "A+",
    allergies: ["Aspirin"],
    chronicConditions: ["Hypertension", "Presbyopia"],
    createdAt: "2026-11-14T09:00:00Z",
    updatedAt: "2026-11-14T09:00:00Z",
  },
  {
    id: "pat-kushagra-186",
    uhid: "UHID-2026-0186",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    fullName: "MR. KUSHAGRA SRIVASTAVA",
    gender: "male",
    age: 27,
    dateOfBirth: "1999-05-04",
    phone: "+91 8919362051",
    city: "New Delhi",
    pincode: "110024",
    bloodGroup: "B+",
    allergies: [],
    chronicConditions: ["Astigmatism"],
    createdAt: "2026-11-14T09:30:00Z",
    updatedAt: "2026-11-14T09:30:00Z",
  },
  {
    id: "pat-ashdik",
    uhid: "UHID-2026-0185",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    fullName: "MASTER ASHDIK",
    gender: "male",
    age: 5,
    dateOfBirth: "2021-08-14",
    phone: "+91 6395850199",
    city: "New Delhi",
    pincode: "110024",
    bloodGroup: "O+",
    allergies: [],
    chronicConditions: ["Amblyopia Screening"],
    createdAt: "2026-11-14T10:00:00Z",
    updatedAt: "2026-11-14T10:00:00Z",
  },
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: "apt-104",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-1",
    patientName: "Ramesh Patel",
    patientPhone: "9823012345",
    patientUhid: "UHID-2026-0041",
    doctorId: "doc-1",
    doctorName: "Dr. Gaurav Kumar",
    department: "Cardiology",
    tokenNumber: 104,
    appointmentDate: "2026-11-14",
    timeSlot: "10:15 AM",
    status: "in_consultation",
    priority: "urgent",
    chiefComplaints: "Chest heaviness and dyspnea on exertion for 1 week",
    consultationFee: 800,
    isPaid: true,
    createdAt: "2026-11-14T08:30:00Z",
    updatedAt: "2026-11-14T10:15:00Z",
  },
  {
    id: "apt-105",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-2",
    patientName: "Sunita Roy",
    patientPhone: "9823098765",
    patientUhid: "UHID-2026-0042",
    doctorId: "doc-2",
    doctorName: "Dr. Ananya Sharma",
    department: "General Medicine",
    tokenNumber: 105,
    appointmentDate: "2026-11-14",
    timeSlot: "10:30 AM",
    status: "arrived",
    priority: "normal",
    chiefComplaints: "High fever with chills and joint pain for 3 days",
    consultationFee: 500,
    isPaid: true,
    createdAt: "2026-11-14T08:45:00Z",
    updatedAt: "2026-11-14T10:00:00Z",
  },
  {
    id: "apt-106",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-3",
    patientName: "Vikram Singh",
    patientPhone: "9876543210",
    patientUhid: "UHID-2026-0043",
    doctorId: "doc-3",
    doctorName: "Dr. Rajesh Varma",
    department: "Orthopedics",
    tokenNumber: 106,
    appointmentDate: "2026-11-14",
    timeSlot: "10:45 AM",
    status: "arrived",
    priority: "emergency",
    chiefComplaints: "Acute right knee trauma after fall, severe swelling",
    consultationFee: 700,
    isPaid: true,
    createdAt: "2026-11-14T09:10:00Z",
    updatedAt: "2026-11-14T10:20:00Z",
  },
  {
    id: "apt-107",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-4",
    patientName: "Pooja Mehta",
    patientPhone: "9811223344",
    patientUhid: "UHID-2026-0044",
    doctorId: "doc-1",
    doctorName: "Dr. Gaurav Kumar",
    department: "Cardiology",
    tokenNumber: 107,
    appointmentDate: "2026-11-14",
    timeSlot: "11:00 AM",
    status: "scheduled",
    priority: "normal",
    chiefComplaints: "Routine cardiac evaluation and ECG check",
    consultationFee: 800,
    isPaid: false,
    createdAt: "2026-11-14T09:30:00Z",
    updatedAt: "2026-11-14T09:30:00Z",
  },
  {
    id: "apt-v189",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-vijay-189",
    patientName: "MR. VIJAY",
    patientPhone: "+91 7015511542",
    patientUhid: "UHID-2026-0189",
    doctorId: "doc-1",
    doctorName: "Dr. Rajeev Prasad",
    department: "Optometry & Eye Care",
    tokenNumber: 189,
    appointmentDate: "2026-11-16",
    timeSlot: "01:00 PM",
    status: "in_consultation",
    priority: "normal",
    source: "sys",
    appointmentType: "new",
    chiefComplaints: "Blurry distance vision, ocular strain with screen work",
    consultationFee: 500,
    isPaid: true,
    notes: "New Appointment - Lajpatnagar [Walk-In / Confirmed]",
    createdAt: "2026-11-14T08:00:00Z",
    updatedAt: "2026-11-14T08:00:00Z",
  },
  {
    id: "apt-v188",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-sreya-188",
    patientName: "MS. SREYA SANGHAI",
    patientPhone: "+91 9773721991",
    patientUhid: "UHID-2026-0188",
    doctorId: "doc-1",
    doctorName: "Dr. Rajeev Prasad",
    department: "Optometry & Eye Care",
    tokenNumber: 188,
    appointmentDate: "2026-11-16",
    timeSlot: "01:30 PM",
    status: "arrived",
    priority: "normal",
    source: "sys",
    appointmentType: "new",
    chiefComplaints: "Contact lens irritation & dry eye symptoms",
    consultationFee: 500,
    isPaid: true,
    notes: "Walk-In / Confirmed",
    createdAt: "2026-11-14T08:30:00Z",
    updatedAt: "2026-11-14T08:30:00Z",
  },
  {
    id: "apt-v187",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-vimal-187",
    patientName: "MR. VIMAL PANDE",
    patientPhone: "+91 9971583332",
    patientUhid: "UHID-2026-0187",
    doctorId: "doc-1",
    doctorName: "Dr. Rajeev Prasad",
    department: "Optometry & Eye Care",
    tokenNumber: 187,
    appointmentDate: "2026-11-16",
    timeSlot: "02:00 PM",
    status: "arrived",
    priority: "normal",
    source: "sys",
    appointmentType: "new",
    chiefComplaints: "Near vision blurring, reading difficulty (Presbyopia check)",
    consultationFee: 500,
    isPaid: true,
    notes: "Walk-In / Confirmed",
    createdAt: "2026-11-14T09:00:00Z",
    updatedAt: "2026-11-14T09:00:00Z",
  },
  {
    id: "apt-v186",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-kushagra-186",
    patientName: "MR. KUSHAGRA SRIVASTAVA",
    patientPhone: "+91 8919362051",
    patientUhid: "UHID-2026-0186",
    doctorId: "doc-1",
    doctorName: "Dr. Rajeev Prasad",
    department: "Optometry & Eye Care",
    tokenNumber: 186,
    appointmentDate: "2026-11-16",
    timeSlot: "02:30 PM",
    status: "arrived",
    priority: "normal",
    source: "sys",
    appointmentType: "new",
    chiefComplaints: "Headaches while coding, astigmatism evaluation",
    consultationFee: 500,
    isPaid: true,
    notes: "Walk-In / Confirmed",
    createdAt: "2026-11-14T09:30:00Z",
    updatedAt: "2026-11-14T09:30:00Z",
  },
  {
    id: "apt-v185",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-ashdik",
    patientName: "Master ASHDIK",
    patientPhone: "9871900034",
    patientUhid: "UHID-2026-0185",
    doctorId: "doc-1",
    doctorName: "Dr. Gaurav Kumar",
    department: "Pediatrics & Eye Care",
    tokenNumber: 185,
    appointmentDate: "2026-11-14",
    timeSlot: "11:30 AM",
    status: "scheduled",
    priority: "normal",
    source: "sys",
    appointmentType: "new",
    chiefComplaints: "New Appointment - Lajpatnagar",
    consultationFee: 750,
    isPaid: true,
    notes: "Lajpatnagar Center referral",
    createdAt: "2026-11-14T08:00:00Z",
    updatedAt: "2026-11-14T08:00:00Z",
  },
  {
    id: "apt-101",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-1",
    patientName: "Ramesh Patel",
    patientPhone: "9823012345",
    patientUhid: "UHID-2026-0041",
    doctorId: "doc-1",
    doctorName: "Dr. Gaurav Kumar",
    department: "Cardiology",
    tokenNumber: 101,
    appointmentDate: "2026-11-01",
    timeSlot: "09:30 AM",
    status: "completed",
    priority: "normal",
    source: "online",
    consultationFee: 800,
    isPaid: true,
    createdAt: "2026-11-01T08:30:00Z",
    updatedAt: "2026-11-01T10:00:00Z",
  },
  {
    id: "apt-102",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-2",
    patientName: "Sunita Roy",
    patientPhone: "9823098765",
    patientUhid: "UHID-2026-0042",
    doctorId: "doc-2",
    doctorName: "Dr. Ananya Sharma",
    department: "General Medicine",
    tokenNumber: 102,
    appointmentDate: "2026-11-01",
    timeSlot: "10:00 AM",
    status: "completed",
    priority: "normal",
    source: "walk_in",
    consultationFee: 500,
    isPaid: true,
    createdAt: "2026-11-01T08:30:00Z",
    updatedAt: "2026-11-01T10:30:00Z",
  },
  {
    id: "apt-103",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-3",
    patientName: "Vikram Singh",
    patientPhone: "9876543210",
    patientUhid: "UHID-2026-0043",
    doctorId: "doc-3",
    doctorName: "Dr. Rajesh Varma",
    department: "Orthopedics",
    tokenNumber: 103,
    appointmentDate: "2026-11-01",
    timeSlot: "10:30 AM",
    status: "completed",
    priority: "urgent",
    source: "sys",
    consultationFee: 700,
    isPaid: true,
    createdAt: "2026-11-01T08:30:00Z",
    updatedAt: "2026-11-01T11:00:00Z",
  },
  {
    id: "apt-201",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-4",
    patientName: "Pooja Mehta",
    patientPhone: "9811223344",
    patientUhid: "UHID-2026-0044",
    doctorId: "doc-1",
    doctorName: "Dr. Gaurav Kumar",
    department: "Cardiology",
    tokenNumber: 201,
    appointmentDate: "2026-11-02",
    timeSlot: "10:00 AM",
    status: "completed",
    priority: "normal",
    source: "online",
    consultationFee: 800,
    isPaid: true,
    createdAt: "2026-11-02T08:30:00Z",
    updatedAt: "2026-11-02T10:30:00Z",
  },
  {
    id: "apt-202",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-5",
    patientName: "Aakash Mehta",
    patientPhone: "9899001122",
    patientUhid: "UHID-2026-0045",
    doctorId: "doc-1",
    doctorName: "Dr. Gaurav Kumar",
    department: "Cardiology",
    tokenNumber: 202,
    appointmentDate: "2026-11-02",
    timeSlot: "11:00 AM",
    status: "completed",
    priority: "emergency",
    source: "walk_in",
    consultationFee: 800,
    isPaid: true,
    createdAt: "2026-11-02T08:30:00Z",
    updatedAt: "2026-11-02T11:45:00Z",
  },
  {
    id: "apt-401",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-1",
    patientName: "Ramesh Patel",
    patientPhone: "9823012345",
    patientUhid: "UHID-2026-0041",
    doctorId: "doc-2",
    doctorName: "Dr. Ananya Sharma",
    department: "General Medicine",
    tokenNumber: 401,
    appointmentDate: "2026-11-04",
    timeSlot: "09:30 AM",
    status: "completed",
    priority: "normal",
    source: "sys",
    consultationFee: 500,
    isPaid: true,
    createdAt: "2026-11-04T08:30:00Z",
    updatedAt: "2026-11-04T10:00:00Z",
  },
  {
    id: "apt-501",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-2",
    patientName: "Sunita Roy",
    patientPhone: "9823098765",
    patientUhid: "UHID-2026-0042",
    doctorId: "doc-3",
    doctorName: "Dr. Rajesh Varma",
    department: "Orthopedics",
    tokenNumber: 501,
    appointmentDate: "2026-11-05",
    timeSlot: "11:00 AM",
    status: "completed",
    priority: "urgent",
    source: "online",
    consultationFee: 700,
    isPaid: true,
    createdAt: "2026-11-05T08:30:00Z",
    updatedAt: "2026-11-05T11:30:00Z",
  },
  {
    id: "apt-601",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-3",
    patientName: "Vikram Singh",
    patientPhone: "9876543210",
    patientUhid: "UHID-2026-0043",
    doctorId: "doc-1",
    doctorName: "Dr. Gaurav Kumar",
    department: "Cardiology",
    tokenNumber: 601,
    appointmentDate: "2026-11-06",
    timeSlot: "10:00 AM",
    status: "completed",
    priority: "normal",
    source: "walk_in",
    consultationFee: 800,
    isPaid: true,
    createdAt: "2026-11-06T08:30:00Z",
    updatedAt: "2026-11-06T10:30:00Z",
  },
  {
    id: "apt-602",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-4",
    patientName: "Pooja Mehta",
    patientPhone: "9811223344",
    patientUhid: "UHID-2026-0044",
    doctorId: "doc-2",
    doctorName: "Dr. Ananya Sharma",
    department: "General Medicine",
    tokenNumber: 602,
    appointmentDate: "2026-11-06",
    timeSlot: "11:30 AM",
    status: "completed",
    priority: "normal",
    source: "sys",
    consultationFee: 500,
    isPaid: true,
    createdAt: "2026-11-06T08:30:00Z",
    updatedAt: "2026-11-06T12:00:00Z",
  },
  {
    id: "apt-701",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-5",
    patientName: "Aakash Mehta",
    patientPhone: "9899001122",
    patientUhid: "UHID-2026-0045",
    doctorId: "doc-3",
    doctorName: "Dr. Rajesh Varma",
    department: "Orthopedics",
    tokenNumber: 701,
    appointmentDate: "2026-11-07",
    timeSlot: "10:30 AM",
    status: "completed",
    priority: "urgent",
    source: "online",
    consultationFee: 700,
    isPaid: true,
    createdAt: "2026-11-07T08:30:00Z",
    updatedAt: "2026-11-07T11:00:00Z",
  },
  {
    id: "apt-801",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-1",
    patientName: "Ramesh Patel",
    patientPhone: "9823012345",
    patientUhid: "UHID-2026-0041",
    doctorId: "doc-1",
    doctorName: "Dr. Gaurav Kumar",
    department: "Cardiology",
    tokenNumber: 801,
    appointmentDate: "2026-11-08",
    timeSlot: "09:30 AM",
    status: "completed",
    priority: "normal",
    source: "sys",
    consultationFee: 800,
    isPaid: true,
    createdAt: "2026-11-08T08:30:00Z",
    updatedAt: "2026-11-08T10:00:00Z",
  },
  {
    id: "apt-901",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-2",
    patientName: "Sunita Roy",
    patientPhone: "9823098765",
    patientUhid: "UHID-2026-0042",
    doctorId: "doc-2",
    doctorName: "Dr. Ananya Sharma",
    department: "General Medicine",
    tokenNumber: 901,
    appointmentDate: "2026-11-09",
    timeSlot: "10:00 AM",
    status: "completed",
    priority: "normal",
    source: "walk_in",
    consultationFee: 500,
    isPaid: true,
    createdAt: "2026-11-09T08:30:00Z",
    updatedAt: "2026-11-09T10:30:00Z",
  },
  {
    id: "apt-1001",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-3",
    patientName: "Vikram Singh",
    patientPhone: "9876543210",
    patientUhid: "UHID-2026-0043",
    doctorId: "doc-3",
    doctorName: "Dr. Rajesh Varma",
    department: "Orthopedics",
    tokenNumber: 1001,
    appointmentDate: "2026-11-10",
    timeSlot: "10:00 AM",
    status: "completed",
    priority: "emergency",
    source: "online",
    consultationFee: 700,
    isPaid: true,
    createdAt: "2026-11-10T08:30:00Z",
    updatedAt: "2026-11-10T10:30:00Z",
  },
  {
    id: "apt-1301",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-4",
    patientName: "Pooja Mehta",
    patientPhone: "9811223344",
    patientUhid: "UHID-2026-0044",
    doctorId: "doc-1",
    doctorName: "Dr. Gaurav Kumar",
    department: "Cardiology",
    tokenNumber: 1301,
    appointmentDate: "2026-11-13",
    timeSlot: "11:00 AM",
    status: "completed",
    priority: "normal",
    source: "sys",
    consultationFee: 800,
    isPaid: true,
    createdAt: "2026-11-13T08:30:00Z",
    updatedAt: "2026-11-13T11:30:00Z",
  },
  {
    id: "apt-1501",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-5",
    patientName: "Aakash Mehta",
    patientPhone: "9899001122",
    patientUhid: "UHID-2026-0045",
    doctorId: "doc-1",
    doctorName: "Dr. Gaurav Kumar",
    department: "Cardiology",
    tokenNumber: 1501,
    appointmentDate: "2026-11-15",
    timeSlot: "10:00 AM",
    status: "scheduled",
    priority: "normal",
    source: "walk_in",
    appointmentType: "follow_up",
    consultationFee: 800,
    isPaid: false,
    createdAt: "2026-11-14T09:00:00Z",
    updatedAt: "2026-11-14T09:00:00Z",
  },
  {
    id: "apt-1601",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-1",
    patientName: "Ramesh Patel",
    patientPhone: "9823012345",
    patientUhid: "UHID-2026-0041",
    doctorId: "doc-2",
    doctorName: "Dr. Ananya Sharma",
    department: "General Medicine",
    tokenNumber: 1601,
    appointmentDate: "2026-11-16",
    timeSlot: "10:30 AM",
    status: "scheduled",
    priority: "normal",
    source: "online",
    appointmentType: "follow_up",
    consultationFee: 500,
    isPaid: false,
    createdAt: "2026-11-14T09:00:00Z",
    updatedAt: "2026-11-14T09:00:00Z",
  },
];

const INITIAL_PATIENT_ALLERGIES: PatientAllergy[] = [
  {
    id: "allg-1",
    patientId: "pat-vijay-189",
    allergyType: "drug",
    allergen: "Sulfa Drugs (Sulfonamides)",
    severity: "moderate",
    reaction: "Erythematous macular rash, pruritus & facial flushing",
    onsetDate: "2023-04-10",
    createdAt: "2026-11-14T08:00:00Z",
  },
  {
    id: "allg-2",
    patientId: "pat-vijay-189",
    allergyType: "food",
    allergen: "Peanuts & Tree Nuts",
    severity: "mild",
    reaction: "Oral tingling and localized lip edema",
    onsetDate: "2020-01-15",
    createdAt: "2026-11-14T08:00:00Z",
  },
  {
    id: "allg-3",
    patientId: "pat-sreya-188",
    allergyType: "drug",
    allergen: "Penicillin & Amoxicillin",
    severity: "severe",
    reaction: "Dyspnea, bronchospasm, and anaphylactoid shock risk",
    onsetDate: "2021-09-18",
    createdAt: "2026-11-14T08:30:00Z",
  },
  {
    id: "allg-4",
    patientId: "pat-vimal-187",
    allergyType: "drug",
    allergen: "Aspirin & NSAIDs",
    severity: "moderate",
    reaction: "Severe epigastric pain, GI irritation & urticaria",
    onsetDate: "2018-05-22",
    createdAt: "2026-11-14T09:00:00Z",
  },
];

const INITIAL_CLINICAL_ATTACHMENTS: ClinicalAttachment[] = [];

const INITIAL_OPD_CONSULTATIONS: Record<string, OpdConsultationRecord> = {};

const INITIAL_BEDS: Bed[] = [
  { id: "b1", organizationId: "org-apex-001", branchId: "br-main-001", wardId: "w1", wardName: "Cardiology ICU", wardType: "icu", bedNumber: "ICU-01", status: "occupied", dailyRate: 4500, currentPatientId: "pat-5", patientName: "Aakash Mehta" },
  { id: "b2", organizationId: "org-apex-001", branchId: "br-main-001", wardId: "w1", wardName: "Cardiology ICU", wardType: "icu", bedNumber: "ICU-02", status: "available", dailyRate: 4500 },
  { id: "b3", organizationId: "org-apex-001", branchId: "br-main-001", wardId: "w1", wardName: "Cardiology ICU", wardType: "icu", bedNumber: "ICU-03", status: "cleaning", dailyRate: 4500 },
  { id: "b4", organizationId: "org-apex-001", branchId: "br-main-001", wardId: "w1", wardName: "Cardiology ICU", wardType: "icu", bedNumber: "ICU-04", status: "occupied", dailyRate: 4500, patientName: "Geeta Sharma" },
  { id: "b13", organizationId: "org-apex-001", branchId: "br-main-001", wardId: "w4", wardName: "Coronary Care Unit (CCU)", wardType: "ccu", bedNumber: "CCU-01", status: "occupied", dailyRate: 4800, patientName: "Aakash Mehta" },
  { id: "b14", organizationId: "org-apex-001", branchId: "br-main-001", wardId: "w4", wardName: "Coronary Care Unit (CCU)", wardType: "ccu", bedNumber: "CCU-02", status: "available", dailyRate: 4800 },
  { id: "b5", organizationId: "org-apex-001", branchId: "br-main-001", wardId: "w2", wardName: "General Male Ward", wardType: "general", bedNumber: "GMW-01", status: "occupied", dailyRate: 1200, patientName: "Sohan Lal" },
  { id: "b6", organizationId: "org-apex-001", branchId: "br-main-001", wardId: "w2", wardName: "General Male Ward", wardType: "general", bedNumber: "GMW-02", status: "available", dailyRate: 1200 },
  { id: "b7", organizationId: "org-apex-001", branchId: "br-main-001", wardId: "w2", wardName: "General Male Ward", wardType: "general", bedNumber: "GMW-03", status: "available", dailyRate: 1200 },
  { id: "b8", organizationId: "org-apex-001", branchId: "br-main-001", wardId: "w2", wardName: "General Male Ward", wardType: "general", bedNumber: "GMW-04", status: "occupied", dailyRate: 1200, patientName: "Mohan Jadhav" },
  { id: "b9", organizationId: "org-apex-001", branchId: "br-main-001", wardId: "w3", wardName: "Private Deluxe Suite", wardType: "deluxe", bedNumber: "DLX-101", status: "occupied", dailyRate: 3500, patientName: "Neha Roy" },
  { id: "b10", organizationId: "org-apex-001", branchId: "br-main-001", wardId: "w3", wardName: "Private Deluxe Suite", wardType: "deluxe", bedNumber: "DLX-102", status: "available", dailyRate: 3500 },
  { id: "b11", organizationId: "org-apex-001", branchId: "br-main-001", wardId: "w3", wardName: "Private Deluxe Suite", wardType: "deluxe", bedNumber: "DLX-103", status: "available", dailyRate: 3500 },
  { id: "b12", organizationId: "org-apex-001", branchId: "br-main-001", wardId: "w3", wardName: "Private Deluxe Suite", wardType: "deluxe", bedNumber: "DLX-104", status: "maintenance", dailyRate: 3500 },
];

const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: "med-1",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    sku: "MED-TEL-40",
    name: "Telmisartan 40mg",
    genericName: "Telmisartan",
    category: "tablet",
    batchNumber: "BTH-9941",
    expiryDate: "2027-04-30",
    quantityInStock: 240,
    reorderLevel: 50,
    purchasePrice: 4.5,
    sellingPrice: 9.0,
    gstRate: 12,
    manufacturer: "Sun Pharma",
    rackLocation: "Rack A-1",
  },
  {
    id: "med-2",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    sku: "MED-AML-5",
    name: "Amlodipine 5mg",
    genericName: "Amlodipine Besylate",
    category: "tablet",
    batchNumber: "BTH-8812",
    expiryDate: "2026-12-31",
    quantityInStock: 25,
    reorderLevel: 60,
    purchasePrice: 2.1,
    sellingPrice: 5.0,
    gstRate: 12,
    manufacturer: "Cipla",
    rackLocation: "Rack A-2",
  },
  {
    id: "med-3",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    sku: "MED-PCM-500",
    name: "Paracetamol 500mg",
    genericName: "Acetaminophen",
    category: "tablet",
    batchNumber: "BTH-7731",
    expiryDate: "2027-08-31",
    quantityInStock: 800,
    reorderLevel: 200,
    purchasePrice: 0.9,
    sellingPrice: 2.0,
    gstRate: 12,
    manufacturer: "Torrent Pharma",
    rackLocation: "Rack B-1",
  },
  {
    id: "med-4",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    sku: "MED-AMX-500",
    name: "Amoxicillin 500mg Caps",
    genericName: "Amoxicillin Trihydrate",
    category: "tablet",
    batchNumber: "BTH-6620",
    expiryDate: "2026-11-28", // Near expiry
    quantityInStock: 45,
    reorderLevel: 50,
    purchasePrice: 6.0,
    sellingPrice: 12.0,
    gstRate: 12,
    manufacturer: "Alkem Laboratories",
    rackLocation: "Rack B-3",
  },
  {
    id: "med-5",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    sku: "MED-PAN-40",
    name: "Pantoprazole 40mg",
    genericName: "Pantoprazole Sodium",
    category: "tablet",
    batchNumber: "BTH-5511",
    expiryDate: "2027-10-15",
    quantityInStock: 350,
    reorderLevel: 100,
    purchasePrice: 3.2,
    sellingPrice: 7.5,
    gstRate: 12,
    manufacturer: "Aristo Pharma",
    rackLocation: "Rack C-2",
  },
  {
    id: "med-6",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    sku: "MED-CEF-200",
    name: "Cefixime 200mg",
    genericName: "Cefixime Trihydrate",
    category: "tablet",
    batchNumber: "BTH-4490",
    expiryDate: "2027-03-20",
    quantityInStock: 180,
    reorderLevel: 50,
    purchasePrice: 8.5,
    sellingPrice: 16.0,
    gstRate: 12,
    manufacturer: "Lupin",
    rackLocation: "Rack C-4",
  },
];

const INITIAL_INVOICES: Invoice[] = [
  {
    id: "inv-1",
    invoiceNumber: "INV-2026-000104",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-1",
    patientName: "Ramesh Patel",
    patientPhone: "9823012345",
    invoiceType: "opd",
    items: [
      { description: "Cardiology Specialist Consultation", category: "consultation", quantity: 1, unitPrice: 800, gstRate: 0, amount: 800 },
      { description: "Standard 12-Lead Electrocardiogram (ECG)", category: "procedure", quantity: 1, unitPrice: 450, gstRate: 0, amount: 450 },
    ],
    subtotal: 1250,
    taxTotal: 0,
    discountTotal: 0,
    grandTotal: 1250,
    amountPaid: 1250,
    balanceDue: 0,
    paymentStatus: "paid",
    paymentMode: "upi",
    transactionRef: "UPI-ICICI-9920148",
    createdAt: "2026-11-14T10:14:10Z",
  },
  {
    id: "inv-2",
    invoiceNumber: "INV-2026-000103",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-2",
    patientName: "Sunita Roy",
    patientPhone: "9823098765",
    invoiceType: "pharmacy",
    items: [
      { description: "Paracetamol 500mg (10 Tabs)", category: "medicine", quantity: 1, unitPrice: 20, gstRate: 12, amount: 22.4 },
      { description: "Amoxicillin 500mg Caps (10 Caps)", category: "medicine", quantity: 1, unitPrice: 120, gstRate: 12, amount: 134.4 },
      { description: "Pantoprazole 40mg (10 Tabs)", category: "medicine", quantity: 1, unitPrice: 75, gstRate: 12, amount: 84 },
    ],
    subtotal: 215,
    taxTotal: 25.8,
    discountTotal: 0,
    grandTotal: 240.8,
    amountPaid: 240.8,
    balanceDue: 0,
    paymentStatus: "paid",
    paymentMode: "cash",
    createdAt: "2026-11-14T09:40:00Z",
  },
  {
    id: "inv-3",
    invoiceNumber: "INV-2026-000102",
    organizationId: "org-apex-001",
    branchId: "br-main-001",
    patientId: "pat-5",
    patientName: "Aakash Mehta",
    patientPhone: "9899001122",
    invoiceType: "ipd",
    items: [
      { description: "ICU Bed Charges (3 Days @ ₹4,500)", category: "room_rent", quantity: 3, unitPrice: 4500, gstRate: 0, amount: 13500 },
      { description: "Critical Care Nursing Charges", category: "nursing", quantity: 3, unitPrice: 1500, gstRate: 0, amount: 4500 },
      { description: "Continuous Cardiac Monitoring & Infusions", category: "procedure", quantity: 1, unitPrice: 6500, gstRate: 0, amount: 6500 },
    ],
    subtotal: 24500,
    taxTotal: 0,
    discountTotal: 0,
    grandTotal: 24500,
    amountPaid: 15000,
    balanceDue: 9500,
    paymentStatus: "partially_paid",
    paymentMode: "insurance",
    transactionRef: "TPA-STAR-CLAIM-88120",
    createdAt: "2026-11-13T17:30:00Z",
  },
];

const INITIAL_CASHIER_SHIFT: CashierShiftDrawer = {
  id: "shift-20261114-1",
  cashierName: "Meenakshi Sundaram",
  shiftDate: "2026-11-14",
  openedAt: "2026-11-14T08:00:00Z",
  openingCashFloat: 5000,
  cashCollections: 8640,
  cardCollections: 14200,
  upiCollections: 28900,
  cashDrops: 5000,
  expectedCashTotal: 8640, // 5000 opening + 8640 cash - 5000 drop = 8640 in drawer
  status: "open",
};

const INITIAL_NURSING_MAR: NursingMarRecord[] = [
  {
    id: "mar-1",
    admissionId: "IPD-2026-0001",
    bedNumber: "ICU-01",
    patientName: "Aakash Mehta",
    medicationName: "Inj. Enoxaparin 40mg SC",
    dosage: "40 mg",
    shift: "morning",
    scheduledTime: "08:00 AM",
    administeredTime: "08:15 AM",
    administeredBy: "Sister Priyanka Nair",
    status: "given",
    notes: "Given in left anterior abdominal wall",
  },
  {
    id: "mar-2",
    admissionId: "IPD-2026-0001",
    bedNumber: "ICU-01",
    patientName: "Aakash Mehta",
    medicationName: "Tab. Telmisartan 40mg",
    dosage: "40 mg",
    shift: "morning",
    scheduledTime: "09:00 AM",
    administeredTime: "09:05 AM",
    administeredBy: "Sister Priyanka Nair",
    status: "given",
  },
  {
    id: "mar-3",
    admissionId: "IPD-2026-0001",
    bedNumber: "ICU-01",
    patientName: "Aakash Mehta",
    medicationName: "Tab. Atorvastatin 40mg",
    dosage: "40 mg",
    shift: "night",
    scheduledTime: "09:00 PM",
    status: "pending",
  },
];

const INITIAL_WHATSAPP_LOGS: WhatsAppLogItem[] = [
  {
    id: "wam-104",
    recipientPhone: "+91 98230 12345",
    patientName: "Ramesh Patel",
    templateName: "prescription_ready_v1",
    status: "read",
    timestamp: "2026-11-14 10:28:42",
    mediaUrl: "https://portal.apexhospital.org/rx/OPD-2026-000041.pdf",
    params: {
      consultationNumber: "OPD-2026-000041",
      doctorName: "Dr. Gaurav Kumar, MD",
    },
  },
  {
    id: "wam-105",
    recipientPhone: "+91 98230 98765",
    patientName: "Sunita Roy",
    templateName: "appointment_confirmation_v1",
    status: "delivered",
    timestamp: "2026-11-14 10:14:10",
    params: {
      doctorName: "Dr. Ananya Sharma",
      dateTime: "14-Nov-2026 at 10:30 AM",
      tokenNumber: "105",
    },
  },
  {
    id: "wam-106",
    recipientPhone: "+91 98990 01122",
    patientName: "Aakash Mehta",
    templateName: "bill_receipt_v1",
    status: "sent",
    timestamp: "2026-11-14 09:45:00",
    mediaUrl: "https://portal.apexhospital.org/invoices/INV-2026-000102.pdf",
    params: {
      invoiceNumber: "INV-2026-000102",
      amountPaid: "₹15,000",
    },
  },
];

const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: "aud-1",
    timestamp: "2026-11-14 10:28:42",
    actor: "Dr. Gaurav Kumar",
    role: "Senior Consultant",
    action: "PRESCRIBE_MEDICATION",
    module: "OPD",
    entity: "Consultation OPD-2026-000041",
    ip: "192.168.1.45",
    notes: "Prescribed Telmisartan 40mg, Amlodipine 5mg for Essential Hypertension",
  },
  {
    id: "aud-2",
    timestamp: "2026-11-14 10:14:10",
    actor: "Meenakshi Sundaram",
    role: "Chief Cashier",
    action: "CREATE_INVOICE",
    module: "Billing",
    entity: "Invoice INV-2026-000104",
    ip: "192.168.1.12",
    notes: "Collected ₹1,250 via UPI payment (Ramesh Patel)",
  },
  {
    id: "aud-3",
    timestamp: "2026-11-14 09:55:03",
    actor: "Dr. Ananya Sharma",
    role: "Senior Consultant",
    action: "VIEW_PHI",
    module: "Patients",
    entity: "Patient UHID-2026-0042",
    ip: "192.168.1.46",
    notes: "Accessed clinical lab history and previous discharge notes",
  },
  {
    id: "aud-4",
    timestamp: "2026-11-14 09:30:19",
    actor: "Sister Priyanka Nair",
    role: "Staff Nurse",
    action: "NURSE_ROUND_MAR",
    module: "IPD",
    entity: "Bed ICU-01 (Aakash Mehta)",
    ip: "192.168.1.80",
    notes: "Administered Inj. Enoxaparin 40mg and Tab. Telmisartan 40mg",
  },
  {
    id: "aud-5",
    timestamp: "2026-11-14 08:00:00",
    actor: "Meenakshi Sundaram",
    role: "Chief Cashier",
    action: "OPEN_SHIFT_DRAWER",
    module: "Billing",
    entity: "Drawer shift-20261114-1",
    ip: "192.168.1.12",
    notes: "Opened morning shift drawer with ₹5,000 float balance",
  },
];

const INITIAL_SETTINGS: HospitalSettings = {
  hospitalName: "Apex Superspeciality Hospital",
  tagline: "Center for Advanced Clinical Care & Interventional Medicine",
  registrationNumber: "HOSP-MAH-2016-89021",
  phone: "+91 20 2567 8900",
  email: "care@apexhospital.org",
  address: "Plot 42, Health City Avenue, Model Colony, Pune - 411016",
  stateCode: "27", // Maharashtra
  gstin: "27AAPCU9603R1ZV",
  letterheadConfig: {
    topMarginMm: 35,
    bottomMarginMm: 25,
    footerText: "This prescription is a valid legal document under the National Medical Commission (NMC) Act.",
    showQrCode: true,
    showDoctorCredentials: true,
  },
  documentSequences: {
    uhidPrefix: "UHID",
    opdBillPrefix: "OPD",
    ipdPrefix: "IPD",
    pharmacyPrefix: "PHARM",
    invPrefix: "INV",
  },
  serviceCatalog: [
    { id: "srv-1", serviceCode: "OPD-CONS-GEN", name: "General Physician Consultation", category: "consultation", standardRate: 500, gstRate: 0 },
    { id: "srv-2", serviceCode: "OPD-CONS-SPEC", name: "Super Specialist Consultation", category: "consultation", standardRate: 800, gstRate: 0 },
    { id: "srv-3", serviceCode: "PROC-ECG-12", name: "12-Lead Electrocardiogram (ECG)", category: "procedure", standardRate: 450, gstRate: 0 },
    { id: "srv-4", serviceCode: "LAB-CBC", name: "Complete Blood Count (CBC) with ESR", category: "lab_test", standardRate: 450, gstRate: 0 },
    { id: "srv-5", serviceCode: "LAB-LIPID", name: "Lipid Profile Extended", category: "lab_test", standardRate: 900, gstRate: 0 },
    { id: "srv-6", serviceCode: "RAD-XRAY-CHEST", name: "Digital X-Ray Chest PA View", category: "radiology", standardRate: 650, gstRate: 0 },
    { id: "srv-7", serviceCode: "IPD-BED-ICU", name: "ICU Bed Charges (Per Day)", category: "bed", standardRate: 4500, gstRate: 0 },
    { id: "srv-8", serviceCode: "IPD-BED-GEN", name: "General Ward Bed (Per Day)", category: "bed", standardRate: 1200, gstRate: 0 },
    { id: "srv-9", serviceCode: "IPD-BED-PVT", name: "Private Deluxe Room (Per Day)", category: "bed", standardRate: 3500, gstRate: 0 },
  ],
};

const INITIAL_STAFF: StaffMember[] = [
  {
    id: "usr-1",
    name: "Dr. Gaurav Kumar",
    email: "dr.gaurav@apexhospital.org",
    role: "senior_consultant",
    department: "Cardiology",
    license: "MCI-2015-48291",
    qualification: "MBBS, MD (Medicine), DM (Cardiology)",
    phone: "+91 98230 11111",
    status: "active",
  },
  {
    id: "usr-2",
    name: "Dr. Ananya Sharma",
    email: "dr.ananya@apexhospital.org",
    role: "senior_consultant",
    department: "General Medicine",
    license: "MMC-2018-91204",
    qualification: "MBBS, MD (Internal Medicine)",
    phone: "+91 98230 22222",
    status: "active",
  },
  {
    id: "usr-3",
    name: "Dr. Rajesh Varma",
    email: "dr.rajesh@apexhospital.org",
    role: "senior_consultant",
    department: "Orthopedics",
    license: "MCI-2012-33104",
    qualification: "MBBS, MS (Orthopedics), MCh (Joint Replacement)",
    phone: "+91 98230 77777",
    status: "active",
  },
  {
    id: "usr-4",
    name: "Sister Priyanka Nair",
    email: "priyanka.nair@apexhospital.org",
    role: "staff_nurse",
    department: "ICU / Critical Care",
    license: "INC-2019-10294",
    qualification: "B.Sc Nursing, Critical Care Fellowship",
    phone: "+91 98230 33333",
    status: "active",
  },
  {
    id: "usr-5",
    name: "Karan Johar",
    email: "karan.j@apexhospital.org",
    role: "pharmacist",
    department: "Central Pharmacy",
    license: "PCI-2017-88219",
    qualification: "B.Pharm, Registered Pharmacist",
    phone: "+91 98230 44444",
    status: "active",
  },
  {
    id: "usr-6",
    name: "Meenakshi Sundaram",
    email: "meenakshi@apexhospital.org",
    role: "chief_cashier",
    department: "Front Desk & Billing",
    license: "ADM-2020-0012",
    qualification: "B.Com, Hospital Administration Diploma",
    phone: "+91 98230 55555",
    status: "active",
  },
];

const INITIAL_RBAC_MATRIX: RbacMatrix = {
  super_admin: {
    view_phi: true,
    edit_clinical_emr: true,
    prescribe_medications: true,
    ipd_admission_discharge: true,
    dispense_pharmacy: true,
    billing_collections: true,
    issue_discounts: true,
    cancel_invoices: true,
    view_financial_reports: true,
    manage_staff: true,
    system_configuration: true,
    export_audit_logs: true,
  },
  hospital_admin: {
    view_phi: true,
    edit_clinical_emr: false,
    prescribe_medications: false,
    ipd_admission_discharge: true,
    dispense_pharmacy: true,
    billing_collections: true,
    issue_discounts: true,
    cancel_invoices: true,
    view_financial_reports: true,
    manage_staff: true,
    system_configuration: true,
    export_audit_logs: true,
  },
  medical_director: {
    view_phi: true,
    edit_clinical_emr: true,
    prescribe_medications: true,
    ipd_admission_discharge: true,
    dispense_pharmacy: false,
    billing_collections: false,
    issue_discounts: true,
    cancel_invoices: false,
    view_financial_reports: true,
    manage_staff: true,
    system_configuration: false,
    export_audit_logs: true,
  },
  senior_consultant: {
    view_phi: true,
    edit_clinical_emr: true,
    prescribe_medications: true,
    ipd_admission_discharge: true,
    dispense_pharmacy: false,
    billing_collections: false,
    issue_discounts: false,
    cancel_invoices: false,
    view_financial_reports: true,
    manage_staff: false,
    system_configuration: false,
    export_audit_logs: false,
  },
  junior_resident: {
    view_phi: true,
    edit_clinical_emr: true,
    prescribe_medications: true,
    ipd_admission_discharge: true,
    dispense_pharmacy: false,
    billing_collections: false,
    issue_discounts: false,
    cancel_invoices: false,
    view_financial_reports: false,
    manage_staff: false,
    system_configuration: false,
    export_audit_logs: false,
  },
  chief_nursing_officer: {
    view_phi: true,
    edit_clinical_emr: true,
    prescribe_medications: false,
    ipd_admission_discharge: true,
    dispense_pharmacy: false,
    billing_collections: false,
    issue_discounts: false,
    cancel_invoices: false,
    view_financial_reports: false,
    manage_staff: true,
    system_configuration: false,
    export_audit_logs: false,
  },
  staff_nurse: {
    view_phi: true,
    edit_clinical_emr: true,
    prescribe_medications: false,
    ipd_admission_discharge: false,
    dispense_pharmacy: false,
    billing_collections: false,
    issue_discounts: false,
    cancel_invoices: false,
    view_financial_reports: false,
    manage_staff: false,
    system_configuration: false,
    export_audit_logs: false,
  },
  pharmacist: {
    view_phi: true,
    edit_clinical_emr: false,
    prescribe_medications: false,
    ipd_admission_discharge: false,
    dispense_pharmacy: true,
    billing_collections: true,
    issue_discounts: false,
    cancel_invoices: false,
    view_financial_reports: false,
    manage_staff: false,
    system_configuration: false,
    export_audit_logs: false,
  },
  chief_cashier: {
    view_phi: false,
    edit_clinical_emr: false,
    prescribe_medications: false,
    ipd_admission_discharge: false,
    dispense_pharmacy: false,
    billing_collections: true,
    issue_discounts: true,
    cancel_invoices: true,
    view_financial_reports: true,
    manage_staff: false,
    system_configuration: false,
    export_audit_logs: false,
  },
  receptionist: {
    view_phi: false,
    edit_clinical_emr: false,
    prescribe_medications: false,
    ipd_admission_discharge: false,
    dispense_pharmacy: false,
    billing_collections: true,
    issue_discounts: false,
    cancel_invoices: false,
    view_financial_reports: false,
    manage_staff: false,
    system_configuration: false,
    export_audit_logs: false,
  },
  lab_technician: {
    view_phi: true,
    edit_clinical_emr: false,
    prescribe_medications: false,
    ipd_admission_discharge: false,
    dispense_pharmacy: false,
    billing_collections: false,
    issue_discounts: false,
    cancel_invoices: false,
    view_financial_reports: false,
    manage_staff: false,
    system_configuration: false,
    export_audit_logs: false,
  },
  radiologist: {
    view_phi: true,
    edit_clinical_emr: true,
    prescribe_medications: false,
    ipd_admission_discharge: false,
    dispense_pharmacy: false,
    billing_collections: false,
    issue_discounts: false,
    cancel_invoices: false,
    view_financial_reports: false,
    manage_staff: false,
    system_configuration: false,
    export_audit_logs: false,
  },
};

// --- Singleton Reactive Clinical Store ---

class ClinicalStore {
  private state: ClinicalStoreState;
  private listeners: Set<() => void> = new Set();
  private readonly STORAGE_KEY = "apex_hms_clinical_state_v2";

  constructor() {
    this.state = this.loadInitialState();
  }

  private loadInitialState(): ClinicalStoreState {
    if (typeof window !== "undefined") {
      try {
        // Clear legacy v1 state to prevent stale dummy cache from leaking into production
        if (localStorage.getItem("apex_hms_clinical_state_v1")) {
          localStorage.removeItem("apex_hms_clinical_state_v1");
        }
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            ...this.getDefaultState(),
            ...parsed,
          };
        }
      } catch (err) {
        console.warn("[clinical-store] Failed to load saved state, using default:", err);
      }
    }
    return this.getDefaultState();
  }

  private getDefaultState(): ClinicalStoreState {
    const vacantBeds: Bed[] = INITIAL_BEDS.map((bed) => ({
      ...bed,
      status: "available",
      currentPatientId: null,
      currentAdmissionId: null,
      patientName: null,
    }));

    return {
      patients: [],
      appointments: [],
      doctorBlocks: [],
      doctorAvailabilities: INITIAL_DOCTOR_AVAILABILITIES,
      consultations: [],
      patientAllergies: [],
      clinicalAttachments: [],
      opdConsultations: {},
      beds: vacantBeds,
      admissions: [],
      nursingMar: [],
      invoices: [],
      cashierShift: INITIAL_CASHIER_SHIFT,
      inventory: INITIAL_INVENTORY,
      grnRecords: [],
      whatsappLogs: [],
      auditLogs: [],
      settings: INITIAL_SETTINGS,
      staff: INITIAL_STAFF,
      rbacMatrix: INITIAL_RBAC_MATRIX,
    };
  }

  public seedDemoData(): void {
    this.state = {
      patients: JSON.parse(JSON.stringify(INITIAL_PATIENTS)),
      appointments: JSON.parse(JSON.stringify(INITIAL_APPOINTMENTS)),
      doctorBlocks: JSON.parse(JSON.stringify(INITIAL_DOCTOR_BLOCKS)),
      doctorAvailabilities: JSON.parse(JSON.stringify(INITIAL_DOCTOR_AVAILABILITIES)),
      consultations: [],
      patientAllergies: JSON.parse(JSON.stringify(INITIAL_PATIENT_ALLERGIES)),
      clinicalAttachments: JSON.parse(JSON.stringify(INITIAL_CLINICAL_ATTACHMENTS)),
      opdConsultations: JSON.parse(JSON.stringify(INITIAL_OPD_CONSULTATIONS)),
      beds: JSON.parse(JSON.stringify(INITIAL_BEDS)),
      admissions: [
        {
          id: "IPD-2026-0001",
          admissionNumber: "IPD-2026-0001",
          organizationId: "org-apex-001",
          branchId: "br-main-001",
          patientId: "pat-5",
          primaryDoctorId: "usr-1",
          wardId: "w1",
          bedId: "b1",
          admissionDate: "2026-11-12",
          expectedDischargeDate: "2026-11-16",
          status: "admitted",
          admissionReason: "Unstable Angina, Post-Coronary Angiography Observation",
          totalAdvancePaid: 15000,
          createdAt: "2026-11-12T14:30:00Z",
          updatedAt: "2026-11-14T09:00:00Z",
        },
      ],
      nursingMar: JSON.parse(JSON.stringify(INITIAL_NURSING_MAR)),
      invoices: JSON.parse(JSON.stringify(INITIAL_INVOICES)),
      cashierShift: JSON.parse(JSON.stringify(INITIAL_CASHIER_SHIFT)),
      inventory: JSON.parse(JSON.stringify(INITIAL_INVENTORY)),
      grnRecords: [
        {
          id: "grn-1",
          grnNumber: "GRN-2026-0001",
          supplierName: "MedPlus Direct Distributors",
          supplierInvoiceNumber: "INV-MP-88129",
          poNumber: "PO-2026-0044",
          receivedDate: "2026-11-10",
          items: [
            {
              sku: "MED-TEL-40",
              itemName: "Telmisartan 40mg",
              batchNumber: "BTH-9941",
              expiryDate: "2027-04-30",
              quantity: 300,
              purchaseRate: 4.5,
              sellingRate: 9.0,
              gstRate: 12,
              totalAmount: 1512,
            },
          ],
          totalInvoiceAmount: 1512,
          verifiedBy: "Karan Johar",
        },
      ],
      whatsappLogs: JSON.parse(JSON.stringify(INITIAL_WHATSAPP_LOGS)),
      auditLogs: JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS)),
      settings: JSON.parse(JSON.stringify(INITIAL_SETTINGS)),
      staff: JSON.parse(JSON.stringify(INITIAL_STAFF)),
      rbacMatrix: JSON.parse(JSON.stringify(INITIAL_RBAC_MATRIX)),
    };
    this.persist();
  }

  public clearAllData(): void {
    this.state = this.getDefaultState();
    this.persist();
  }

  private persist() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
      } catch (err) {
        console.warn("[clinical-store] Failed to persist state:", err);
      }
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot = (): ClinicalStoreState => {
    return this.state;
  };

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  // --- Patients Actions ---
  public addPatient(patient: Patient) {
    this.state = {
      ...this.state,
      patients: [patient, ...this.state.patients],
    };
    this.logAudit({
      actor: "Reception Desk",
      role: "Receptionist",
      action: "REGISTER_PATIENT",
      module: "Patients",
      entity: patient.uhid,
      notes: `Registered patient ${patient.fullName} (${patient.phone})`,
    });
    this.persist();
  }

  public findPatientByUhidOrPhone(query: string): Patient | undefined {
    const clean = query.trim().toLowerCase();
    return this.state.patients.find(
      (p) =>
        p.uhid.toLowerCase() === clean ||
        p.phone === clean ||
        p.fullName.toLowerCase().includes(clean)
    );
  }

  // --- Appointments & Queue Actions ---
  public addAppointment(appointment: Appointment) {
    this.state = {
      ...this.state,
      appointments: [appointment, ...this.state.appointments],
    };
    this.logAudit({
      actor: "Reception Desk",
      role: "Receptionist",
      action: "BOOK_APPOINTMENT",
      module: "Appointments",
      entity: `Token #${appointment.tokenNumber}`,
      notes: `Booked ${appointment.patientName} for ${appointment.doctorName} (${appointment.department})`,
    });
    this.persist();
  }

  public updateAppointmentStatus(appointmentId: string, status: Appointment["status"]) {
    this.state = {
      ...this.state,
      appointments: this.state.appointments.map((a) =>
        a.id === appointmentId ? { ...a, status, updatedAt: new Date().toISOString() } : a
      ),
    };
    this.persist();
  }

  public addDoctorBlock(block: DoctorBlock) {
    this.state = {
      ...this.state,
      doctorBlocks: [block, ...this.state.doctorBlocks],
    };
    this.logAudit({
      actor: "Reception Desk",
      role: "Receptionist",
      action: "BLOCK_DOCTOR_SCHEDULE",
      module: "Appointments",
      entity: block.id,
      notes: `Blocked ${block.doctorName} on ${block.startDate} (${block.startTime || "Full Day"} - ${block.reason})`,
    });
    this.persist();
  }

  public removeDoctorBlock(id: string) {
    this.state = {
      ...this.state,
      doctorBlocks: this.state.doctorBlocks.filter((b) => b.id !== id),
    };
    this.persist();
  }

  public updateDoctorAvailability(schedule: DoctorWeeklySchedule) {
    this.state = {
      ...this.state,
      doctorAvailabilities: {
        ...this.state.doctorAvailabilities,
        [schedule.doctorId]: schedule,
      },
    };
    this.logAudit({
      actor: "Reception Desk",
      role: "Receptionist",
      action: "UPDATE_DOCTOR_AVAILABILITY",
      module: "Appointments",
      entity: schedule.doctorId,
      notes: `Updated weekly schedule and ${schedule.slotDurationMinutes}m slot duration for ${schedule.doctorName}`,
    });
    this.persist();
  }

  public rescheduleAppointment(appointmentId: string, newDate: string, newTimeSlot: string) {
    this.state = {
      ...this.state,
      appointments: this.state.appointments.map((a) =>
        a.id === appointmentId
          ? {
              ...a,
              appointmentDate: newDate,
              timeSlot: newTimeSlot,
              updatedAt: new Date().toISOString(),
            }
          : a
      ),
    };
    this.logAudit({
      actor: "Reception Desk",
      role: "Receptionist",
      action: "RESCHEDULE_APPOINTMENT",
      module: "Appointments",
      entity: appointmentId,
      notes: `Rescheduled appointment to ${newDate} at ${newTimeSlot}`,
    });
    this.persist();
  }

  public cancelAppointment(appointmentId: string, reason?: string) {
    this.state = {
      ...this.state,
      appointments: this.state.appointments.map((a) =>
        a.id === appointmentId
          ? {
              ...a,
              status: "cancelled",
              notes: reason || a.notes,
              cancellationReason: reason,
              updatedAt: new Date().toISOString(),
            }
          : a
      ),
    };
    this.logAudit({
      actor: "Reception Desk",
      role: "Receptionist",
      action: "CANCEL_APPOINTMENT",
      module: "Appointments",
      entity: appointmentId,
      notes: `Cancelled appointment: ${reason || "Patient request"}`,
    });
    this.persist();
  }

  // --- Consultations Actions ---
  public completeConsultation(consultation: OpdConsultation, generateInvoice: boolean = true) {
    this.state = {
      ...this.state,
      consultations: [consultation, ...this.state.consultations],
      appointments: this.state.appointments.map((a) =>
        a.id === consultation.appointmentId
          ? { ...a, status: "completed", updatedAt: new Date().toISOString() }
          : a
      ),
    };

    if (generateInvoice) {
      const invNum = `INV-2026-000${Math.floor(100 + Math.random() * 900)}`;
      const patient = this.state.patients.find((p) => p.id === consultation.patientId);
      const doctor = this.state.staff.find((s) => s.id === consultation.doctorId);

      const newInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        invoiceNumber: invNum,
        organizationId: consultation.organizationId,
        branchId: consultation.branchId,
        patientId: consultation.patientId,
        patientName: patient?.fullName || "Patient",
        patientPhone: patient?.phone || "",
        invoiceType: "opd",
        items: [
          {
            description: `${doctor?.department || "Specialist"} Consultation`,
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
      };

      this.state.invoices = [newInvoice, ...this.state.invoices];
    }

    this.logAudit({
      actor: "Dr. Gaurav Kumar",
      role: "Senior Consultant",
      action: "COMPLETE_CONSULTATION",
      module: "OPD",
      entity: consultation.id,
      notes: `Completed consultation for patient ${consultation.patientId} with ${consultation.prescriptions.length} medications`,
    });

    this.persist();
  }

  // --- IPD Wards & Beds Actions ---
  public allocateBed(
    bedId: string,
    patient: { patientId: string; patientName: string; admittingDoctor: string; reason: string; advance: number }
  ) {
    const bed = this.state.beds.find((b) => b.id === bedId);
    if (!bed) return;

    const admissionNumber = `IPD-2026-000${Math.floor(10 + Math.random() * 90)}`;
    const matchedDoc = this.state.staff.find(
      (s) => s.id === patient.admittingDoctor || s.name.toLowerCase() === patient.admittingDoctor.toLowerCase()
    );
    const resolvedDoctorId = matchedDoc ? matchedDoc.id : patient.admittingDoctor;

    const newAdmission: IpdAdmission = {
      id: admissionNumber,
      admissionNumber,
      organizationId: bed.organizationId,
      branchId: bed.branchId,
      patientId: patient.patientId,
      primaryDoctorId: resolvedDoctorId,
      wardId: bed.wardId,
      bedId: bed.id,
      admissionDate: new Date().toISOString().split("T")[0],
      status: "admitted",
      admissionReason: patient.reason,
      totalAdvancePaid: patient.advance,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.state = {
      ...this.state,
      beds: this.state.beds.map((b) =>
        b.id === bedId
          ? {
              ...b,
              status: "occupied",
              currentPatientId: patient.patientId,
              currentAdmissionId: newAdmission.id,
              patientName: patient.patientName,
            }
          : b
      ),
      admissions: [newAdmission, ...this.state.admissions],
    };

    this.logAudit({
      actor: "Nursing Supervisor",
      role: "Staff Nurse",
      action: "ADMIT_PATIENT",
      module: "IPD",
      entity: bed.bedNumber,
      notes: `Admitted ${patient.patientName} into ${bed.bedNumber} (${bed.wardName})`,
    });

    this.persist();
  }

  public updateBedStatus(bedId: string, status: Bed["status"]) {
    this.state = {
      ...this.state,
      beds: this.state.beds.map((b) =>
        b.id === bedId
          ? {
              ...b,
              status,
              patientName: status === "available" || status === "cleaning" ? null : b.patientName,
              currentPatientId: status === "available" ? null : b.currentPatientId,
            }
          : b
      ),
    };
    this.persist();
  }

  // --- Nursing MAR Actions ---
  public toggleNursingMarStatus(marId: string, nurseName: string = "Sister Priyanka Nair") {
    this.state = {
      ...this.state,
      nursingMar: this.state.nursingMar.map((m) => {
        if (m.id === marId) {
          const nextStatus = m.status === "given" ? "pending" : "given";
          return {
            ...m,
            status: nextStatus,
            administeredTime: nextStatus === "given" ? new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : undefined,
            administeredBy: nextStatus === "given" ? nurseName : undefined,
          };
        }
        return m;
      }),
    };
    this.persist();
  }

  // --- Billing & Invoicing Actions ---
  public addInvoice(invoice: Invoice) {
    this.state = {
      ...this.state,
      invoices: [invoice, ...this.state.invoices],
    };

    // Update cashier shift drawer if paid
    if (invoice.amountPaid > 0) {
      const mode = invoice.paymentMode;
      const drawer = { ...this.state.cashierShift };

      if (mode === "cash") {
        drawer.cashCollections += invoice.amountPaid;
        drawer.expectedCashTotal += invoice.amountPaid;
      } else if (mode === "card") {
        drawer.cardCollections += invoice.amountPaid;
      } else if (mode === "upi") {
        drawer.upiCollections += invoice.amountPaid;
      }
      this.state.cashierShift = drawer;
    }

    this.logAudit({
      actor: "Meenakshi Sundaram",
      role: "Chief Cashier",
      action: "GENERATE_INVOICE",
      module: "Billing",
      entity: invoice.invoiceNumber,
      notes: `Generated invoice ${invoice.invoiceNumber} for ₹${invoice.grandTotal} (${invoice.paymentMode.toUpperCase()})`,
    });

    this.persist();
  }

  // --- Cashier Shift Drawer Actions ---
  public recordCashDrop(amount: number, reason: string = "Safe drop to main vault") {
    const drawer = { ...this.state.cashierShift };
    drawer.cashDrops += amount;
    drawer.expectedCashTotal -= amount;

    this.state = {
      ...this.state,
      cashierShift: drawer,
    };

    this.logAudit({
      actor: "Meenakshi Sundaram",
      role: "Chief Cashier",
      action: "CASH_DROP",
      module: "Billing",
      entity: drawer.id,
      notes: `Safe cash drop of ₹${amount} - ${reason}`,
    });

    this.persist();
  }

  public closeCashierShift(countedCash: number) {
    const drawer = { ...this.state.cashierShift };
    drawer.closedAt = new Date().toISOString();
    drawer.closingCountedCash = countedCash;
    drawer.variance = countedCash - drawer.expectedCashTotal;
    drawer.status = "closed";

    this.state = {
      ...this.state,
      cashierShift: drawer,
    };

    this.logAudit({
      actor: "Meenakshi Sundaram",
      role: "Chief Cashier",
      action: "CLOSE_SHIFT_DRAWER",
      module: "Billing",
      entity: drawer.id,
      notes: `Closed shift drawer: Counted ₹${countedCash}, Expected ₹${drawer.expectedCashTotal}, Variance: ₹${drawer.variance}`,
    });

    this.persist();
  }

  // --- Pharmacy & Inventory Actions ---
  public adjustStock(sku: string, batchNumber: string, deltaQty: number, reason: string) {
    this.state = {
      ...this.state,
      inventory: this.state.inventory.map((item) => {
        if (item.sku === sku && item.batchNumber === batchNumber) {
          const newQty = Math.max(0, item.quantityInStock + deltaQty);
          return { ...item, quantityInStock: newQty };
        }
        return item;
      }),
    };

    this.logAudit({
      actor: "Karan Johar",
      role: "Pharmacist",
      action: "ADJUST_STOCK",
      module: "Inventory",
      entity: `${sku} (${batchNumber})`,
      notes: `Adjusted quantity by ${deltaQty > 0 ? `+${deltaQty}` : deltaQty} units. Reason: ${reason}`,
    });

    this.persist();
  }

  public receiveGrn(grn: GrnEntry) {
    // Add GRN record
    this.state = {
      ...this.state,
      grnRecords: [grn, ...this.state.grnRecords],
    };

    // Increment inventory items
    for (const line of grn.items) {
      const existing = this.state.inventory.find(
        (i) => i.sku === line.sku && i.batchNumber === line.batchNumber
      );

      if (existing) {
        existing.quantityInStock += line.quantity;
        existing.purchasePrice = line.purchaseRate;
        existing.sellingPrice = line.sellingRate;
      } else {
        this.state.inventory.push({
          id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          organizationId: "org-apex-001",
          branchId: "br-main-001",
          sku: line.sku,
          name: line.itemName,
          category: "tablet",
          batchNumber: line.batchNumber,
          expiryDate: line.expiryDate,
          quantityInStock: line.quantity,
          reorderLevel: 50,
          purchasePrice: line.purchaseRate,
          sellingPrice: line.sellingRate,
          gstRate: line.gstRate,
          manufacturer: grn.supplierName,
          rackLocation: "Rack Central",
        });
      }
    }

    this.logAudit({
      actor: grn.verifiedBy,
      role: "Pharmacist",
      action: "RECEIVE_GRN",
      module: "Inventory",
      entity: grn.grnNumber,
      notes: `Received GRN ${grn.grnNumber} from ${grn.supplierName} (Total ₹${grn.totalInvoiceAmount})`,
    });

    this.persist();
  }

  // --- WhatsApp Log Actions ---
  public logWhatsApp(msg: Omit<WhatsAppLogItem, "id" | "timestamp">) {
    const item: WhatsAppLogItem = {
      ...msg,
      id: `wam-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };

    this.state = {
      ...this.state,
      whatsappLogs: [item, ...this.state.whatsappLogs],
    };
    this.persist();
  }

  public retryWhatsApp(id: string) {
    this.state = {
      ...this.state,
      whatsappLogs: this.state.whatsappLogs.map((m) =>
        m.id === id ? { ...m, status: "sent", errorReason: undefined } : m
      ),
    };
    this.persist();
  }

  // --- Audit Trail Actions ---
  public logAudit(event: Omit<AuditLogItem, "id" | "timestamp" | "ip">) {
    const item: AuditLogItem = {
      ...event,
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
      ip: "192.168.1." + Math.floor(10 + Math.random() * 80),
    };

    this.state = {
      ...this.state,
      auditLogs: [item, ...this.state.auditLogs],
    };
    this.persist();
  }

  // --- Hospital Settings Actions ---
  public updateSettings(newSettings: Partial<HospitalSettings>) {
    this.state = {
      ...this.state,
      settings: {
        ...this.state.settings,
        ...newSettings,
      },
    };
    this.logAudit({
      actor: "Hospital Admin",
      role: "Super Admin",
      action: "UPDATE_SETTINGS",
      module: "Settings",
      entity: "Hospital Profile",
      notes: "Updated hospital branding, GSTIN, and letterhead configuration",
    });
    this.persist();
  }

  public addServiceCatalogItem(item: HospitalSettings["serviceCatalog"][0]) {
    this.state = {
      ...this.state,
      settings: {
        ...this.state.settings,
        serviceCatalog: [...this.state.settings.serviceCatalog, item],
      },
    };
    this.persist();
  }

  // --- Staff & RBAC Actions ---
  public addStaffMember(member: StaffMember) {
    this.state = {
      ...this.state,
      staff: [...this.state.staff, member],
    };
    this.logAudit({
      actor: "Hospital Admin",
      role: "Super Admin",
      action: "ADD_STAFF",
      module: "Staff",
      entity: member.name,
      notes: `Added staff ${member.name} (${member.role}) with license ${member.license}`,
    });
    this.persist();
  }

  public toggleStaffStatus(staffId: string) {
    this.state = {
      ...this.state,
      staff: this.state.staff.map((s) => {
        if (s.id === staffId) {
          const newStatus = s.status === "active" ? "inactive" : "active";
          return { ...s, status: newStatus };
        }
        return s;
      }),
    };
    this.persist();
  }

  public updateRbacPermission(role: RbacRole, permission: RbacPermission, value: boolean) {
    this.state = {
      ...this.state,
      rbacMatrix: {
        ...this.state.rbacMatrix,
        [role]: {
          ...this.state.rbacMatrix[role],
          [permission]: value,
        },
      },
    };
    this.logAudit({
      actor: "Hospital Admin",
      role: "Super Admin",
      action: "UPDATE_RBAC_PERMISSION",
      module: "Staff",
      entity: `${role}:${permission}`,
      notes: `Set ${permission} to ${value} for role ${role}`,
    });
    this.persist();
  }

  // --- OPD Consultation, Allergies & Clinical Attachments Actions ---
  public addPatientAllergy(allergy: PatientAllergy) {
    this.state = {
      ...this.state,
      patientAllergies: [...this.state.patientAllergies, allergy],
    };
    this.logAudit({
      actor: "Dr. Rajeev Prasad",
      role: "Doctor",
      action: "ADD_PATIENT_ALLERGY",
      module: "EMR",
      entity: allergy.patientId,
      notes: `Added ${allergy.allergyType} allergy: ${allergy.allergen} (${allergy.severity})`,
    });
    this.persist();
  }

  public removePatientAllergy(allergyId: string) {
    this.state = {
      ...this.state,
      patientAllergies: this.state.patientAllergies.filter((a) => a.id !== allergyId),
    };
    this.persist();
  }

  public addClinicalAttachment(attachment: ClinicalAttachment) {
    this.state = {
      ...this.state,
      clinicalAttachments: [...this.state.clinicalAttachments, attachment],
    };
    this.logAudit({
      actor: "Clinical Assistant",
      role: "Nurse",
      action: "UPLOAD_CLINICAL_ATTACHMENT",
      module: "EMR",
      entity: attachment.id,
      notes: `Attached ${attachment.fileName} (${attachment.category}) to appointment ${attachment.appointmentId}`,
    });
    this.persist();
  }

  public removeClinicalAttachment(attachmentId: string) {
    this.state = {
      ...this.state,
      clinicalAttachments: this.state.clinicalAttachments.filter((a) => a.id !== attachmentId),
    };
    this.persist();
  }

  public saveConsultationDraft(record: OpdConsultationRecord) {
    this.state = {
      ...this.state,
      opdConsultations: {
        ...this.state.opdConsultations,
        [record.appointmentId]: { ...record, isDraft: true, updatedAt: new Date().toISOString() },
      },
    };
    this.persist();
  }

  public completeOpdConsultation(record: OpdConsultationRecord) {
    const completedAt = new Date().toISOString();
    this.state = {
      ...this.state,
      opdConsultations: {
        ...this.state.opdConsultations,
        [record.appointmentId]: { ...record, isDraft: false, completedAt, updatedAt: completedAt },
      },
      appointments: this.state.appointments.map((a) =>
        a.id === record.appointmentId
          ? { ...a, status: "completed", updatedAt: completedAt }
          : a
      ),
    };
    this.logAudit({
      actor: record.doctorName,
      role: "Doctor",
      action: "COMPLETE_OPD_CONSULTATION",
      module: "EMR",
      entity: record.appointmentId,
      notes: `Completed OPD consultation for appointment ${record.appointmentId} with ${record.prescriptions.length} Rx items and ${record.diagnoses.length} diagnoses`,
    });
    this.persist();
  }
}

// Global store instance
export const clinicalStore = new ClinicalStore();

/**
 * Custom React Hook to subscribe to Clinical Store updates with zero re-render waste
 */
export function useClinicalStore(): ClinicalStoreState {
  return useSyncExternalStore(
    (callback) => clinicalStore.subscribe(callback),
    clinicalStore.getSnapshot,
    clinicalStore.getSnapshot
  );
}
