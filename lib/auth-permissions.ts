import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

export const statement = {
  ...defaultStatements,
  patient: ["create", "read", "update", "delete"],
  appointment: ["create", "read", "update", "cancel"],
  prescription: ["create", "read", "update", "approve"],
  billing: ["create", "read", "update", "delete"],
  settings: ["read", "update"],
  apiKey: ["create", "read", "delete"],
  ai: ["dictate", "chat", "settings"],
} as const;

export const ac = createAccessControl(statement);

export const ownerRole = ac.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  patient: ["create", "read", "update", "delete"],
  appointment: ["create", "read", "update", "cancel"],
  prescription: ["create", "read", "update", "approve"],
  billing: ["create", "read", "update", "delete"],
  settings: ["read", "update"],
  apiKey: ["create", "read", "delete"],
  ai: ["dictate", "chat", "settings"],
});

export const adminRole = ac.newRole({
  organization: ["update"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  patient: ["create", "read", "update"],
  appointment: ["create", "read", "update", "cancel"],
  prescription: [],
  billing: ["create", "read", "update", "delete"],
  settings: ["read", "update"],
  apiKey: ["create", "read", "delete"],
  ai: ["chat"],
});

export const doctorRole = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  patient: ["create", "read", "update"],
  appointment: ["create", "read", "update", "cancel"],
  prescription: ["create", "read", "update", "approve"],
  billing: [],
  settings: ["read"],
  apiKey: [],
  ai: ["dictate", "chat"],
});

export const receptionistRole = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  patient: ["create", "read", "update"],
  appointment: ["create", "read", "update", "cancel"],
  prescription: [],
  billing: ["create", "read"],
  settings: [],
  apiKey: [],
  ai: [],
});

export const clinicRoles = {
  owner: ownerRole,
  admin: adminRole,
  doctor: doctorRole,
  receptionist: receptionistRole,
} as const;

export type ClinicRole = keyof typeof clinicRoles;
export type ClinicPermissionStatement = typeof statement;
