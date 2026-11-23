import { Shell } from "@/components/chrome";
import { requireRole } from "@/lib/session";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("TEACHER");
  return <Shell session={session}>{children}</Shell>;
}
