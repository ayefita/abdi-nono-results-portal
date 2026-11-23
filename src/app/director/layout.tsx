import { Shell } from "@/components/chrome";
import { requireRole } from "@/lib/session";

export default async function DirectorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("DIRECTOR");
  return <Shell session={session}>{children}</Shell>;
}
