import { NextResponse } from "next/server";
import { auth } from "@/auth";

const publicPaths = ["/login", "/forgot-password", "/reset-password"];

export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const isLoggedIn = Boolean(req.auth);
  const role = req.auth?.user?.role;

  if (path === "/") {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", nextUrl));
    return NextResponse.redirect(
      new URL(role === "admin" ? "/admin" : "/shop", nextUrl),
    );
  }

  const isPublicPath = publicPaths.some((p) => path.startsWith(p));

  if (isPublicPath) {
    if (isLoggedIn) {
      return NextResponse.redirect(
        new URL(role === "admin" ? "/admin" : "/shop", nextUrl),
      );
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    if (path !== "/login") loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  if (path.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/shop", nextUrl));
  }

  if (path.startsWith("/shop") && role !== "attendant") {
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
