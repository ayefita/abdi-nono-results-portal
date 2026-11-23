"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { field, go, prismaKey, safePath } from "@/lib/form";
import { componentCreate } from "@/lib/defaults";
import { rememberDelete } from "@/lib/tombstone";
import { SESSION_COOKIE } from "@/lib/auth-token";
import { applyBackup, parseBackup, pullRemote, pushRemote } from "@/lib/sync";

function back(path: string) {
  return safePath(path, "/admin");
}

export async function createGrade(formData: FormData) {
  await requireRole("ADMIN");
  const name = field(formData, "name");
  const sortOrder = Number(field(formData, "sortOrder") || "0");
  if (!name) go("/admin/grades", { error: "errors.required" });
  try {
    await prisma.grade.create({
      data: {
        name,
        nameOm: field(formData, "nameOm"),
        nameAm: field(formData, "nameAm"),
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        nextGradeId: field(formData, "nextGradeId") || null,
      },
    });
  } catch (error) {
    go("/admin/grades", { error: prismaKey(error) ?? "errors.duplicate" });
  }
  go("/admin/grades", { ok: "common.saved" });
}

export async function updateGrade(formData: FormData) {
  await requireRole("ADMIN");
  const id = field(formData, "id");
  try {
    await prisma.grade.update({
      where: { id },
      data: {
        name: field(formData, "name"),
        nameOm: field(formData, "nameOm"),
        nameAm: field(formData, "nameAm"),
        sortOrder: Number(field(formData, "sortOrder") || "0"),
        nextGradeId: field(formData, "nextGradeId") || null,
      },
    });
  } catch (error) {
    go("/admin/grades", { error: prismaKey(error) ?? "errors.duplicate" });
  }
  go("/admin/grades", { ok: "common.saved" });
}

export async function deleteGrade(formData: FormData) {
  await requireRole("ADMIN");
  const id = field(formData, "id");
  try {
    await rememberDelete("Grade", id);
    await prisma.grade.delete({ where: { id } });
  } catch (error) {
    go("/admin/grades", { error: prismaKey(error) ?? "grades.deleteBlocked" });
  }
  go("/admin/grades", { ok: "common.deleted" });
}

export async function createSection(formData: FormData) {
  await requireRole("ADMIN");
  const gradeId = field(formData, "gradeId");
  const name = field(formData, "name");
  if (!gradeId || !name) go("/admin/grades", { error: "errors.required" });
  try {
    await prisma.section.create({ data: { gradeId, name } });
  } catch (error) {
    go("/admin/grades", { error: prismaKey(error) ?? "errors.duplicate" });
  }
  go("/admin/grades", { ok: "common.saved" });
}

export async function deleteSection(formData: FormData) {
  await requireRole("ADMIN");
  const id = field(formData, "id");
  try {
    await rememberDelete("Section", id);
    await prisma.section.delete({ where: { id } });
  } catch (error) {
    go("/admin/grades", { error: prismaKey(error) ?? "errors.inUse" });
  }
  go("/admin/grades", { ok: "common.deleted" });
}

export async function createStream(formData: FormData) {
  await requireRole("ADMIN");
  const gradeId = field(formData, "gradeId");
  const nameEn = field(formData, "nameEn");
  if (!gradeId || !nameEn) go("/admin/grades", { error: "errors.required" });
  try {
    await prisma.stream.create({ data: { gradeId, nameEn, nameOm: field(formData, "nameOm") || nameEn, nameAm: field(formData, "nameAm") || nameEn } });
  } catch (error) {
    go("/admin/grades", { error: prismaKey(error) ?? "errors.duplicate" });
  }
  go("/admin/grades", { ok: "common.saved" });
}

export async function deleteStream(formData: FormData) {
  await requireRole("ADMIN");
  try {
    const id = field(formData, "id");
    await rememberDelete("Stream", id);
    await prisma.stream.delete({ where: { id } });
  } catch (error) {
    go("/admin/grades", { error: prismaKey(error) ?? "errors.inUse" });
  }
  go("/admin/grades", { ok: "common.deleted" });
}

export async function createSubject(formData: FormData) {
  await requireRole("ADMIN");
  const gradeId = field(formData, "gradeId");
  const code = field(formData, "code").toUpperCase();
  const nameEn = field(formData, "nameEn");
  const streamId = field(formData, "streamId") || null;
  const target = `/admin/subjects?gradeId=${encodeURIComponent(gradeId)}`;
  if (!gradeId || !code || !nameEn) go(target, { error: "errors.required" });
  const duplicate = await prisma.subject.findFirst({ where: { gradeId, code, streamId } });
  if (duplicate) go(target, { error: "errors.duplicate" });
  const subject = await prisma.subject.create({
    data: { gradeId, streamId, code, nameEn, nameOm: field(formData, "nameOm") || nameEn, nameAm: field(formData, "nameAm") || nameEn, sortOrder: Number(field(formData, "sortOrder") || "0") },
  });
  await prisma.assessmentComponent.createMany({ data: componentCreate(subject.id) });
  go(target, { ok: "common.saved" });
}

