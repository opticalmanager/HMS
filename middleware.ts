import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // Unauthenticated requests
  if (!sessionCookie) {
    if (pathname.startsWith("/api/crm")) {
      return NextResponse.json(
        { error: "Unauthorized: Active Better Auth session required" },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
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
    "/onboarding/:path*",
    "/api/crm/:path*",
  ],
};
