import { ReportDeck } from "@/components/report-sheet";
import { requireRole } from "@/lib/session";
import { one } from "@/lib/form";

export default async function AdminReports({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireRole("ADMIN");
  const search = await searchParams;
  return <ReportDeck actor={session} sectionId={one(search.sectionId) || undefined} studentId={one(search.studentId) || undefined} back="/admin/reports" />;
}
