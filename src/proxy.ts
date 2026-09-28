/**
 * Proxy — Route Protection (Next.js 16+ convention)
 *
 * Note: `middleware.ts` is deprecated in Next.js 16.
 * This file replaces it using the new `proxy.ts` convention.
 *
 * Protects /admin routes by checking for a session cookie.
 * Full token verification happens server-side in layouts/actions.
 *
 * Firebase Admin SDK cannot run in the Edge runtime (requires Node.js),
 * so we perform a lightweight cookie presence check here.
 */

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

// Routes under /admin that don't require auth
const PUBLIC_ADMIN_ROUTES = ["/admin/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Allow the login page without auth
  if (PUBLIC_ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check for session cookie (lightweight — full verification in layout)
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
