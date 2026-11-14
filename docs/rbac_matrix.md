# Apex HMS — Role-Based Access Control (RBAC) Matrix

## 1. 12 Core Hospital Roles

Apex HMS implements an enterprise 12-role granular permission security model:

1. **`super_admin`**: Global system architect & multisite administrator.
2. **`hospital_admin`**: Hospital general manager / operations director.
3. **`medical_director`**: Chief Medical Officer & clinical quality officer.
4. **`senior_consultant`**: Specialist & super-specialist attending clinician.
5. **`junior_resident`**: Resident doctor / duty medical officer.
6. **`chief_nursing_officer`**: Inpatient nursing supervisor and duty roster manager.
7. **`staff_nurse`**: Ward and ICU bedside nurse administering medication records (MAR).
8. **`pharmacist`**: Central pharmacy dispenser and GRN receiving manager.
9. **`chief_cashier`**: Billing supervisor and shift drawer reconciliation executive.
10. **`receptionist`**: Front desk registration and OPD token queue coordinator.
11. **`lab_technician`**: Pathology, biochemistry, and hematology specimen processor.
12. **`radiologist`**: Imaging consultant reporting X-rays, USG, and CT diagnostics.

---

## 2. 12-Role Granular Permission Security Matrix

| Role | View PHI | Edit EMR | Prescribe Rx | Admit/Discharge | Dispense Meds | Bill & Collect | Issue Discounts | Cancel Invoices | Financial Reports | Manage Staff | System Config | Export Audit |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Super Admin** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **Hospital Admin** | Yes | No | No | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **Medical Director** | Yes | Yes | Yes | Yes | No | No | Yes | No | Yes | Yes | No | Yes |
| **Senior Consultant** | Yes | Yes | Yes | Yes | No | No | No | No | Yes | No | No | No |
| **Junior Resident** | Yes | Yes | Yes | Yes | No | No | No | No | No | No | No | No |
| **Chief Nursing Officer** | Yes | Yes | No | Yes | No | No | No | No | No | Yes | No | No |
| **Staff Nurse** | Yes | Yes | No | No | No | No | No | No | No | No | No | No |
| **Pharmacist** | Yes | No | No | No | Yes | Yes | No | No | No | No | No | No |
| **Chief Cashier** | No | No | No | No | No | Yes | Yes | Yes | Yes | No | No | No |
| **Receptionist** | No | No | No | No | No | Yes | No | No | No | No | No | No |
| **Lab Technician** | Yes | No | No | No | No | No | No | No | No | No | No | No |
| **Radiologist** | Yes | Yes | No | No | No | No | No | No | No | No | No | No |

---

## 3. High-Risk Clinical & Financial Safeguards

- **Strict Medication Prescription Authorization**: Only accredited clinicians with council registration numbers can sign electronic prescriptions (`prescribe_medications`).
- **Financial Discount Authorizations**: Routine receptionists are prohibited from waiving clinical fees; discounts require `chief_cashier`, `medical_director`, or `super_admin` approval.
- **Cashier Shift Drawer Balancing**: Every cashier shift requires an explicit opening float declaration, cash drop records, and end-of-shift cash counting reconciliation with variance logging.
- **Protected Health Information (PHI) Audit Trail**: Every access, edit, or prescription action creates an immutable record in the audit vault capturing the timestamp, user, role, module, entity, and client IP address.
