# Apex HMS — Role-Based Access Control (RBAC) Matrix

## 1. Better Auth Multi-Tenant Clinic Roles (Phase B Architecture)

Better Auth manages clinic multi-tenancy (`1 Organization = 1 Clinic`) with custom role access control built using `createAccessControl` (`lib/auth-permissions.ts`). Four core clinic roles govern staff access across web panels, REST APIs, and AI copilot tools:

### 1. `owner` (Clinic Director / Primary Physician)
- **Authority**: Full, unrestricted administrative, financial, clinical, and tenant authority.
- **Allowed Statements**: Full permissions on `organization`, `member`, `invitation`, `clinic`, `team`, `patient`, `appointment`, `schedule`, `prescription`, `billing`, `knowledge`, `aiSettings`.
- **Special Capabilities**: Can delete organization (`organization:delete`), delete clinic profile (`clinic:delete`), approve prescriptions (`prescription:approve`), issue and void invoices, manage team members.

### 2. `admin` (Practice Manager / Clinic Operations)
- **Authority**: Comprehensive clinic operations, team invitations, and billing management.
- **Allowed Statements**: `organization:update`, `clinic:read/update`, `team:*`, `patient:*`, `appointment:*`, `schedule:*`, `prescription:read/draft`, `billing:*`, `knowledge:*`, `aiSettings:*`.
- **Strict Boundaries**: Cannot delete organization (`organization:delete`), cannot delete clinic (`clinic:delete`), and **CANNOT approve electronic prescriptions** (`prescription:approve`).

### 3. `doctor` (Consultant / Attending Clinician)
- **Authority**: Outpatient consultations, clinical diagnoses, vital signs, and prescription authorization.
- **Allowed Statements**: `clinic:read`, `patient:read/create/update`, `appointment:read/create/update/cancel`, `schedule:read/manage_own`, `prescription:read/draft/approve`, `billing:read/draft`, `knowledge:read`.
- **Strict Boundaries**: Cannot manage team members, cannot delete clinic/organization, cannot issue final financial invoices (`billing:issue`), cannot void bills (`billing:void`), cannot modify global AI settings.

### 4. `receptionist` (Front Desk / Cashier)
- **Authority**: Patient registration, queue token generation, appointment booking, and bill receipt collection.
- **Allowed Statements**: `clinic:read`, `patient:read/create/update`, `appointment:read/create/update/cancel`, `schedule:read`, `billing:read/draft/issue`, `knowledge:read`.
- **Strict Boundaries**: **CANNOT create or approve prescriptions** (`prescription:*`), cannot manage team members (`team:*`), cannot manage doctor schedules (`schedule:manage_*`), cannot void invoices (`billing:void`).

---

## 2. Resource Statements & Permission Matrix

| Resource | Available Actions | `owner` | `admin` | `doctor` | `receptionist` |
|---|---|:---:|:---:|:---:|:---:|
| `organization` | `update`, `delete` | All | `update` | — | — |
| `member` | `create`, `update`, `delete` | All | All | — | — |
| `invitation` | `create`, `cancel` | All | All | — | — |
| `clinic` | `read`, `update`, `delete` | All | `read`, `update` | `read` | `read` |
| `team` | `read`, `invite`, `update_role`, `remove` | All | All | — | — |
| `patient` | `read`, `create`, `update`, `delete` | All | All | `read`, `create`, `update` | `read`, `create`, `update` |
| `appointment` | `read`, `create`, `update`, `cancel` | All | All | All | All |
| `schedule` | `read`, `manage_own`, `manage_all` | All | All | `read`, `manage_own` | `read` |
| `prescription` | `read`, `draft`, `approve` | All | `read`, `draft` | All | — |
| `billing` | `read`, `draft`, `issue`, `void` | All | All | `read`, `draft` | `read`, `draft`, `issue` |
| `knowledge` | `read`, `manage` | All | All | `read` | `read` |
| `aiSettings` | `read`, `manage` | All | All | — | — |

---

## 3. High-Risk Clinical & Financial Invariants

1. **Mandatory Human-in-the-Loop (HITL) for Prescriptions**: AI models, nurses, and administrators can only create `draft` prescriptions. Only credentialed doctors and clinic owners (`prescription:approve`) can authorize electronic medical prescriptions.
2. **Sole Owner Protection**: A clinic must retain at least one active `owner`. The team management panel strictly prevents demoting or removing the last remaining owner.
3. **No Client Trust for Tenancy**: Neither `clinicId`, `organizationId`, nor user `role` is ever accepted from client HTTP request bodies, URL params, or AI tool calls. All permissions are verified server-side via `requireClinicSession()`.
4. **IDOR Hardening**: All individual entity queries (appointments, patients) combine `organization_id` equality with entity `id` equality to physically isolate data across tenants.
