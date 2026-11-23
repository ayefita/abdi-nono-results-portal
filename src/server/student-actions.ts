"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { field, go, parseSex, prismaKey } from "@/lib/form";
import { hashPassword } from "@/lib/password";
import { baseUsername, fullName, uniqueUsername } from "@/lib/username";
import { deleteUser } from "@/lib/tombstone";
import { column, readTable } from "@/lib/excel";
import { allocateId, yearToken } from "@/lib/ids";

async function currentYear() {
  return prisma.academicYear.findFirst({ where: { isCurrent: true } });
}

export async function createStudent(formData: FormData) {
  await requireRole("ADMIN");
  const first = field(formData, "firstName");
  const father = field(formData, "fatherName");
  const grand = field(formData, "grandfather");
  const sex = parseSex(field(formData, "sex"));
  const gradeId = field(formData, "gradeId");
  const sectionId = field(formData, "sectionId");
  const streamId = field(formData, "streamId");
  const back = "/admin/students/new";
  if (!first || !father || !sex || !gradeId || !sectionId) go(back, { error: "errors.required", gradeId });
  const year = await currentYear();
  if (!year) go(back, { error: "errors.noCurrentYear", gradeId });
  const grade = await prisma.grade.findUnique({ where: { id: gradeId }, include: { streams: true } });
  if (!grade) go(back, { error: "errors.gradeMissing" });
  if (grade.streams.length > 0 && !streamId) go(back, { error: "errors.streamRequired", gradeId });
  const section = await prisma.section.findFirst({ where: { id: sectionId, gradeId } });
  if (!section) go(back, { error: "errors.sectionMissing", gradeId });
  let username = "";
  let code = "";
  try {
    const created = await prisma.$transaction(async (tx) => {
      const studentCode = await allocateId(tx, "student", yearToken(year.nameEn));
      const taken = new Set((await tx.user.findMany({ select: { username: true } })).map((user) => user.username));
      const requested = field(formData, "username").toLowerCase();
      const nextUsername = requested || uniqueUsername(baseUsername(first, father, studentCode), taken);
      if (taken.has(nextUsername)) throw new Error("errors.usernameTaken");
      const user = await tx.user.create({
        data: {
          username: nextUsername,
          passwordHash: await hashPassword(studentCode),
          role: "STUDENT",
          fullName: fullName(first, father, grand),
          firstName: first,
          fatherName: father,
          sex,
          mustChangePassword: true,
        },
      });
      const student = await tx.student.create({
        data: { userId: user.id, studentCode, firstName: first, fatherName: father, grandfatherName: grand, sex },
      });
      await tx.placement.create({
        data: { studentId: student.id, academicYearId: year.id, gradeId, sectionId, streamId: streamId || null },
      });
      return { username: nextUsername, studentCode };
    });
    username = created.username;
    code = created.studentCode;
  } catch (error) {
    const key = error instanceof Error && error.message.startsWith("errors.") ? error.message : prismaKey(error) ?? "errors.duplicate";
    go(back, { error: key, gradeId });
  }
  go(back, { created: "1", username, studentId: code, gradeId });
}

export async function updateStudent(formData: FormData) {
  await requireRole("ADMIN");
  const id = field(formData, "id");
  const back = `/admin/students/${id}`;
  const student = await prisma.student.findUnique({ where: { id }, include: { user: true } });
  if (!student) go("/admin/students", { error: "errors.notFound" });
  const first = field(formData, "firstName");
  const father = field(formData, "fatherName");
  const grand = field(formData, "grandfather");
  const sex = parseSex(field(formData, "sex"));
  const username = field(formData, "username").toLowerCase();
  const status = field(formData, "status");
  const gradeId = field(formData, "gradeId");
  const sectionId = field(formData, "sectionId");
  const streamId = field(formData, "streamId");
  if (!first || !father || !sex || !username) go(back, { error: "errors.required" });
  if (status !== "ACTIVE" && status !== "GRADUATED" && status !== "LEFT") go(back, { error: "errors.invalid" });
  const year = await currentYear();
  if (!year) go(back, { error: "errors.noCurrentYear" });
  try {
    await prisma.user.update({
      where: { id: student.userId },
      data: { username, fullName: fullName(first, father, grand), firstName: first, fatherName: father, sex },
    });
    await prisma.student.update({
      where: { id },
      data: { firstName: first, fatherName: father, grandfatherName: grand, sex, status },
    });
    if (gradeId && sectionId) {
      await prisma.placement.upsert({
        where: { studentId_academicYearId: { studentId: id, academicYearId: year.id } },
        create: { studentId: id, academicYearId: year.id, gradeId, sectionId, streamId: streamId || null },
        update: { gradeId, sectionId, streamId: streamId || null },
      });
    }
  } catch (error) {
    go(back, { error: prismaKey(error) ?? "errors.duplicate" });
  }
  go(back, { ok: "common.saved" });
}

