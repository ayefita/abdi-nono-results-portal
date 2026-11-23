"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { field, go, safePath } from "@/lib/form";
import { rememberDelete } from "@/lib/tombstone";
import { column, readTable } from "@/lib/excel";

async function canEditMarks(user: { role: string; teacherId: string | null }, subjectId: string, sectionId: string, academicYearId: string) {
  if (user.role === "ADMIN") return true;
  if (user.role !== "TEACHER" || !user.teacherId) return false;
  const assignment = await prisma.teacherAssignment.findFirst({ where: { teacherId: user.teacherId, subjectId, sectionId, academicYearId } });
  return Boolean(assignment);
}

export async function saveMarks(formData: FormData) {
  const session = await requireUser();
  const semesterId = field(formData, "semesterId");
  const subjectId = field(formData, "subjectId");
  const sectionId = field(formData, "sectionId");
  const returnTo = safePath(field(formData, "back") || "/teacher/marks");
  const keep = { semesterId, subjectId, sectionId };
  const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, include: { components: true } });
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!semester || !subject || !section || subject.gradeId !== section.gradeId) go(returnTo, { ...keep, error: "errors.notFound" });
  if (!(await canEditMarks(session, subjectId, sectionId, semester.academicYearId))) go(returnTo, { ...keep, error: "errors.assignment" });
  const placements = await prisma.placement.findMany({ where: { sectionId, academicYearId: semester.academicYearId } });
  const allowed = new Set(placements.map((row) => row.studentId));
  const components = new Map(subject.components.map((component) => [component.id, component]));
  const writes: { studentId: string; componentId: string; score: number | null }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("s.")) continue;
    const [, studentId, componentId] = key.split(".");
    if (!studentId || !componentId || !allowed.has(studentId) || !components.has(componentId)) continue;
    const text = String(value).trim();
    if (!text) {
      writes.push({ studentId, componentId, score: null });
      continue;
    }
    const score = Number(text);
    const max = components.get(componentId)!.maxScore;
    if (!Number.isFinite(score) || score < 0 || score > max) go(returnTo, { ...keep, error: "errors.scoreRange" });
    writes.push({ studentId, componentId, score: Math.round(score * 100) / 100 });
  }
  for (const write of writes) {
    const where = { studentId_semesterId_componentId: { studentId: write.studentId, semesterId, componentId: write.componentId } };
    if (write.score == null) {
      const existing = await prisma.mark.findUnique({ where });
      if (existing) {
        await rememberDelete("Mark", existing.id);
        await prisma.mark.delete({ where: { id: existing.id } });
      }
    } else {
      await prisma.mark.upsert({
        where,
        create: { studentId: write.studentId, semesterId, componentId: write.componentId, subjectId, score: write.score, enteredById: session.userId },
        update: { score: write.score, subjectId, enteredById: session.userId },
      });
    }
  }
  go(returnTo, { ...keep, ok: "marks.saved" });
}

export async function importMarks(formData: FormData) {
  const session = await requireUser();
  const semesterId = field(formData, "semesterId");
  const subjectId = field(formData, "subjectId");
  const sectionId = field(formData, "sectionId");
  const returnTo = safePath(field(formData, "back") || "/admin/marks");
  const keep = { semesterId, subjectId, sectionId };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) go(returnTo, { ...keep, error: "errors.fileMissing" });
  const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, include: { components: true } });
  if (!semester || !subject) go(returnTo, { ...keep, error: "errors.notFound" });
  if (!(await canEditMarks(session, subjectId, sectionId, semester.academicYearId))) go(returnTo, { ...keep, error: "errors.assignment" });
  const rows = readTable(Buffer.from(await file.arrayBuffer()), file.name);
  const placements = await prisma.placement.findMany({
    where: { sectionId, academicYearId: semester.academicYearId },
    include: { student: true },
  });
  const byCode = new Map(placements.map((row) => [row.student.studentCode.toLowerCase(), row.studentId]));
  let saved = 0;
  for (const row of rows) {
    const studentId = byCode.get(column(row, ["student_id", "studentid", "id"]).toLowerCase());
    if (!studentId) continue;
    for (const component of subject.components) {
      const header = Object.keys(row).find((key) => {
        const norm = key.trim().toLowerCase();
        return [component.nameEn, component.nameOm, component.nameAm, component.id].some((name) => name.trim().toLowerCase() === norm);
      });
      if (!header) continue;
      const text = String(row[header] ?? "").trim();
      const where = { studentId_semesterId_componentId: { studentId, semesterId, componentId: component.id } };
      if (!text) {
        const existing = await prisma.mark.findUnique({ where });
        if (existing) {
          await rememberDelete("Mark", existing.id);
          await prisma.mark.delete({ where: { id: existing.id } });
        }
        continue;
      }
      const score = Number(text);
      if (!Number.isFinite(score) || score < 0 || score > component.maxScore) continue;
      await prisma.mark.upsert({
        where,
        create: { studentId, semesterId, componentId: component.id, subjectId, score, enteredById: session.userId },
        update: { score, subjectId, enteredById: session.userId },
      });
      saved += 1;
    }
  }
  go(returnTo, { ...keep, ok: "marks.saved", count: saved });
}

export async function addGradebookColumn(formData: FormData) {
  const session = await requireUser();
  const subjectId = field(formData, "subjectId");
  const sectionId = field(formData, "sectionId");
  const semesterId = field(formData, "semesterId");
  const back = safePath(field(formData, "back") || "/teacher/marks");
  const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
  if (!semester || !(await canEditMarks(session, subjectId, sectionId, semester.academicYearId))) go(back, { error: "errors.assignment" });
  const name = field(formData, "name");
  if (!name) go(back, { error: "errors.required" });
  const count = await prisma.assessmentComponent.count({ where: { subjectId } });
  const formula = field(formData, "formula") === "yes";
  await prisma.assessmentComponent.create({
    data: {
      subjectId,
      nameEn: name,
      nameOm: name,
      nameAm: name,
      maxScore: formula ? 100 : Number(field(formData, "max") || "10"),
      sortOrder: count + 1,
      kind: formula ? "formula" : field(formData, "kind") || "classwork",
      isFormula: formula,
      formula: formula ? field(formData, "formulaKind") || "total" : null,
      assessedOn: field(formData, "date") ? new Date(field(formData, "date")) : null,
    },
  });
  go(back, { ok: "common.saved" });
}

export async function saveComment(formData: FormData) {
  const session = await requireUser();
  if (session.role !== "ADMIN" && session.role !== "TEACHER") go("/login", { error: "errors.forbidden" });
  const studentId = field(formData, "studentId");
  const semesterId = field(formData, "semesterId");
  const back = safePath(field(formData, "back") || "/teacher/reports");
  const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
  const placement = semester
    ? await prisma.placement.findUnique({ where: { studentId_academicYearId: { studentId, academicYearId: semester.academicYearId } } })
    : null;
  if (!semester || !placement) go(back, { error: "errors.notFound" });
  if (session.role === "TEACHER") {
    const allowed = await prisma.teacherAssignment.findFirst({ where: { teacherId: session.teacherId || "", sectionId: placement.sectionId, academicYearId: semester.academicYearId } });
    if (!allowed) go(back, { error: "errors.assignment" });
  }
  await prisma.reportComment.upsert({
    where: { studentId_semesterId: { studentId, semesterId } },
    create: { studentId, semesterId, body: field(formData, "body"), authorId: session.userId },
    update: { body: field(formData, "body"), authorId: session.userId },
  });
  go(back, { ok: "common.saved" });
}
