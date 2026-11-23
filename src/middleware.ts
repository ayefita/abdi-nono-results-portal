import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readToken } from "@/lib/auth-token";
import { homeFor } from "@/lib/types";

const PUBLIC_EXACT = new Set([
  "/login",
  "/offline",
  "/manifest.webmanifest",
  "/sw.js",
  "/logo.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-1024.png",
  "/icon-maskable-512.png",
  "/favicon.ico",
  "/api/health",
  "/api/logo",
  "/api/login",
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/fonts/") ||
    PUBLIC_EXACT.has(pathname) ||
    pathname.startsWith("/api/sync/")
  ) {
    return NextResponse.next();
  }

  const token = await readToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "auth.required" }, { status: 401 });
    }
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }

  if (token.mcp && pathname !== "/change-password" && pathname !== "/api/logout" && pathname !== "/api/change-password") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "auth.mustChangePassword" }, { status: 403 });
    }
    const next = request.nextUrl.clone();
    next.pathname = "/change-password";
    next.search = "";
    return NextResponse.redirect(next);
  }

  const roleHome = homeFor(token.role);
  const wrong =
    (pathname.startsWith("/admin") && token.role !== "ADMIN") ||
    (pathname.startsWith("/teacher") && token.role !== "TEACHER") ||
    (pathname.startsWith("/student") && token.role !== "STUDENT") ||
    (pathname.startsWith("/director") && token.role !== "DIRECTOR");
  if (wrong) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "errors.forbidden" }, { status: 403 });
    }
    const next = request.nextUrl.clone();
    next.pathname = roleHome;
    next.search = "";
    return NextResponse.redirect(next);
  }

  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
