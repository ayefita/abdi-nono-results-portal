import { prisma } from "@/lib/prisma";
import { apiSession } from "@/lib/api";
import { workbookBuffer } from "@/lib/excel";
import { xlsxResponse } from "@/lib/pdf";

export async function GET(request: Request) {
  const { session, response } = await apiSession(["ADMIN", "TEACHER"]);
  if (!session) return response;
  const url = new URL(request.url);
  const semesterId = url.searchParams.get("semesterId") || "";
  const subjectId = url.searchParams.get("subjectId") || "";
  const sectionId = url.searchParams.get("sectionId") || "";
  const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, include: { components: { orderBy: { sortOrder: "asc" } } } });
  if (!semester || !subject) return Response.json({ error: "errors.notFound" }, { status: 404 });
  if (session.role === "TEACHER") {
    const allowed = await prisma.teacherAssignment.findFirst({ where: { teacherId: session.teacherId || "", subjectId, sectionId, academicYearId: semester.academicYearId } });
    if (!allowed) return Response.json({ error: "errors.assignment" }, { status: 403 });
  }
  const placements = await prisma.placement.findMany({
    where: { sectionId, academicYearId: semester.academicYearId, ...(subject.streamId ? { streamId: subject.streamId } : {}) },
    include: { student: { include: { user: true } } },
    orderBy: { student: { studentCode: "asc" } },
  });
  const header = ["student_id", "full_name", ...subject.components.map((component) => component.nameEn)];
  const rows = placements.map((row) => [row.student.studentCode, row.student.user.fullName, ...subject.components.map(() => "")]);
  return xlsxResponse(workbookBuffer([{ name: "Marks", rows: [header, ...rows] }]), "ifa-boru-marks.xlsx");
}
