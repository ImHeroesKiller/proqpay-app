import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");
  const isPublic =
    isLoginPage ||
    req.nextUrl.pathname.startsWith("/api/auth") ||
    req.nextUrl.pathname === "/";

  if (!isLoggedIn && !isPublic) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && (isLoginPage || req.nextUrl.pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|.*\\..*).*)"],
};
