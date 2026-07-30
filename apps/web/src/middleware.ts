import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { config as appConfig } from "@autoapply/config";

type GetTokenFn = typeof getToken;

export async function evaluateMiddleware(
  request: NextRequest,
  getTokenFn: GetTokenFn = getToken,
) {
  const token = await getTokenFn({
    req: request,
    secret: appConfig.auth.secret,
  });

  const isLoggedIn = Boolean(token);
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isProtected = pathname.startsWith("/dashboard");

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export async function middleware(request: NextRequest) {
  return evaluateMiddleware(request);
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
