import { ReportDeck } from "@/components/report-sheet";
import { requireRole } from "@/lib/session";
import { one } from "@/lib/form";

export default async function TeacherReports({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireRole("TEACHER");
  const search = await searchParams;
  const sectionId = one(search.sectionId);
  const studentId = one(search.studentId);
  const query = new URLSearchParams({ sectionId, studentId });
  return <ReportDeck actor={session} sectionId={sectionId || undefined} studentId={studentId || undefined} back={`/teacher/reports?${query.toString()}`} />;
}