export async function updateSubject(formData: FormData) {
  await requireRole("ADMIN");
  const id = field(formData, "id");
  const subject = await prisma.subject.findUnique({ where: { id } });
  if (!subject) go("/admin/subjects", { error: "errors.notFound" });
  const target = `/admin/subjects?gradeId=${subject.gradeId}`;
  try {
    await prisma.subject.update({
      where: { id },
      data: {
        code: field(formData, "code").toUpperCase(),
        nameEn: field(formData, "nameEn"),
        nameOm: field(formData, "nameOm"),
        nameAm: field(formData, "nameAm"),
        sortOrder: Number(field(formData, "sortOrder") || "0"),
        streamId: field(formData, "streamId") || null,
      },
    });
  } catch (error) {
    go(target, { error: prismaKey(error) ?? "errors.duplicate" });
  }
  go(target, { ok: "common.saved" });
}

export async function deleteSubject(formData: FormData) {
  await requireRole("ADMIN");
  const id = field(formData, "id");
  const subject = await prisma.subject.findUnique({ where: { id } });
  const target = `/admin/subjects?gradeId=${subject?.gradeId ?? ""}`;
  if (field(formData, "confirm") !== "yes") go(target, { error: "errors.confirmDelete" });
  await rememberDelete("Subject", id);
  await prisma.subject.delete({ where: { id } });
  go(target, { ok: "common.deleted" });
}

export async function saveComponents(formData: FormData) {
  await requireRole("ADMIN");
  const subjectId = field(formData, "subjectId");
  const target = `/admin/components?subjectId=${encodeURIComponent(subjectId)}`;
  const deleteId = field(formData, "deleteId");
  if (deleteId) {
    const marks = await prisma.mark.count({ where: { componentId: deleteId } });
    if (marks > 0 && field(formData, "confirm") !== "yes") go(target, { error: "errors.confirmDelete" });
    await rememberDelete("AssessmentComponent", deleteId);
    await prisma.assessmentComponent.delete({ where: { id: deleteId } });
    go(target, { ok: "common.deleted" });
  }
  if (field(formData, "intent") === "add") {
    const nameEn = field(formData, "newEn");
    const maxScore = Number(field(formData, "newMax"));
    if (!nameEn || !(maxScore > 0)) go(target, { error: "errors.weight" });
    const count = await prisma.assessmentComponent.count({ where: { subjectId } });
    await prisma.assessmentComponent.create({
      data: { subjectId, nameEn, nameOm: field(formData, "newOm") || nameEn, nameAm: field(formData, "newAm") || nameEn, maxScore, sortOrder: count + 1 },
    });
    go(target, { ok: "components.saved" });
  }
  const components = await prisma.assessmentComponent.findMany({ where: { subjectId } });
  for (const component of components) {
    const maxScore = Number(field(formData, `max_${component.id}`));
    if (!(maxScore > 0)) go(target, { error: "errors.weight" });
    await prisma.assessmentComponent.update({
      where: { id: component.id },
      data: {
        nameEn: field(formData, `en_${component.id}`) || component.nameEn,
        nameOm: field(formData, `om_${component.id}`),
        nameAm: field(formData, `am_${component.id}`),
        maxScore,
        sortOrder: Number(field(formData, `order_${component.id}`) || component.sortOrder),
      },
    });
  }
  go(target, { ok: "components.saved" });
}

export async function createYear(formData: FormData) {
  await requireRole("ADMIN");
  const nameEn = field(formData, "nameEn");
  const start = field(formData, "start");
  const end = field(formData, "end");
  if (!nameEn || !start || !end) go("/admin/years", { error: "errors.required" });
  if (field(formData, "isCurrent") === "yes") await prisma.academicYear.updateMany({ data: { isCurrent: false } });
  try {
    await prisma.academicYear.create({
      data: {
        nameEn,
        nameOm: field(formData, "nameOm") || nameEn,
        nameAm: field(formData, "nameAm") || nameEn,
        startDate: new Date(start),
        endDate: new Date(end),
        isCurrent: field(formData, "isCurrent") === "yes",
      },
    });
  } catch (error) {
    go("/admin/years", { error: prismaKey(error) ?? "errors.duplicate" });
  }
  go("/admin/years", { ok: "common.saved" });
}

