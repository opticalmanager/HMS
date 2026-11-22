import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

export const statement = {
  ...defaultStatements,
  clinic: ["read", "update", "delete"],
  team: ["read", "invite", "update_role", "remove"],
  patient: ["read", "create", "update", "delete"],
  appointment: ["read", "create", "update", "cancel"],
  schedule: ["read", "manage_own", "manage_all"],
  prescription: ["read", "draft", "approve"],
  billing: ["read", "draft", "issue", "void"],
  knowledge: ["read", "manage"],
  aiSettings: ["read", "manage"],
} as const;

export const ac = createAccessControl(statement);

export const ownerRole = ac.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  clinic: ["read", "update", "delete"],
  team: ["read", "invite", "update_role", "remove"],
  patient: ["read", "create", "update", "delete"],
  appointment: ["read", "create", "update", "cancel"],
  schedule: ["read", "manage_own", "manage_all"],
  prescription: ["read", "draft", "approve"],
  billing: ["read", "draft", "issue", "void"],
  knowledge: ["read", "manage"],
  aiSettings: ["read", "manage"],
});

export const adminRole = ac.newRole({
  organization: ["update"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  clinic: ["read", "update"],
  team: ["read", "invite", "update_role", "remove"],
  patient: ["read", "create", "update", "delete"],
  appointment: ["read", "create", "update", "cancel"],
  schedule: ["read", "manage_own", "manage_all"],
  prescription: ["read", "draft"],
  billing: ["read", "draft", "issue", "void"],
  knowledge: ["read", "manage"],
  aiSettings: ["read", "manage"],
});

export const doctorRole = ac.newRole({
  clinic: ["read"],
  patient: ["read", "create", "update"],
  appointment: ["read", "create", "update", "cancel"],
  schedule: ["read", "manage_own"],
  prescription: ["read", "draft", "approve"],
  billing: ["read", "draft"],
  knowledge: ["read"],
});

export const receptionistRole = ac.newRole({
  clinic: ["read"],
  patient: ["read", "create", "update"],
  appointment: ["read", "create", "update", "cancel"],
  schedule: ["read"],
  billing: ["read", "draft", "issue"],
  knowledge: ["read"],
});

export const clinicRoles = {
  owner: ownerRole,
  admin: adminRole,
  doctor: doctorRole,
  receptionist: receptionistRole,
} as const;

export type ClinicRole = keyof typeof clinicRoles;
export type ClinicPermissionStatement = typeof statement;
