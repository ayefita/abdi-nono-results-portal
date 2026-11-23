import { NextResponse } from "next/server";
import { authenticate } from "@/lib/session";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth-token";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await authenticate(String(body.username ?? ""), String(body.password ?? ""));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });
  const response = NextResponse.json({
    ok: true,
    role: result.role,
    studentId: result.studentId,
    teacherId: result.teacherId,
    mustChangePassword: result.mustChangePassword,
  });
  response.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions());
  return response;
}
