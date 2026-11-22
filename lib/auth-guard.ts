import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
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

export class UnauthorizedError extends ClinicAuthError {
  constructor(message = "Authentication required. No active session found.") {
    super(message, 401, "UNAUTHENTICATED");
    this.name = "UnauthorizedError";
  }
}

export class NoActiveClinicError extends ClinicAuthError {
  constructor(message = "No active clinic organization selected. Please complete onboarding.") {
    super(message, 409, "NO_ACTIVE_CLINIC");
    this.name = "NoActiveClinicError";
  }
}

export class ForbiddenError extends ClinicAuthError {
  constructor(message = "Access forbidden: Insufficient permissions for role") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export function handleAuthError(err: unknown): NextResponse {
  if (typeof err === "object" && err !== null && "digest" in err) {
    throw err;
  }
  if (err instanceof ClinicAuthError) {
    return NextResponse.json(
      { success: false, error: err.message, code: err.code },
      { status: err.status }
    );
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  return NextResponse.json(
    { success: false, error: message, code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}

export type PermissionCheck = Record<string, string[]>;

export interface RequireClinicSessionOptions {
  headers?: Headers;
  redirectIfUnauthorized?: boolean;
  permission?: PermissionCheck;
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
  memberId?: string;
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
  memberId: string;
}

/**
 * Validates the Better Auth session and ensures the user belongs to an active clinic organization.
 * Enforces RBAC permissions through Better Auth's hasPermission API and custom access control matrices.
 * Never trusts client-supplied organizationId/clinicId.
 */
export async function requireClinicSession(
  permissionOrOptions?: PermissionCheck | RequireClinicSessionOptions,
  maybeOptions?: RequireClinicSessionOptions
): Promise<ClinicSessionResult> {
  let permission: PermissionCheck | undefined;
  let options: RequireClinicSessionOptions | undefined;

  if (
    permissionOrOptions &&
    ("permission" in permissionOrOptions ||
      "headers" in permissionOrOptions ||
      "redirectIfUnauthorized" in permissionOrOptions ||
      "session" in permissionOrOptions ||
      "role" in permissionOrOptions ||
      "memberId" in permissionOrOptions)
  ) {
    options = permissionOrOptions as RequireClinicSessionOptions;
    permission = options.permission;
  } else {
    permission = permissionOrOptions as PermissionCheck | undefined;
    options = maybeOptions;
    if (!permission && options?.permission) {
      permission = options.permission;
    }
  }

  let reqHeaders: Headers;
  try {
    reqHeaders = options?.headers ?? (await headers());
  } catch {
    reqHeaders = new Headers();
  }

  const shouldRedirect = options?.redirectIfUnauthorized ?? false;

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
    throw new UnauthorizedError();
  }

  // 2. Resolve active organization or auto-activate first clinic
  let clinicId = session.session.activeOrganizationId;
  if (!clinicId && options?.session === undefined) {
    try {
      const orgs = await auth.api.listOrganizations({
        headers: reqHeaders,
      });
      if (orgs && orgs.length > 0) {
        const firstOrg = orgs[0];
        await auth.api.setActiveOrganization({
          headers: reqHeaders,
          body: {
            organizationId: firstOrg.id,
          },
        });
        clinicId = firstOrg.id;
      }
    } catch {
      // Auto-activation failed; proceed to check clinicId
    }
  }

  if (!clinicId) {
    if (shouldRedirect) {
      redirect("/onboarding");
    }
    throw new NoActiveClinicError();
  }

  // 3. Resolve member role in active clinic
  let role: ClinicRole;
  let memberId = options?.memberId || `mem-${session.user.id}`;

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
        throw new ForbiddenError("User is not an active member of this clinic organization.");
      }
      role = member.role as ClinicRole;
      if (member.id) {
        memberId = member.id;
      }
    } catch (err) {
      if (err instanceof ClinicAuthError) throw err;
      if (typeof err === "object" && err !== null && "digest" in err) throw err;
      if (shouldRedirect) {
        redirect("/onboarding");
      }
      throw new ForbiddenError("User is not an active member of this clinic organization.");
    }
  }

  if (!clinicRoles[role]) {
    throw new ForbiddenError(`Access forbidden: Invalid clinical role '${role}'`);
  }

  // 4. Validate permissions if required
  if (permission) {
    let hasAccess = false;
    try {
      const check = await auth.api.hasPermission({
        headers: reqHeaders,
        body: {
          organizationId: clinicId,
          permissions: permission,
        },
      });

      if (check && typeof check.success === "boolean") {
        hasAccess = check.success;
      } else {
        const roleDef = clinicRoles[role];
        hasAccess = !!roleDef?.authorize(permission)?.success;
      }
    } catch {
      const roleDef = clinicRoles[role];
      if (roleDef) {
        const authResult = roleDef.authorize(permission);
        hasAccess = !!authResult?.success;
      }
    }

    if (!hasAccess) {
      if (shouldRedirect) {
        redirect("/dashboard?error=forbidden");
      }
      throw new ForbiddenError(
        `Access forbidden: Insufficient permissions for role '${role}'`
      );
    }
  }

  return {
    user: session.user,
    session: session.session,
    clinicId,
    role,
    memberId,
  };
}

/**
 * Server Component wrapper that redirects cleanly to /login, /onboarding, or /dashboard?error=forbidden
 */
export async function requirePageSession(
  options?: RequireClinicSessionOptions | PermissionCheck
): Promise<ClinicSessionResult> {
  const opts: RequireClinicSessionOptions =
    options &&
    ("permission" in options ||
      "headers" in options ||
      "redirectIfUnauthorized" in options ||
      "session" in options ||
      "role" in options)
      ? { ...(options as RequireClinicSessionOptions), redirectIfUnauthorized: true }
      : { permission: options as PermissionCheck, redirectIfUnauthorized: true };

  try {
    return await requireClinicSession(opts);
  } catch (err) {
    if (typeof err === "object" && err !== null && "digest" in err) {
      throw err;
    }
    if (err instanceof UnauthorizedError) {
      redirect("/login");
    }
    if (err instanceof NoActiveClinicError) {
      redirect("/onboarding");
    }
    if (err instanceof ForbiddenError) {
      redirect("/dashboard?error=forbidden");
    }
    redirect("/login");
  }
}
