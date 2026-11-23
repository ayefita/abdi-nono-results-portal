import { ReportDeck } from "@/components/report-sheet";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function ReportPage() {
  const session = await requireRole("STUDENT");
  const placement = await prisma.placement.findFirst({ where: { studentId: session.studentId!, academicYear: { isCurrent: true } } });
  return <ReportDeck actor={session} studentId={session.studentId!} yearId={placement?.academicYearId} back="/student/report" />;
}
