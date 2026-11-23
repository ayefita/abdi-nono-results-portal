import { MarkEntry } from "@/components/mark-entry";

export default async function AdminMarks({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <MarkEntry basePath="/admin/marks" teacherId={null} searchParams={await searchParams} />;
}
