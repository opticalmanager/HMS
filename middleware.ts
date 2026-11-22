import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname, search } = request.nextUrl;

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  // Authenticated users visiting login/signup should be redirected to dashboard
  if (sessionCookie && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Allow unauthenticated access to login and signup pages
  if (isAuthPage) {
    return NextResponse.next();
  }

  // Unauthenticated requests to protected paths
  if (!sessionCookie) {
    if (pathname.startsWith("/api/crm")) {
      return NextResponse.json(
        { error: "Unauthorized: Active Better Auth session required" },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/dashboard/:path*",
    "/onboarding",
    "/accept-invitation/:path*",
    "/api/crm/:path*",
    "/appointments/:path*",
    "/opd/:path*",
    "/ipd/:path*",
    "/billing/:path*",
    "/inventory/:path*",
    "/reports/:path*",
    "/staff/:path*",
    "/whatsapp/:path*",
    "/token-board/:path*",
    "/audit-logs/:path*",
    "/settings/:path*",
  ],
};
