import { apiSession } from "@/lib/api";
import { buildExport } from "@/lib/sync";

export async function GET() {
  const { session, response } = await apiSession(["ADMIN"]);
  if (!session) return response;
  const file = await buildExport();
  return new Response(JSON.stringify(file), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=abdi-nono-backup.json",
      "Cache-Control": "private, no-store",
    },
  });
}
