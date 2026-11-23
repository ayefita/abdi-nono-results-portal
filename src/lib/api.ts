import { NextResponse } from "next/server";
import { getSession } from "./session";
import type { Session } from "./types";

export async function apiSession(roles?: Session["role"][]) {
  const session = await getSession();
  if (!session) return { session: null, response: NextResponse.json({ error: "auth.required" }, { status: 401 }) };
  if (session.mustChangePassword) return { session: null, response: NextResponse.json({ error: "auth.mustChangePassword" }, { status: 403 }) };
  if (roles && !roles.includes(session.role)) return { session: null, response: NextResponse.json({ error: "errors.forbidden" }, { status: 403 }) };
  return { session, response: null };
}
