import { NextResponse } from "next/server";
import { getSession, changePassword } from "@/lib/session";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth-token";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "auth.required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const result = await changePassword(session.userId, String(body.current ?? ""), String(body.next ?? ""));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const response = NextResponse.json({ ok: true, role: result.role });
  response.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions());
  return response;
}
