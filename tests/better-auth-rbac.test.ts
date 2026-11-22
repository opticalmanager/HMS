import { describe, it } from "node:test";
import assert from "node:assert";
import { ac, ownerRole, adminRole, doctorRole, receptionistRole, clinicRoles } from "../lib/auth-permissions";
import {
  requireClinicSession,
  requirePageSession,
  handleAuthError,
  ClinicAuthError,
  UnauthorizedError,
  NoActiveClinicError,
  ForbiddenError,
} from "../lib/auth-guard";
import { auth } from "../lib/auth";
import * as authRouteHandler from "../app/api/auth/[...all]/route";

describe("Better Auth Multi-Tenant RBAC & Clinical Access Control Suite", () => {
  describe("Role-Based Access Control Statements Matrix", () => {
    it("owner has full clinical, financial, team, and organization administrative authority", () => {
      // Organization lifecycle
      assert.strictEqual(ownerRole.authorize({ organization: ["update"] }).success, true);
      assert.strictEqual(ownerRole.authorize({ organization: ["delete"] }).success, true);
      assert.strictEqual(ownerRole.authorize({ clinic: ["read", "update", "delete"] }).success, true);

      // Team & member management
      assert.strictEqual(ownerRole.authorize({ member: ["create", "update", "delete"] }).success, true);
      assert.strictEqual(ownerRole.authorize({ invitation: ["create", "cancel"] }).success, true);
      assert.strictEqual(ownerRole.authorize({ team: ["read", "invite", "update_role", "remove"] }).success, true);

      // Clinical operations
      assert.strictEqual(ownerRole.authorize({ patient: ["read", "create", "update", "delete"] }).success, true);
      assert.strictEqual(ownerRole.authorize({ appointment: ["read", "create", "update", "cancel"] }).success, true);
      assert.strictEqual(ownerRole.authorize({ schedule: ["read", "manage_own", "manage_all"] }).success, true);
      assert.strictEqual(ownerRole.authorize({ prescription: ["read", "draft", "approve"] }).success, true);

      // Billing & tariffs
      assert.strictEqual(ownerRole.authorize({ billing: ["read", "draft", "issue", "void"] }).success, true);

      // Knowledge & AI settings
      assert.strictEqual(ownerRole.authorize({ knowledge: ["read", "manage"] }).success, true);
      assert.strictEqual(ownerRole.authorize({ aiSettings: ["read", "manage"] }).success, true);
    });

    it("admin can manage operations and team, but CANNOT delete organization, delete clinic, or approve prescriptions", () => {
      // Allowed admin actions
      assert.strictEqual(adminRole.authorize({ organization: ["update"] }).success, true);
      assert.strictEqual(adminRole.authorize({ member: ["create", "update", "delete"] }).success, true);
      assert.strictEqual(adminRole.authorize({ invitation: ["create", "cancel"] }).success, true);
      assert.strictEqual(adminRole.authorize({ clinic: ["read", "update"] }).success, true);
      assert.strictEqual(adminRole.authorize({ team: ["read", "invite", "update_role", "remove"] }).success, true);
      assert.strictEqual(adminRole.authorize({ patient: ["read", "create", "update", "delete"] }).success, true);
      assert.strictEqual(adminRole.authorize({ appointment: ["read", "create", "update", "cancel"] }).success, true);
      assert.strictEqual(adminRole.authorize({ schedule: ["read", "manage_own", "manage_all"] }).success, true);
      assert.strictEqual(adminRole.authorize({ prescription: ["read", "draft"] }).success, true);
      assert.strictEqual(adminRole.authorize({ billing: ["read", "draft", "issue", "void"] }).success, true);
      assert.strictEqual(adminRole.authorize({ knowledge: ["read", "manage"] }).success, true);
      assert.strictEqual(adminRole.authorize({ aiSettings: ["read", "manage"] }).success, true);

      // Disallowed admin actions
      assert.strictEqual(adminRole.authorize({ organization: ["delete"] }).success, false);
      assert.strictEqual(adminRole.authorize({ clinic: ["delete"] }).success, false);
      assert.strictEqual(adminRole.authorize({ prescription: ["approve"] }).success, false);
    });

    it("doctor has clinical & prescription authority, but CANNOT manage team, delete clinic, or issue final bills", () => {
      // Allowed doctor actions
      assert.strictEqual(doctorRole.authorize({ clinic: ["read"] }).success, true);
      assert.strictEqual(doctorRole.authorize({ patient: ["read", "create", "update"] }).success, true);
      assert.strictEqual(doctorRole.authorize({ appointment: ["read", "create", "update", "cancel"] }).success, true);
      assert.strictEqual(doctorRole.authorize({ schedule: ["read", "manage_own"] }).success, true);
      assert.strictEqual(doctorRole.authorize({ prescription: ["read", "draft", "approve"] }).success, true);
      assert.strictEqual(doctorRole.authorize({ billing: ["read", "draft"] }).success, true);
      assert.strictEqual(doctorRole.authorize({ knowledge: ["read"] }).success, true);

      // Disallowed doctor actions
      assert.strictEqual(doctorRole.authorize({ clinic: ["update"] }).success, false);
      assert.strictEqual(doctorRole.authorize({ clinic: ["delete"] }).success, false);
      assert.strictEqual(doctorRole.authorize({ organization: ["delete"] }).success, false);
      assert.strictEqual(doctorRole.authorize({ team: ["invite"] }).success, false);
      assert.strictEqual(doctorRole.authorize({ schedule: ["manage_all"] }).success, false);
      assert.strictEqual(doctorRole.authorize({ billing: ["issue"] }).success, false);
      assert.strictEqual(doctorRole.authorize({ billing: ["void"] }).success, false);
      assert.strictEqual(doctorRole.authorize({ aiSettings: ["manage"] }).success, false);
    });

    it("receptionist can register patients, book appointments, and issue bills, but CANNOT prescribe", () => {
      // Allowed receptionist actions
      assert.strictEqual(receptionistRole.authorize({ clinic: ["read"] }).success, true);
      assert.strictEqual(receptionistRole.authorize({ patient: ["read", "create", "update"] }).success, true);
      assert.strictEqual(receptionistRole.authorize({ appointment: ["read", "create", "update", "cancel"] }).success, true);
      assert.strictEqual(receptionistRole.authorize({ schedule: ["read"] }).success, true);
      assert.strictEqual(receptionistRole.authorize({ billing: ["read", "draft", "issue"] }).success, true);
      assert.strictEqual(receptionistRole.authorize({ knowledge: ["read"] }).success, true);

      // Disallowed receptionist actions
      assert.strictEqual(receptionistRole.authorize({ prescription: ["draft"] }).success, false);
      assert.strictEqual(receptionistRole.authorize({ prescription: ["approve"] }).success, false);
      assert.strictEqual(receptionistRole.authorize({ schedule: ["manage_own"] }).success, false);
      assert.strictEqual(receptionistRole.authorize({ schedule: ["manage_all"] }).success, false);
      assert.strictEqual(receptionistRole.authorize({ billing: ["void"] }).success, false);
      assert.strictEqual(receptionistRole.authorize({ team: ["invite"] }).success, false);
      assert.strictEqual(receptionistRole.authorize({ clinic: ["update"] }).success, false);
      assert.strictEqual(receptionistRole.authorize({ organization: ["delete"] }).success, false);
    });

    it("exports all 4 clinic roles in clinicRoles registry", () => {
      assert.ok(clinicRoles.owner);
      assert.ok(clinicRoles.admin);
      assert.ok(clinicRoles.doctor);
      assert.ok(clinicRoles.receptionist);
      assert.strictEqual(Object.keys(clinicRoles).length, 4);
    });
  });

  describe("Auth Server Engine & Plugin Integrity", () => {
    it("initializes Better Auth server instance with organization and apiKey plugins", () => {
      assert.ok(auth);
      assert.ok(auth.api);
      assert.strictEqual(typeof auth.handler, "function");
      assert.strictEqual(typeof auth.api.getSession, "function");
    });

    it("includes custom access control ac instance", () => {
      assert.ok(ac);
      assert.strictEqual(typeof ac.newRole, "function");
    });

    it("exports all required HTTP methods in Better Auth API route handler", () => {
      assert.strictEqual(typeof authRouteHandler.GET, "function");
      assert.strictEqual(typeof authRouteHandler.POST, "function");
      assert.strictEqual(typeof authRouteHandler.PATCH, "function");
      assert.strictEqual(typeof authRouteHandler.PUT, "function");
      assert.strictEqual(typeof authRouteHandler.DELETE, "function");
    });
  });

  describe("requireClinicSession Guard & Security Invariants", () => {
    it("rejects unauthenticated requests with UnauthorizedError (401)", async () => {
      const emptyHeaders = new Headers();
      await assert.rejects(
        async () => {
          await requireClinicSession(undefined, {
            headers: emptyHeaders,
            redirectIfUnauthorized: false,
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof UnauthorizedError);
          assert.ok(err instanceof ClinicAuthError);
          assert.strictEqual((err as ClinicAuthError).status, 401);
          assert.strictEqual((err as ClinicAuthError).code, "UNAUTHENTICATED");
          return true;
        }
      );
    });

    it("redirects unauthenticated requests to /login when redirectIfUnauthorized is true", async () => {
      const emptyHeaders = new Headers();
      await assert.rejects(
        async () => {
          await requireClinicSession(undefined, {
            headers: emptyHeaders,
            redirectIfUnauthorized: true,
          });
        },
        (err: unknown) => {
          assert.ok(err !== null && typeof err === "object");
          assert.ok("digest" in err || (err as Error).message.includes("NEXT_REDIRECT"));
          return true;
        }
      );
    });

    it("rejects authenticated session with missing activeOrganizationId (409 NO_ACTIVE_CLINIC)", async () => {
      const mockSessionWithoutOrg = {
        user: { id: "u-1", email: "test@clinic.com", name: "Test User" },
        session: { id: "s-1", userId: "u-1", activeOrganizationId: null },
      };

      await assert.rejects(
        async () => {
          await requireClinicSession(undefined, {
            session: mockSessionWithoutOrg,
            redirectIfUnauthorized: false,
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof NoActiveClinicError);
          assert.ok(err instanceof ClinicAuthError);
          assert.strictEqual((err as ClinicAuthError).status, 409);
          assert.strictEqual((err as ClinicAuthError).code, "NO_ACTIVE_CLINIC");
          return true;
        }
      );
    });

    it("redirects session without activeOrganizationId to /onboarding when redirectIfUnauthorized is true", async () => {
      const mockSessionWithoutOrg = {
        user: { id: "u-1", email: "test@clinic.com", name: "Test User" },
        session: { id: "s-1", userId: "u-1", activeOrganizationId: null },
      };

      await assert.rejects(
        async () => {
          await requireClinicSession(undefined, {
            session: mockSessionWithoutOrg,
            redirectIfUnauthorized: true,
          });
        },
        (err: unknown) => {
          assert.ok(err !== null && typeof err === "object");
          assert.ok("digest" in err || (err as Error).message.includes("NEXT_REDIRECT"));
          return true;
        }
      );
    });

    it("rejects session with invalid or unknown clinical role", async () => {
      const mockSession = {
        user: { id: "u-1", email: "attacker@clinic.com", name: "Attacker" },
        session: { id: "s-1", userId: "u-1", activeOrganizationId: "org-uuid-001" },
      };

      await assert.rejects(
        async () => {
          await requireClinicSession(undefined, {
            session: mockSession,
            role: "super_hacker" as unknown as "doctor",
            redirectIfUnauthorized: false,
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof ForbiddenError);
          assert.ok(err instanceof ClinicAuthError);
          assert.strictEqual((err as ClinicAuthError).status, 403);
          assert.strictEqual((err as ClinicAuthError).code, "FORBIDDEN");
          return true;
        }
      );
    });

    it("enforces RBAC permissions: allows doctor to prescribe but blocks deleting organization", async () => {
      const mockSession = {
        user: { id: "u-doc-1", email: "doctor@clinic.com", name: "Dr. Sharma" },
        session: { id: "s-doc-1", userId: "u-doc-1", activeOrganizationId: "clinic-uuid-001" },
      };

      // Allowed action
      const result = await requireClinicSession({ prescription: ["approve"] }, {
        session: mockSession,
        role: "doctor",
        redirectIfUnauthorized: false,
      });
      assert.strictEqual(result.clinicId, "clinic-uuid-001");
      assert.strictEqual(result.role, "doctor");
      assert.strictEqual(result.user.id, "u-doc-1");
      assert.ok(result.memberId);

      // Disallowed action
      await assert.rejects(
        async () => {
          await requireClinicSession({ organization: ["delete"] }, {
            session: mockSession,
            role: "doctor",
            redirectIfUnauthorized: false,
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof ForbiddenError);
          assert.ok(err instanceof ClinicAuthError);
          assert.strictEqual((err as ClinicAuthError).status, 403);
          assert.strictEqual((err as ClinicAuthError).code, "FORBIDDEN");
          return true;
        }
      );
    });

    it("enforces RBAC permissions: allows receptionist to register patient but blocks prescribing", async () => {
      const mockSession = {
        user: { id: "u-rec-1", email: "reception@clinic.com", name: "Desk Staff" },
        session: { id: "s-rec-1", userId: "u-rec-1", activeOrganizationId: "clinic-uuid-001" },
      };

      // Allowed action
      const result = await requireClinicSession({ patient: ["create"] }, {
        session: mockSession,
        role: "receptionist",
        redirectIfUnauthorized: false,
      });
      assert.strictEqual(result.clinicId, "clinic-uuid-001");
      assert.strictEqual(result.role, "receptionist");

      // Disallowed action
      await assert.rejects(
        async () => {
          await requireClinicSession({ prescription: ["approve"] }, {
            session: mockSession,
            role: "receptionist",
            redirectIfUnauthorized: false,
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof ForbiddenError);
          assert.ok(err instanceof ClinicAuthError);
          assert.strictEqual((err as ClinicAuthError).status, 403);
          assert.strictEqual((err as ClinicAuthError).code, "FORBIDDEN");
          return true;
        }
      );
    });

    it("enforces RBAC permissions: allows admin to manage members but blocks deleting clinic", async () => {
      const mockSession = {
        user: { id: "u-adm-1", email: "admin@clinic.com", name: "Clinic Admin" },
        session: { id: "s-adm-1", userId: "u-adm-1", activeOrganizationId: "clinic-uuid-001" },
      };

      // Allowed action
      const result = await requireClinicSession({ member: ["create"] }, {
        session: mockSession,
        role: "admin",
        redirectIfUnauthorized: false,
      });
      assert.strictEqual(result.clinicId, "clinic-uuid-001");
      assert.strictEqual(result.role, "admin");

      // Disallowed action
      await assert.rejects(
        async () => {
          await requireClinicSession({ clinic: ["delete"] }, {
            session: mockSession,
            role: "admin",
            redirectIfUnauthorized: false,
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof ForbiddenError);
          assert.ok(err instanceof ClinicAuthError);
          assert.strictEqual((err as ClinicAuthError).status, 403);
          assert.strictEqual((err as ClinicAuthError).code, "FORBIDDEN");
          return true;
        }
      );
    });

    it("enforces RBAC permissions: allows owner unrestricted access including deleting clinic", async () => {
      const mockSession = {
        user: { id: "u-owner-1", email: "owner@clinic.com", name: "Dr. Director" },
        session: { id: "s-owner-1", userId: "u-owner-1", activeOrganizationId: "clinic-uuid-001" },
      };

      const result = await requireClinicSession({ clinic: ["delete"] }, {
        session: mockSession,
        role: "owner",
        redirectIfUnauthorized: false,
      });
      assert.strictEqual(result.clinicId, "clinic-uuid-001");
      assert.strictEqual(result.role, "owner");
    });

    it("enforces typed error hierarchy and handleAuthError utility", () => {
      const unauth = new UnauthorizedError();
      assert.strictEqual(unauth.status, 401);
      assert.strictEqual(unauth.code, "UNAUTHENTICATED");
      assert.ok(unauth instanceof ClinicAuthError);

      const noClinic = new NoActiveClinicError();
      assert.strictEqual(noClinic.status, 409);
      assert.strictEqual(noClinic.code, "NO_ACTIVE_CLINIC");
      assert.ok(noClinic instanceof ClinicAuthError);

      const forbidden = new ForbiddenError();
      assert.strictEqual(forbidden.status, 403);
      assert.strictEqual(forbidden.code, "FORBIDDEN");
      assert.ok(forbidden instanceof ClinicAuthError);

      const response = handleAuthError(unauth);
      assert.strictEqual(response.status, 401);
    });
  });

  describe("requirePageSession Server Component Guard", () => {
    it("redirects unauthenticated request to /login", async () => {
      const emptyHeaders = new Headers();
      await assert.rejects(
        async () => {
          await requirePageSession({ headers: emptyHeaders });
        },
        (err: unknown) => {
          assert.ok(err !== null && typeof err === "object");
          assert.ok("digest" in err || (err as Error).message.includes("NEXT_REDIRECT"));
          return true;
        }
      );
    });

    it("redirects session without active organization to /onboarding", async () => {
      const mockSession = {
        user: { id: "u-1", email: "test@clinic.com", name: "Test User" },
        session: { id: "s-1", userId: "u-1", activeOrganizationId: null },
      };
      await assert.rejects(
        async () => {
          await requirePageSession({ session: mockSession });
        },
        (err: unknown) => {
          assert.ok(err !== null && typeof err === "object");
          assert.ok("digest" in err || (err as Error).message.includes("NEXT_REDIRECT"));
          return true;
        }
      );
    });

    it("returns active clinic session result when authenticated with valid role", async () => {
      const mockSession = {
        user: { id: "u-doc-1", email: "doc@clinic.com", name: "Dr. Doc" },
        session: { id: "s-doc-1", userId: "u-doc-1", activeOrganizationId: "clinic-uuid-001" },
      };
      const result = await requirePageSession({
        session: mockSession,
        role: "doctor",
      });
      assert.strictEqual(result.clinicId, "clinic-uuid-001");
      assert.strictEqual(result.role, "doctor");
      assert.strictEqual(result.user.id, "u-doc-1");
      assert.ok(result.memberId);
    });
  });

  describe("IDOR Hardened CRM API Route Handlers", () => {
    it("rejects unauthenticated request to /api/crm/appointments/[id] with 401 UNAUTHENTICATED", async () => {
      const { NextRequest } = await import("next/server");
      const appointmentIdRoute = await import("../app/api/crm/appointments/[id]/route");

      const req = new NextRequest("http://localhost:3000/api/crm/appointments/123e4567-e89b-12d3-a456-426614174000");
      const res = await appointmentIdRoute.GET(req, {
        params: Promise.resolve({ id: "123e4567-e89b-12d3-a456-426614174000" }),
      });
      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.code, "UNAUTHENTICATED");
    });

    it("rejects unauthenticated request to /api/crm/patients/[id] with 401 UNAUTHENTICATED", async () => {
      const { NextRequest } = await import("next/server");
      const patientIdRoute = await import("../app/api/crm/patients/[id]/route");

      const req = new NextRequest("http://localhost:3000/api/crm/patients/123e4567-e89b-12d3-a456-426614174000");
      const res = await patientIdRoute.GET(req, {
        params: Promise.resolve({ id: "123e4567-e89b-12d3-a456-426614174000" }),
      });
      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.code, "UNAUTHENTICATED");
    });
  });
});
