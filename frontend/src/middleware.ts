import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, isAuthTokenValid } from "@/lib/auth-token";

export function middleware(request: NextRequest) {
  const rawToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const token = rawToken ? decodeURIComponent(rawToken) : null;

  if (!isAuthTokenValid(token)) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    if (token) {
      signInUrl.searchParams.set("reason", "session-expired");
    }
    const response = NextResponse.redirect(signInUrl);
    if (token) {
      response.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
