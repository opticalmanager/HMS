/**
 * Core Hospital Management System (HMS / EMR) Domain Types
 */

export type PatientGender = "male" | "female" | "other";
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export interface Patient {
  id: string;
  uhid: string; // Universal Hospital Identification (e.g. UHID-2026-0001)
  organizationId: string;
  branchId: string;
  fullName: string;
  gender: PatientGender;
  dateOfBirth?: string; // YYYY-MM-DD
  age?: number;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  pincode?: string;
  bloodGroup?: BloodGroup;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  abhaId?: string; // 14-digit ABHA Number
  abhaAddress?: string; // e.g. patient@abdm
  allergies?: string[];
  chronicConditions?: string[];
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus =
  | "scheduled"
  | "arrived"
  | "in_consultation"
  | "completed"
  | "cancelled"
  | "no_show";

export type AppointmentPriority = "normal" | "urgent" | "emergency";

export interface Appointment {
  id: string;
  organizationId: string;
  branchId: string;
  patientId: string;
  patientName?: string;
  patientPhone?: string;
  patientUhid?: string;
  doctorId: string;
  doctorName?: string;
  department: string;
  tokenNumber: number;
  appointmentDate: string; // YYYY-MM-DD
  timeSlot: string; // HH:mm
  status: AppointmentStatus;
  priority: AppointmentPriority;
  chiefComplaints?: string;
  consultationFee: number;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VitalRecord {
  id?: string;
  patientId: string;
  recordedAt: string;
  systolicBp?: number;
  diastolicBp?: number;
  pulseRate?: number;
  temperature?: number; // in Fahrenheit
  respiratoryRate?: number;
  spo2?: number; // oxygen saturation percentage
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  bloodSugarRandom?: number;
  recordedBy?: string;
}

export interface PrescriptionItem {
  id?: string;
  medicineName: string;
  dosage: string; // e.g. "500 mg"
  frequency: string; // e.g. "1-0-1" or "TDS"
  timing: "before_food" | "after_food" | "with_food" | "as_needed";
  durationDays: number;
  instructions?: string;
  quantity: number;
}

export interface DiagnosisEntry {
  icdCode: string;
  description: string;
  type: "provisional" | "differential" | "final";
}

export interface OpdConsultation {
  id: string;
  organizationId: string;
  branchId: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  consultationDate: string;
  vitals?: VitalRecord;
  chiefComplaints: string[];
  historyOfPresentIllness?: string;
  clinicalFindings?: string;
  diagnoses: DiagnosisEntry[];
  prescriptions: PrescriptionItem[];
  labInvestigationsRecommended?: string[];
  advice?: string;
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type BedStatus = "available" | "occupied" | "cleaning" | "maintenance" | "reserved";
export type WardType = "general" | "semi_private" | "private" | "icu" | "nicu" | "emergency";

export interface Bed {
  id: string;
  organizationId: string;
  branchId: string;
  wardId: string;
  wardName: string;
  wardType: WardType;
  bedNumber: string;
  status: BedStatus;
  dailyRate: number;
  currentPatientId?: string | null;
  currentAdmissionId?: string | null;
  patientName?: string | null;
}

export type IpdAdmissionStatus = "admitted" | "transferred" | "discharged" | "transferred_out";

export interface IpdAdmission {
  id: string;
  admissionNumber: string; // IPD-2026-0001
  organizationId: string;
  branchId: string;
  patientId: string;
  primaryDoctorId: string;
  wardId: string;
  bedId: string;
  admissionDate: string;
  expectedDischargeDate?: string;
  actualDischargeDate?: string;
  status: IpdAdmissionStatus;
  admissionReason: string;
  dischargeSummary?: {
    diagnosisAtDischarge: string;
    clinicalCourse: string;
    dischargePrescriptions: PrescriptionItem[];
    followUpInstructions: string;
  };
  totalAdvancePaid: number;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceType = "opd" | "ipd" | "pharmacy" | "lab" | "combined";
export type PaymentMode = "cash" | "upi" | "card" | "netbanking" | "insurance";
export type PaymentStatus = "pending" | "partially_paid" | "paid" | "refunded";

export interface InvoiceItem {
  id?: string;
  description: string;
  category: "consultation" | "procedure" | "room_rent" | "medicine" | "lab_test" | "nursing" | "other";
  quantity: number;
  unitPrice: number;
  gstRate: number; // e.g. 0, 5, 12, 18
  discountPercent?: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // INV-2026-0001
  organizationId: string;
  branchId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  invoiceType: InvoiceType;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode;
  transactionRef?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  organizationId: string;
  branchId: string;
  sku: string;
  name: string;
  genericName?: string;
  category: "tablet" | "syrup" | "injection" | "consumable" | "equipment";
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  quantityInStock: number;
  reorderLevel: number;
  purchasePrice: number;
  sellingPrice: number;
  gstRate: number;
  manufacturer?: string;
  rackLocation?: string;
}
