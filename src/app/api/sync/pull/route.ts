import { NextResponse } from "next/server";
import { buildExport, tokensMatch } from "@/lib/sync";

export async function GET(request: Request) {
  if (!tokensMatch(request.headers.get("authorization"))) return NextResponse.json({ error: "errors.forbidden" }, { status: 401 });
  return NextResponse.json(await buildExport());
}
