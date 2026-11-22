import { describe, it } from "node:test";
import assert from "node:assert";
import { ac, ownerRole, adminRole, doctorRole, receptionistRole, clinicRoles } from "../lib/auth-permissions";
import { requireClinicSession, ClinicAuthError } from "../lib/auth-guard";
import { auth } from "../lib/auth";
import * as authRouteHandler from "../app/api/auth/[...all]/route";

describe("Better Auth Multi-Tenant RBAC & Clinical Access Control Suite", () => {
  describe("Role-Based Access Control Statements Matrix", () => {
    it("owner has full clinical, financial, team, and organization administrative authority", () => {
      // Organization lifecycle
      assert.strictEqual(ownerRole.authorize({ organization: ["update"] }).success, true);
      assert.strictEqual(ownerRole.authorize({ organization: ["delete"] }).success, true);

      // Team & member management
      assert.strictEqual(ownerRole.authorize({ member: ["create"] }).success, true);
      assert.strictEqual(ownerRole.authorize({ invitation: ["create"] }).success, true);

      // Clinical operations
      assert.strictEqual(ownerRole.authorize({ patient: ["create", "read", "update", "delete"] }).success, true);
      assert.strictEqual(ownerRole.authorize({ appointment: ["create", "read", "update", "cancel"] }).success, true);
      assert.strictEqual(ownerRole.authorize({ prescription: ["create", "read", "update", "approve"] }).success, true);

      // Billing & tariffs
      assert.strictEqual(ownerRole.authorize({ billing: ["create", "read", "update", "delete"] }).success, true);

      // Settings, API keys & AI
      assert.strictEqual(ownerRole.authorize({ settings: ["read", "update"] }).success, true);
      assert.strictEqual(ownerRole.authorize({ apiKey: ["create", "read", "delete"] }).success, true);
      assert.strictEqual(ownerRole.authorize({ ai: ["dictate", "chat", "settings"] }).success, true);
    });

    it("admin can manage operations and team, but CANNOT delete organization or prescribe", () => {
      // Allowed admin actions
      assert.strictEqual(adminRole.authorize({ organization: ["update"] }).success, true);
      assert.strictEqual(adminRole.authorize({ member: ["create", "update", "delete"] }).success, true);
      assert.strictEqual(adminRole.authorize({ invitation: ["create", "cancel"] }).success, true);
      assert.strictEqual(adminRole.authorize({ patient: ["create", "read", "update"] }).success, true);
      assert.strictEqual(adminRole.authorize({ appointment: ["create", "read", "update", "cancel"] }).success, true);
      assert.strictEqual(adminRole.authorize({ billing: ["create", "read", "update", "delete"] }).success, true);
      assert.strictEqual(adminRole.authorize({ settings: ["read", "update"] }).success, true);
      assert.strictEqual(adminRole.authorize({ apiKey: ["create", "read", "delete"] }).success, true);
      assert.strictEqual(adminRole.authorize({ ai: ["chat"] }).success, true);

      // Disallowed admin actions
      assert.strictEqual(adminRole.authorize({ organization: ["delete"] }).success, false);
      assert.strictEqual(adminRole.authorize({ prescription: ["create"] }).success, false);
      assert.strictEqual(adminRole.authorize({ prescription: ["approve"] }).success, false);
      assert.strictEqual(adminRole.authorize({ ai: ["dictate"] }).success, false);
      assert.strictEqual(adminRole.authorize({ ai: ["settings"] }).success, false);
    });

    it("doctor has clinical & prescription authority, but CANNOT manage team or delete clinic", () => {
      // Allowed doctor actions
      assert.strictEqual(doctorRole.authorize({ patient: ["create", "read", "update"] }).success, true);
      assert.strictEqual(doctorRole.authorize({ appointment: ["create", "read", "update", "cancel"] }).success, true);
      assert.strictEqual(doctorRole.authorize({ prescription: ["create", "read", "update", "approve"] }).success, true);
      assert.strictEqual(doctorRole.authorize({ settings: ["read"] }).success, true);
      assert.strictEqual(doctorRole.authorize({ ai: ["dictate", "chat"] }).success, true);

      // Disallowed doctor actions
      assert.strictEqual(doctorRole.authorize({ organization: ["update"] }).success, false);
      assert.strictEqual(doctorRole.authorize({ organization: ["delete"] }).success, false);
      assert.strictEqual(doctorRole.authorize({ member: ["create"] }).success, false);
      assert.strictEqual(doctorRole.authorize({ invitation: ["create"] }).success, false);
      assert.strictEqual(doctorRole.authorize({ billing: ["create"] }).success, false);
      assert.strictEqual(doctorRole.authorize({ billing: ["delete"] }).success, false);
      assert.strictEqual(doctorRole.authorize({ settings: ["update"] }).success, false);
      assert.strictEqual(doctorRole.authorize({ apiKey: ["create"] }).success, false);
      assert.strictEqual(doctorRole.authorize({ ai: ["settings"] }).success, false);
    });

    it("receptionist can register patients, book appointments, and collect bills, but CANNOT prescribe", () => {
      // Allowed receptionist actions
      assert.strictEqual(receptionistRole.authorize({ patient: ["create", "read", "update"] }).success, true);
      assert.strictEqual(receptionistRole.authorize({ appointment: ["create", "read", "update", "cancel"] }).success, true);
      assert.strictEqual(receptionistRole.authorize({ billing: ["create", "read"] }).success, true);

      // Disallowed receptionist actions
      assert.strictEqual(receptionistRole.authorize({ prescription: ["create"] }).success, false);
      assert.strictEqual(receptionistRole.authorize({ prescription: ["approve"] }).success, false);
      assert.strictEqual(receptionistRole.authorize({ billing: ["delete"] }).success, false);
      assert.strictEqual(receptionistRole.authorize({ organization: ["update"] }).success, false);
      assert.strictEqual(receptionistRole.authorize({ member: ["create"] }).success, false);
      assert.strictEqual(receptionistRole.authorize({ settings: ["read"] }).success, false);
      assert.strictEqual(receptionistRole.authorize({ apiKey: ["create"] }).success, false);
      assert.strictEqual(receptionistRole.authorize({ ai: ["dictate"] }).success, false);
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
    it("rejects unauthenticated requests with ClinicAuthError (401)", async () => {
      const emptyHeaders = new Headers();
      await assert.rejects(
        async () => {
          await requireClinicSession(undefined, {
            headers: emptyHeaders,
            redirectIfUnauthorized: false,
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof ClinicAuthError);
          assert.strictEqual(err.status, 401);
          assert.strictEqual(err.code, "UNAUTHENTICATED");
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
          // Next.js redirect throws an error with digest NEXT_REDIRECT
          assert.ok(err !== null && typeof err === "object");
          assert.ok("digest" in err || (err as Error).message.includes("NEXT_REDIRECT"));
          return true;
        }
      );
    });

    it("rejects authenticated session with missing activeOrganizationId (403 NO_ACTIVE_CLINIC)", async () => {
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
          assert.ok(err instanceof ClinicAuthError);
          assert.strictEqual(err.status, 403);
          assert.strictEqual(err.code, "NO_ACTIVE_CLINIC");
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
          assert.ok(err instanceof ClinicAuthError);
          assert.strictEqual(err.status, 403);
          assert.strictEqual(err.code, "FORBIDDEN");
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
      const result = await requireClinicSession({ prescription: ["create"] }, {
        session: mockSession,
        role: "doctor",
        redirectIfUnauthorized: false,
      });
      assert.strictEqual(result.clinicId, "clinic-uuid-001");
      assert.strictEqual(result.role, "doctor");
      assert.strictEqual(result.user.id, "u-doc-1");

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
          assert.ok(err instanceof ClinicAuthError);
          assert.strictEqual(err.status, 403);
          assert.strictEqual(err.code, "FORBIDDEN");
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
          await requireClinicSession({ prescription: ["create"] }, {
            session: mockSession,
            role: "receptionist",
            redirectIfUnauthorized: false,
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof ClinicAuthError);
          assert.strictEqual(err.status, 403);
          assert.strictEqual(err.code, "FORBIDDEN");
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
          await requireClinicSession({ organization: ["delete"] }, {
            session: mockSession,
            role: "admin",
            redirectIfUnauthorized: false,
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof ClinicAuthError);
          assert.strictEqual(err.status, 403);
          assert.strictEqual(err.code, "FORBIDDEN");
          return true;
        }
      );
    });

    it("enforces RBAC permissions: allows owner unrestricted access including deleting clinic", async () => {
      const mockSession = {
        user: { id: "u-owner-1", email: "owner@clinic.com", name: "Dr. Director" },
        session: { id: "s-owner-1", userId: "u-owner-1", activeOrganizationId: "clinic-uuid-001" },
      };

      const result = await requireClinicSession({ organization: ["delete"] }, {
        session: mockSession,
        role: "owner",
        redirectIfUnauthorized: false,
      });
      assert.strictEqual(result.clinicId, "clinic-uuid-001");
      assert.strictEqual(result.role, "owner");
    });

    it("enforces ClinicAuthError contract with status and code properties", () => {
      const customErr = new ClinicAuthError("Custom error message", 403, "FORBIDDEN_CUSTOM");
      assert.strictEqual(customErr.message, "Custom error message");
      assert.strictEqual(customErr.status, 403);
      assert.strictEqual(customErr.code, "FORBIDDEN_CUSTOM");
      assert.strictEqual(customErr.name, "ClinicAuthError");
    });
  });
});
