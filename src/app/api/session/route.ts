import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Keep-alive for the 30-minute idle timeout. The middleware checks the session and refreshes the cookie.
export async function GET() {
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