export async function createSemester(formData: FormData) {
  await requireRole("ADMIN");
  const academicYearId = field(formData, "academicYearId");
  const nameEn = field(formData, "nameEn");
  if (!academicYearId || !nameEn) go("/admin/years", { error: "errors.required" });
  const count = await prisma.semester.count({ where: { academicYearId } });
  try {
    await prisma.semester.create({
      data: { academicYearId, nameEn, nameOm: field(formData, "nameOm") || nameEn, nameAm: field(formData, "nameAm") || nameEn, sortOrder: count + 1 },
    });
  } catch (error) {
    go("/admin/years", { error: prismaKey(error) ?? "errors.duplicate" });
  }
  go("/admin/years", { ok: "common.saved" });
}

export async function setPublished(formData: FormData) {
  await requireRole("ADMIN");
  await prisma.semester.update({ where: { id: field(formData, "id") }, data: { isPublished: field(formData, "publish") === "yes" } });
  go("/admin/years", { ok: "common.saved" });
}

export async function makeCurrentYear(formData: FormData) {
  await requireRole("ADMIN");
  const id = field(formData, "id");
  await prisma.academicYear.updateMany({ data: { isCurrent: false } });
  await prisma.academicYear.update({ where: { id }, data: { isCurrent: true } });
  go("/admin/years", { ok: "common.saved" });
}

export async function createAssignment(formData: FormData) {
  await requireRole("ADMIN");
  const teacherId = field(formData, "teacherId");
  const academicYearId = field(formData, "academicYearId");
  const sectionId = field(formData, "sectionId");
  const subjectIds = formData.getAll("subjectId").map(String).filter(Boolean);
  const target = `/admin/assignments?academicYearId=${encodeURIComponent(academicYearId)}&sectionId=${encodeURIComponent(sectionId)}`;
  if (!teacherId || !academicYearId || !sectionId || subjectIds.length === 0) go(target, { error: "errors.required" });
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  for (const subjectId of subjectIds) {
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject || !section || subject.gradeId !== section.gradeId) go(target, { error: "errors.assignment" });
    await prisma.teacherAssignment.upsert({
      where: { teacherId_subjectId_sectionId_academicYearId: { teacherId, subjectId, sectionId, academicYearId } },
      create: { teacherId, subjectId, sectionId, academicYearId },
      update: {},
    });
  }
  go(target, { ok: "assignments.saved" });
}

export async function deleteAssignment(formData: FormData) {
  await requireRole("ADMIN");
  const id = field(formData, "id");
  await rememberDelete("TeacherAssignment", id);
  await prisma.teacherAssignment.delete({ where: { id } });
  go(back(field(formData, "back") || "/admin/assignments"), { ok: "common.deleted" });
}

export async function promoteStudents(formData: FormData) {
  await requireRole("ADMIN");
  const fromId = field(formData, "fromYear");
  let toId = field(formData, "toYear");
  if (field(formData, "createYear") === "yes") {
    const nameEn = field(formData, "yearName");
    const start = field(formData, "start");
    const end = field(formData, "end");
    if (!nameEn || !start || !end) go("/admin/promotion", { error: "errors.required" });
    const created = await prisma.academicYear.create({
      data: { nameEn, nameOm: field(formData, "yearNameOm") || nameEn, nameAm: field(formData, "yearNameAm") || nameEn, startDate: new Date(start), endDate: new Date(end) },
    });
    toId = created.id;
  }
  if (!fromId || !toId) go("/admin/promotion", { error: "errors.required" });
  if (fromId === toId) go("/admin/promotion", { error: "errors.sameYear" });
  const placements = await prisma.placement.findMany({
    where: { academicYearId: fromId },
    include: { grade: true, section: true, stream: true, student: { include: { user: true } } },
  });
  if (placements.length === 0) go("/admin/promotion", { error: "promotion.noStudents", fromYear: fromId });
  const skipped: string[] = [];
  let count = 0;
  for (const placement of placements) {
    const action = field(formData, `action_${placement.studentId}`) || "promote";
    if (action === "graduate") {
      await prisma.student.update({ where: { id: placement.studentId }, data: { status: "GRADUATED" } });
      count += 1;
      continue;
    }
    let gradeId = placement.gradeId;
    let repeater = false;
    if (action === "repeat") repeater = true;
    else if (!placement.grade.nextGradeId) {
      skipped.push(placement.student.user.fullName);
      continue;
    } else gradeId = placement.grade.nextGradeId;
    const grade = await prisma.grade.findUnique({ where: { id: gradeId }, include: { sections: true, streams: true } });
    if (!grade) continue;
    let section = grade.sections.find((item) => item.name === placement.section.name);
    if (!section) section = await prisma.section.create({ data: { gradeId, name: placement.section.name } });
    const stream = placement.stream ? grade.streams.find((item) => item.nameEn === placement.stream?.nameEn) : null;
    await prisma.placement.upsert({
      where: { studentId_academicYearId: { studentId: placement.studentId, academicYearId: toId } },
      create: { studentId: placement.studentId, academicYearId: toId, gradeId, sectionId: section.id, streamId: stream?.id ?? null, isRepeater: repeater },
      update: { gradeId, sectionId: section.id, streamId: stream?.id ?? null, isRepeater: repeater },
    });
    if (placement.student.status !== "LEFT") await prisma.student.update({ where: { id: placement.studentId }, data: { status: "ACTIVE" } });
    count += 1;
  }
  go("/admin/promotion", { ok: "promotion.done", count, names: skipped.join(", "), fromYear: fromId, toYear: toId });
}

