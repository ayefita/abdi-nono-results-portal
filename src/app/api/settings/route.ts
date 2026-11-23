import { NextResponse } from "next/server";
import { apiSession } from "@/lib/api";

export async function POST() {
  const { session, response } = await apiSession();
  if (!session) return response;
  if (session.role !== "ADMIN") return NextResponse.json({ error: "errors.forbidden" }, { status: 403 });
  return NextResponse.json({ error: "errors.required" }, { status: 400 });
}
