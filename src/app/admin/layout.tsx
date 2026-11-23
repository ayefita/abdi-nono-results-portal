import { Shell } from "@/components/chrome";
import { requireRole } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("ADMIN");
  return <Shell session={session}>{children}</Shell>;
}
