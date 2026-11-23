import { MarkEntry } from "@/components/mark-entry";
import { requireRole } from "@/lib/session";

export default async function TeacherMarks({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireRole("TEACHER");
  return <MarkEntry basePath="/teacher/marks" teacherId={session.teacherId} searchParams={await searchParams} />;
}
