import { readFile } from "fs/promises";
import path from "path";
import { getSettings } from "@/lib/settings";

export async function GET() {
  const settings = await getSettings();
  if (settings.logoData && settings.logoMime) {
    return new Response(Buffer.from(settings.logoData), {
      headers: { "Content-Type": settings.logoMime, "Cache-Control": "no-cache" },
    });
  }
  const svg = await readFile(path.join(process.cwd(), "public/logo.svg"));
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-cache" } });
}
