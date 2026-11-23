import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSession } from "@/lib/api";
import { canWriteMarks } from "@/lib/types";
import { rememberDelete } from "@/lib/tombstone";

export async function POST(request: Request) {
  const { session, response } = await apiSession();
  if (!session) return response;
  if (!canWriteMarks(session.role)) return NextResponse.json({ error: "errors.forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body?.semesterId || !body.subjectId || !body.sectionId) return NextResponse.json({ error: "errors.required" }, { status: 400 });
  const semester = await prisma.semester.findUnique({ where: { id: String(body.semesterId) } });
  const subject = await prisma.subject.findUnique({ where: { id: String(body.subjectId) }, include: { components: true } });
  const section = await prisma.section.findUnique({ where: { id: String(body.sectionId) } });
  if (!semester || !subject || !section || subject.gradeId !== section.gradeId) return NextResponse.json({ error: "errors.notFound" }, { status: 404 });
  if (session.role === "TEACHER") {
    const allowed = await prisma.teacherAssignment.findFirst({
      where: { teacherId: session.teacherId || "", subjectId: subject.id, sectionId: section.id, academicYearId: semester.academicYearId },
    });
    if (!allowed) return NextResponse.json({ error: "errors.assignment" }, { status: 403 });
  }
  const entries = Array.isArray(body.entries) ? body.entries : [];
  for (const entry of entries) {
    const component = subject.components.find((item) => item.id === entry.componentId);
    const placed = await prisma.placement.findFirst({ where: { studentId: String(entry.studentId), sectionId: section.id, academicYearId: semester.academicYearId } });
    if (!component || !placed) return NextResponse.json({ error: "errors.invalid" }, { status: 400 });
    const where = { studentId_semesterId_componentId: { studentId: placed.studentId, semesterId: semester.id, componentId: component.id } };
    if (entry.score == null || entry.score === "") {
      const existing = await prisma.mark.findUnique({ where });
      if (existing) {
        await rememberDelete("Mark", existing.id);
        await prisma.mark.delete({ where: { id: existing.id } });
      }
      continue;
    }
    const score = Number(entry.score);
    if (!Number.isFinite(score) || score < 0 || score > component.maxScore) return NextResponse.json({ error: "errors.scoreRange" }, { status: 400 });
    await prisma.mark.upsert({
      where,
      create: { studentId: placed.studentId, semesterId: semester.id, componentId: component.id, subjectId: subject.id, score, enteredById: session.userId },
      update: { score, enteredById: session.userId },
    });
  }
  return NextResponse.json({ ok: true });
}