export async function saveSettings(formData: FormData) {
  await requireRole("ADMIN");
  const passMark = Number(field(formData, "passMark"));
  if (!field(formData, "nameEn") || !field(formData, "shortName") || !(passMark >= 0)) go("/admin/settings", { error: "errors.required" });
  const data: {
    nameEn: string;
    nameOm: string;
    nameAm: string;
    shortName: string;
    passMark: number;
    showEthiopianCalendar: boolean;
    studentIdFormat: string;
    teacherIdFormat: string;
    logoData?: Uint8Array<ArrayBuffer> | null;
    logoMime?: string | null;
  } = {
    nameEn: field(formData, "nameEn"),
    nameOm: field(formData, "nameOm"),
    nameAm: field(formData, "nameAm"),
    shortName: field(formData, "shortName"),
    passMark,
    showEthiopianCalendar: field(formData, "calendar") === "yes",
    studentIdFormat: field(formData, "studentIdFormat") || "AB{seq:4}",
    teacherIdFormat: field(formData, "teacherIdFormat") || "ABT{seq:3}",
  };
  if (field(formData, "removeLogo") === "yes") {
    data.logoData = null;
    data.logoMime = null;
  }
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > 400_000) go("/admin/settings", { error: "errors.fileTooBig" });
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(logo.type)) go("/admin/settings", { error: "errors.fileType" });
    data.logoData = new Uint8Array(await logo.arrayBuffer()) as Uint8Array<ArrayBuffer>;
    data.logoMime = logo.type;
  }
  await prisma.schoolSettings.upsert({ where: { id: "school" }, create: { id: "school", ...data }, update: data });
  go("/admin/settings", { ok: "settings.saved" });
}

export async function restoreBackup(formData: FormData) {
  await requireRole("ADMIN");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) go("/admin/backup", { error: "errors.fileMissing" });
  if (file.size > 30_000_000) go("/admin/backup", { error: "errors.fileTooBig" });
  const mode = field(formData, "mode") === "replace" ? "replace" : "merge";
  if (mode === "replace" && field(formData, "confirm") !== "REPLACE") go("/admin/backup", { error: "errors.restoreConfirm" });
  let counts: { inserted: number; updated: number; skipped: number; deleted: number } | null = null;
  let errorKey = "";
  try {
    const parsed = parseBackup(await file.text());
    counts = await applyBackup(parsed, mode);
    await prisma.syncLog.create({ data: { direction: `restore-${mode}`, detail: JSON.stringify(counts) } });
  } catch (error) {
    errorKey = error instanceof Error && error.message.startsWith("errors.") ? error.message : "errors.checksum";
  }
  if (errorKey || !counts) go("/admin/backup", { error: errorKey || "errors.checksum" });
  if (mode === "replace") {
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
    go("/login", { ok: "backup.restored", ...counts });
  }
  go("/admin/backup", { ok: "backup.restored", ...counts });
}

export async function syncNow(formData: FormData) {
  const session = await requireRole("ADMIN");
  const direction = field(formData, "direction") === "pull" ? "pull" : "push";
  let counts: { inserted: number; updated: number; skipped: number; deleted: number } | null = null;
  let errorKey = "";
  try {
    counts = direction === "pull" ? await pullRemote() : await pushRemote();
    await prisma.syncLog.create({ data: { direction, detail: JSON.stringify(counts) } });
  } catch (error) {
    errorKey = error instanceof Error && (error.message.startsWith("errors.") || error.message.startsWith("backup.")) ? error.message : "errors.sync";
    await prisma.syncLog.create({ data: { direction, detail: errorKey } }).catch(() => undefined);
  }
  if (errorKey || !counts) go("/admin/backup", { error: errorKey || "errors.sync" });
  go("/admin/backup", { ok: "backup.syncOk", ...counts });
  void session;
}
