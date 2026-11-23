import { NextResponse } from "next/server";
import { applyBackup, parseBackup, tokensMatch } from "@/lib/sync";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  if (!tokensMatch(request.headers.get("authorization"))) return NextResponse.json({ error: "errors.forbidden" }, { status: 401 });
  try {
    const file = parseBackup(await request.text());
    const counts = await applyBackup(file, "merge");
    await prisma.syncLog.create({ data: { direction: "push-in", detail: JSON.stringify(counts) } });
    return NextResponse.json(counts);
  } catch (error) {
    const key = error instanceof Error && error.message.startsWith("errors.") ? error.message : "errors.checksum";
    return NextResponse.json({ error: key }, { status: 400 });
  }
}
