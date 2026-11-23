import { Shell } from "@/components/chrome";
import { requireRole } from "@/lib/session";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("STUDENT");
  return <Shell session={session}>{children}</Shell>;
}
