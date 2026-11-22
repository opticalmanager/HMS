import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { clinicRoles, type ClinicRole } from "./auth-permissions";

export class ClinicAuthError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 401, code = "UNAUTHORIZED") {
    super(message);
    this.name = "ClinicAuthError";
    this.status = status;
    this.code = code;
  }
}

export interface RequireClinicSessionOptions {
  headers?: Headers;
  redirectIfUnauthorized?: boolean;
  // Optional pre-resolved session for unit testing and internal server-to-server contexts
  session?: {
    user: {
      id: string;
      email: string;
      name: string;
      [key: string]: unknown;
    };
    session: {
      id: string;
      userId: string;
      activeOrganizationId?: string | null;
      [key: string]: unknown;
    };
  } | null;
  // Optional pre-resolved role for unit testing
  role?: ClinicRole;
}

export interface ClinicSessionResult {
  user: {
    id: string;
    email: string;
    name: string;
    [key: string]: unknown;
  };
  session: {
    id: string;
    userId: string;
    activeOrganizationId?: string | null;
    [key: string]: unknown;
  };
  clinicId: string;
  role: ClinicRole;
}

/**
 * Validates the Better Auth session and ensures the user belongs to an active clinic organization.
 * Enforces RBAC permissions through Better Auth's hasPermission API and custom access control matrices.
 * Never trusts client-supplied organizationId/clinicId.
 */
export async function requireClinicSession(
  requiredPermission?: Record<string, string[]>,
  options?: RequireClinicSessionOptions
): Promise<ClinicSessionResult> {
  let reqHeaders: Headers;
  try {
    reqHeaders = options?.headers ?? (await headers());
  } catch {
    reqHeaders = new Headers();
  }

  const shouldRedirect = options?.redirectIfUnauthorized ?? true;

  // 1. Validate session from request headers (or trusted testing override)
  let session = options?.session;
  if (session === undefined) {
    session = await auth.api.getSession({
      headers: reqHeaders,
    });
  }

  if (!session || !session.user || !session.session) {
    if (shouldRedirect) {
      redirect("/login");
    }
    throw new ClinicAuthError("Authentication required. No active session found.", 401, "UNAUTHENTICATED");
  }

  // 2. Ensure active organization is set
  const clinicId = session.session.activeOrganizationId;
  if (!clinicId) {
    if (shouldRedirect) {
      redirect("/onboarding");
    }
    throw new ClinicAuthError(
      "No active clinic organization selected. Please complete onboarding.",
      403,
      "NO_ACTIVE_CLINIC"
    );
  }

  // 3. Resolve member role in active clinic
  let role: ClinicRole;
  if (options?.role) {
    role = options.role;
  } else {
    try {
      const member = await auth.api.getActiveMember({
        headers: reqHeaders,
      });
      if (!member || !member.role) {
        if (shouldRedirect) {
          redirect("/onboarding");
        }
        throw new ClinicAuthError(
          "User is not an active member of this clinic organization.",
          403,
          "NOT_A_MEMBER"
        );
      }
      role = member.role as ClinicRole;
    } catch (err) {
      if (err instanceof ClinicAuthError) throw err;
      if (typeof err === "object" && err !== null && "digest" in err) throw err;
      if (shouldRedirect) {
        redirect("/onboarding");
      }
      throw new ClinicAuthError(
        "User is not an active member of this clinic organization.",
        403,
        "NOT_A_MEMBER"
      );
    }
  }

  if (!clinicRoles[role]) {
    throw new ClinicAuthError(`Access forbidden: Invalid clinical role '${role}'`, 403, "FORBIDDEN");
  }

  // 4. Validate permissions if required
  if (requiredPermission) {
    let hasAccess = false;
    try {
      const check = await auth.api.hasPermission({
        headers: reqHeaders,
        body: {
          organizationId: clinicId,
          permissions: requiredPermission,
        },
      });

      if (check && typeof check.success === "boolean") {
        hasAccess = check.success;
      } else {
        // Fall back to direct role evaluation if API response is not boolean
        const roleDef = clinicRoles[role];
        hasAccess = !!roleDef?.authorize(requiredPermission)?.success;
      }
    } catch {
      // If Better Auth API check throws (e.g. mock/offline environment), evaluate via defined role AC
      const roleDef = clinicRoles[role];
      if (roleDef) {
        const authResult = roleDef.authorize(requiredPermission);
        hasAccess = !!authResult?.success;
      }
    }

    if (!hasAccess) {
      throw new ClinicAuthError(
        `Access forbidden: Insufficient permissions for role '${role}'`,
        403,
        "FORBIDDEN"
      );
    }
  }

  return {
    user: session.user,
    session: session.session,
    clinicId,
    role,
  };
}
