import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, mode: process.env.DEPLOYMENT_MODE || "local" });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
