import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./types";

export const SESSION_COOKIE = "anmps_session";

/** A session ends after this many seconds without activity. Every request refreshes it. */
export const SESSION_IDLE_SECONDS = 30 * 60;

export type TokenPayload = {
  sub: string;
  role: Role;
  tv: number;
  mcp: boolean;
  iat?: number;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) return null;
  return new TextEncoder().encode(value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.COOKIE_SECURE === "true" || process.env.VERCEL === "1",
    path: "/",
    maxAge: SESSION_IDLE_SECONDS,
  };
}

export async function signSession(payload: TokenPayload) {
  const key = secret();
  if (!key) throw new Error("AUTH_SECRET is not set");
  return new SignJWT({ role: payload.role, tv: payload.tv, mcp: payload.mcp })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_IDLE_SECONDS}s`)
    .sign(key);
}

export async function readToken(token: string | undefined | null): Promise<TokenPayload | null> {
  if (!token) return null;
  const key = secret();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    const role = payload.role;
    if (role !== "ADMIN" && role !== "TEACHER" && role !== "DIRECTOR" && role !== "STUDENT") return null;
    if (!payload.sub || typeof payload.tv !== "number") return null;
    return { sub: payload.sub, role, tv: payload.tv, mcp: Boolean(payload.mcp), iat: typeof payload.iat === "number" ? payload.iat : 0 };
  } catch {
    return null;
  }
}
