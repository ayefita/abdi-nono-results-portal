import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readToken, sessionCookieOptions, signSession, type TokenPayload } from "@/lib/auth-token";
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

// These requests set or clear the session cookie themselves, so the middleware must not refresh it.
const NO_REFRESH = new Set(["/api/login", "/api/logout", "/api/change-password", "/change-password"]);
const REFRESH_AFTER_SECONDS = 60;

// Sliding 30-minute session: re-issue the cookie on activity so it expires only after 30 idle minutes.
async function refreshSession(request: NextRequest, response: NextResponse, token: TokenPayload) {
  if (NO_REFRESH.has(request.nextUrl.pathname) || request.headers.has("next-action")) return response;
  const age = Math.floor(Date.now() / 1000) - (token.iat ?? 0);
  if (age < REFRESH_AFTER_SECONDS) return response;
  try {
    const fresh = await signSession({ sub: token.sub, role: token.role, tv: token.tv, mcp: token.mcp });
    response.cookies.set(SESSION_COOKIE, fresh, sessionCookieOptions());
  } catch {
    // Keep the current cookie if signing fails.
  }
  return response;
}

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
    const redirect = NextResponse.redirect(login);
    if (request.cookies.has(SESSION_COOKIE)) redirect.cookies.delete(SESSION_COOKIE);
    return redirect;
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
  return refreshSession(request, NextResponse.next({ request: { headers } }), token);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