export async function deleteStudents(formData: FormData) {
  await requireRole("ADMIN");
  const back = field(formData, "back") || "/admin/students";
  if (field(formData, "confirm") !== "DELETE") go(back, { error: "errors.confirmDelete" });
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  for (const id of ids) {
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) continue;
    await deleteUser(student.userId, student.id);
  }
  go("/admin/students", { ok: "students.deleted" });
}

export async function importStudents(formData: FormData) {
  const session = await requireRole("ADMIN");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) go("/admin/students/import", { error: "errors.fileMissing" });
  if (file.size > 5_000_000) go("/admin/students/import", { error: "errors.fileTooBig" });
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".csv")) go("/admin/students/import", { error: "errors.fileType" });
  const year = await currentYear();
  if (!year) go("/admin/students/import", { error: "errors.noCurrentYear" });
  const rows = readTable(Buffer.from(await file.arrayBuffer()), file.name);
  const grades = await prisma.grade.findMany({ include: { sections: true, streams: true } });
  const taken = new Set((await prisma.user.findMany({ select: { username: true } })).map((user) => user.username));
  const summary: { status: string; studentId: string; username: string; name: string; detail: string }[] = [];
  for (const [index, row] of rows.entries()) {
    const supplied = column(row, ["student_id", "studentid", "id", "student_code"]).toUpperCase();
    if (supplied === "EXAMPLE") continue;
    const first = column(row, ["first_name", "firstname", "first"]);
    const father = column(row, ["father_name", "fathername", "father"]);
    const grand = column(row, ["grandfather_name", "grandfather", "gfather"]);
    const sex = parseSex(column(row, ["sex", "gender"]));
    const gradeName = column(row, ["grade", "class"]);
    const sectionName = column(row, ["section", "section_name"]);
    const streamName = column(row, ["stream", "stream_name"]);
    if (!first || !father || !sex || !gradeName || !sectionName) {
      summary.push({ status: "error", studentId: supplied, username: "", name: fullName(first, father, grand), detail: "errors.required" });
      continue;
    }
    const grade = grades.find((item) => [item.name, item.nameOm, item.nameAm].some((value) => value.toLowerCase() === gradeName.toLowerCase()));
    if (!grade) {
      summary.push({ status: "error", studentId: supplied, username: "", name: fullName(first, father, grand), detail: "errors.gradeMissing" });
      continue;
    }
    let section = grade.sections.find((item) => item.name.toLowerCase() === sectionName.toLowerCase());
    if (!section) {
      section = await prisma.section.create({ data: { gradeId: grade.id, name: sectionName } });
      grade.sections.push(section);
    }
    let streamId: string | null = null;
    if (grade.streams.length > 0) {
      const stream = grade.streams.find((item) => [item.nameEn, item.nameOm, item.nameAm].some((value) => value.toLowerCase() === streamName.toLowerCase()));
      if (!stream) {
        summary.push({ status: "error", studentId: supplied, username: "", name: fullName(first, father, grand), detail: "errors.streamRequired" });
        continue;
      }
      streamId = stream.id;
    }
    try {
      const code = supplied || (await prisma.$transaction((tx) => allocateId(tx, "student", yearToken(year.nameEn))));
      const existing = supplied
        ? await prisma.student.findFirst({ where: { studentCode: { equals: supplied, mode: "insensitive" } }, include: { user: true } })
        : null;
      if (existing) {
        await prisma.user.update({ where: { id: existing.userId }, data: { fullName: fullName(first, father, grand), firstName: first, fatherName: father, sex } });
        await prisma.student.update({ where: { id: existing.id }, data: { firstName: first, fatherName: father, grandfatherName: grand, sex } });
        await prisma.placement.upsert({
          where: { studentId_academicYearId: { studentId: existing.id, academicYearId: year.id } },
          create: { studentId: existing.id, academicYearId: year.id, gradeId: grade.id, sectionId: section.id, streamId },
          update: { gradeId: grade.id, sectionId: section.id, streamId },
        });
        summary.push({ status: "updated", studentId: code, username: existing.user.username, name: fullName(first, father, grand), detail: "" });
      } else {
        const username = uniqueUsername(baseUsername(first, father, code), taken);
        taken.add(username);
        const user = await prisma.user.create({
          data: { username, passwordHash: await hashPassword(code), role: "STUDENT", fullName: fullName(first, father, grand), firstName: first, fatherName: father, sex, mustChangePassword: true },
        });
        const student = await prisma.student.create({
          data: { userId: user.id, studentCode: code, firstName: first, fatherName: father, grandfatherName: grand, sex },
        });
        await prisma.placement.create({ data: { studentId: student.id, academicYearId: year.id, gradeId: grade.id, sectionId: section.id, streamId } });
        summary.push({ status: "created", studentId: code, username, name: fullName(first, father, grand), detail: "" });
      }
    } catch {
      summary.push({ status: "error", studentId: supplied, username: "", name: fullName(first, father, grand), detail: "errors.duplicate" });
    }
    void index;
  }
  const batch = await prisma.importBatch.create({ data: { kind: "students", summary, createdBy: session.userId } });
  go(`/admin/students/import/${batch.id}`);
}

