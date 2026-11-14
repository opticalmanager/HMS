/**
 * Hospital Management System (HMS) Role-Based Access Control (RBAC) & Permissions
 */

export type UserRole =
  | "super_admin"
  | "hospital_admin"
  | "doctor"
  | "nurse"
  | "receptionist"
  | "pharmacist"
  | "accountant"
  | "lab_technician";

export type PermissionAction = "create" | "read" | "update" | "delete" | "export" | "override";

export type ModuleName =
  | "reception"
  | "appointments"
  | "opd"
  | "ipd"
  | "patients"
  | "billing"
  | "inventory"
  | "diagnostic"
  | "whatsapp"
  | "staff"
  | "reports"
  | "settings"
  | "audit_logs"
  | "abdm";

export interface RolePermissions {
  role: UserRole;
  allowedModules: ModuleName[];
  canPrescribeMedications: boolean;
  canPerformDischarge: boolean;
  canWaiveDiscount: boolean;
  canAccessFinancialReports: boolean;
  canAccessPhiRecords: boolean;
  canManageStaff: boolean;
  canConfigureHospital: boolean;
}

export const ROLE_DEFINITIONS: Record<UserRole, RolePermissions> = {
  super_admin: {
    role: "super_admin",
    allowedModules: [
      "reception", "appointments", "opd", "ipd", "patients", "billing",
      "inventory", "diagnostic", "whatsapp", "staff", "reports", "settings", "audit_logs", "abdm"
    ],
    canPrescribeMedications: true,
    canPerformDischarge: true,
    canWaiveDiscount: true,
    canAccessFinancialReports: true,
    canAccessPhiRecords: true,
    canManageStaff: true,
    canConfigureHospital: true,
  },
  hospital_admin: {
    role: "hospital_admin",
    allowedModules: [
      "reception", "appointments", "opd", "ipd", "patients", "billing",
      "inventory", "diagnostic", "whatsapp", "staff", "reports", "settings", "audit_logs", "abdm"
    ],
    canPrescribeMedications: false,
    canPerformDischarge: true,
    canWaiveDiscount: true,
    canAccessFinancialReports: true,
    canAccessPhiRecords: true,
    canManageStaff: true,
    canConfigureHospital: true,
  },
  doctor: {
    role: "doctor",
    allowedModules: [
      "reception", "appointments", "opd", "ipd", "patients", "diagnostic", "abdm"
    ],
    canPrescribeMedications: true,
    canPerformDischarge: true,
    canWaiveDiscount: false,
    canAccessFinancialReports: false,
    canAccessPhiRecords: true,
    canManageStaff: false,
    canConfigureHospital: false,
  },
  nurse: {
    role: "nurse",
    allowedModules: [
      "reception", "appointments", "opd", "ipd", "patients", "diagnostic"
    ],
    canPrescribeMedications: false,
    canPerformDischarge: false,
    canWaiveDiscount: false,
    canAccessFinancialReports: false,
    canAccessPhiRecords: true,
    canManageStaff: false,
    canConfigureHospital: false,
  },
  receptionist: {
    role: "receptionist",
    allowedModules: [
      "reception", "appointments", "patients", "billing", "whatsapp"
    ],
    canPrescribeMedications: false,
    canPerformDischarge: false,
    canWaiveDiscount: false,
    canAccessFinancialReports: false,
    canAccessPhiRecords: false,
    canManageStaff: false,
    canConfigureHospital: false,
  },
  pharmacist: {
    role: "pharmacist",
    allowedModules: [
      "inventory", "billing", "opd", "patients"
    ],
    canPrescribeMedications: false,
    canPerformDischarge: false,
    canWaiveDiscount: false,
    canAccessFinancialReports: false,
    canAccessPhiRecords: false,
    canManageStaff: false,
    canConfigureHospital: false,
  },
  accountant: {
    role: "accountant",
    allowedModules: [
      "billing", "inventory", "reports"
    ],
    canPrescribeMedications: false,
    canPerformDischarge: false,
    canWaiveDiscount: true,
    canAccessFinancialReports: true,
    canAccessPhiRecords: false,
    canManageStaff: false,
    canConfigureHospital: false,
  },
  lab_technician: {
    role: "lab_technician",
    allowedModules: [
      "diagnostic", "patients"
    ],
    canPrescribeMedications: false,
    canPerformDischarge: false,
    canWaiveDiscount: false,
    canAccessFinancialReports: false,
    canAccessPhiRecords: false,
    canManageStaff: false,
    canConfigureHospital: false,
  },
};

export function hasPermission(
  role: UserRole,
  module: ModuleName
): boolean {
  const perms = ROLE_DEFINITIONS[role];
  return perms ? perms.allowedModules.includes(module) : false;
}
