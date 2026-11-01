import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// A quick cookie check to skip a page render. getCurrentUser() is what actually authorizes.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: ["/tasks/:path*", "/calendar/:path*", "/history/:path*", "/focus/:path*", "/settings/:path*", "/projects/:path*"],
};