export async function resetStudentPassword(formData: FormData) {
  await requireRole("ADMIN");
  const id = field(formData, "studentId");
  const student = await prisma.student.findUnique({ where: { id }, include: { user: true } });
  if (!student) go("/admin/credentials", { error: "errors.notFound" });
  await prisma.user.update({
    where: { id: student.userId },
    data: { passwordHash: await hashPassword(student.studentCode), mustChangePassword: true, tokenVersion: { increment: 1 } },
  });
  go("/admin/credentials", { ok: "credentials.resetDone", username: student.user.username });
}

export async function saveStaff(formData: FormData) {
  await requireRole("ADMIN");
  const role = field(formData, "role") === "DIRECTOR" ? "DIRECTOR" : field(formData, "role") === "TEACHER" ? "TEACHER" : "";
  const id = field(formData, "id");
  const back = role === "DIRECTOR" ? "/admin/directors" : "/admin/teachers";
  if (!role) go(back, { error: "errors.invalid" });
  const first = field(formData, "firstName");
  const father = field(formData, "fatherName");
  const sex = parseSex(field(formData, "sex"));
  const phone = field(formData, "phone");
  const password = field(formData, "password");
  if (!first || !father || !sex) go(id ? `${back}/${id}` : back, { error: "errors.required" });
  const taken = new Set((await prisma.user.findMany({ select: { username: true } })).map((user) => user.username));
  if (id) {
    const teacher = role === "TEACHER" ? await prisma.teacher.findUnique({ where: { id }, include: { user: true } }) : null;
    const userId = role === "TEACHER" ? teacher?.userId : id;
    if (!userId) go(back, { error: "errors.notFound" });
    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (!current || current.role !== role) go(back, { error: "errors.notFound" });
    taken.delete(current.username);
    const username = (field(formData, "username") || current.username).toLowerCase();
    if (taken.has(username)) go(back, { error: "errors.usernameTaken" });
    await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        fullName: fullName(first, father),
        firstName: first,
        fatherName: father,
        sex,
        phone: phone || null,
        ...(password ? { passwordHash: await hashPassword(password), mustChangePassword: false, tokenVersion: { increment: 1 } } : {}),
      },
    });
    go(role === "TEACHER" ? `/admin/teachers/${id}` : back, { ok: "common.saved" });
  }
  if (role === "DIRECTOR" && password.length < 8) go(back, { error: "errors.passwordShort" });
  const year = await currentYear();
  let username = "";
  let staffCode = "";
  try {
    const created = await prisma.$transaction(async (tx) => {
      const names = new Set((await tx.user.findMany({ select: { username: true } })).map((user) => user.username));
      const nextUsername = (field(formData, "username") || uniqueUsername(baseUsername(first, father), names)).toLowerCase();
      if (names.has(nextUsername)) throw new Error("errors.usernameTaken");
      const code = role === "TEACHER" ? await allocateId(tx, "teacher", yearToken(year?.nameEn)) : "";
      const secret = role === "TEACHER" ? code : password;
      const user = await tx.user.create({
        data: {
          username: nextUsername,
          passwordHash: await hashPassword(secret),
          role,
          fullName: fullName(first, father),
          firstName: first,
          fatherName: father,
          sex,
          phone: phone || null,
          staffCode: code || null,
          mustChangePassword: role === "TEACHER",
        },
      });
      if (role === "TEACHER") await tx.teacher.create({ data: { userId: user.id } });
      return { username: nextUsername, staffCode: code };
    });
    username = created.username;
    staffCode = created.staffCode;
  } catch (error) {
    const key = error instanceof Error && error.message.startsWith("errors.") ? error.message : prismaKey(error) ?? "errors.duplicate";
    go(back, { error: key });
  }
  go(back, { ok: role === "DIRECTOR" ? "directors.created" : "teachers.created", username, studentId: staffCode });
}

export async function deleteStaff(formData: FormData) {
  await requireRole("ADMIN");
  const role = field(formData, "role") === "DIRECTOR" ? "DIRECTOR" : "TEACHER";
  const back = role === "DIRECTOR" ? "/admin/directors" : "/admin/teachers";
  if (field(formData, "confirm") !== "DELETE") go(back, { error: "errors.confirmDelete" });
  const id = field(formData, "id");
  if (role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({ where: { id } });
    if (!teacher) go(back, { error: "errors.notFound" });
    await deleteUser(teacher.userId);
  } else {
    const user = await prisma.user.findFirst({ where: { id, role: "DIRECTOR" } });
    if (!user) go(back, { error: "errors.notFound" });
    await deleteUser(user.id);
  }
  go(back, { ok: "common.deleted" });
}
