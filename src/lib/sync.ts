import { createHash, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";

export type SyncCounts = { inserted: number; updated: number; skipped: number; deleted: number };

type Row = Record<string, unknown> & { id: string; updatedAt?: string; createdAt?: string };

export type BackupFile = {
  format: "abdi-nono-backup" | "ifa-boru-backup";
  version: 1;
  exportedAt: string;
  checksum: string;
  data: {
    settings: Row | null;
    grades: Row[];
    sections: Row[];
    streams: Row[];
    years: Row[];
    semesters: Row[];
    users: Row[];
    teachers: Row[];
    students: Row[];
    subjects: Row[];
    components: Row[];
    placements: Row[];
    assignments: Row[];
    marks: Row[];
    tombstones: { id: string; entity: string; entityId: string; deletedAt: string }[];
  };
};

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function pack(row: Record<string, unknown>) {
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) copy[key] = value.toISOString();
    else if (value instanceof Uint8Array) copy[key] = Buffer.from(value).toString("base64");
    else copy[key] = value;
  }
  return copy as Row;
}

export async function buildExport(): Promise<BackupFile> {
  const [settings, grades, sections, streams, years, semesters, users, teachers, students, subjects, components, placements, assignments, marks, tombstones] = await Promise.all([
    prisma.schoolSettings.findUnique({ where: { id: "school" } }),
    prisma.grade.findMany(),
    prisma.section.findMany(),
    prisma.stream.findMany(),
    prisma.academicYear.findMany(),
    prisma.semester.findMany(),
    prisma.user.findMany(),
    prisma.teacher.findMany(),
    prisma.student.findMany(),
    prisma.subject.findMany(),
    prisma.assessmentComponent.findMany(),
    prisma.placement.findMany(),
    prisma.teacherAssignment.findMany(),
    prisma.mark.findMany(),
    prisma.tombstone.findMany(),
  ]);
  const data = {
    settings: settings ? pack({ ...settings, logoData: settings.logoData ? Buffer.from(settings.logoData).toString("base64") : null }) : null,
    grades: grades.map((row) => pack(row)),
    sections: sections.map((row) => pack(row)),
    streams: streams.map((row) => pack(row)),
    years: years.map((row) => pack(row)),
    semesters: semesters.map((row) => pack(row)),
    users: users.map((row) => pack(row)),
    teachers: teachers.map((row) => pack(row)),
    students: students.map((row) => pack(row)),
    subjects: subjects.map((row) => pack(row)),
    components: components.map((row) => pack(row)),
    placements: placements.map((row) => pack(row)),
    assignments: assignments.map((row) => pack(row)),
    marks: marks.map((row) => pack(row)),
    tombstones: tombstones.map((row) => ({ ...row, deletedAt: row.deletedAt.toISOString() })),
  };
  const checksum = createHash("sha256").update(JSON.stringify(data)).digest("hex");
  return { format: "abdi-nono-backup", version: 1, exportedAt: new Date().toISOString(), checksum, data };
}

export function parseBackup(text: string): BackupFile {
  const file = JSON.parse(text) as BackupFile;
  // "ifa-boru-backup" is the format name used by older backup files; keep accepting it.
  if ((file.format !== "abdi-nono-backup" && file.format !== "ifa-boru-backup") || file.version !== 1 || !file.data) {
    throw new Error("errors.checksum");
  }
  const checksum = createHash("sha256").update(JSON.stringify(file.data)).digest("hex");
  const left = Buffer.from(checksum);
  const right = Buffer.from(String(file.checksum || ""));
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new Error("errors.checksum");
  return file;
}

function dateOf(value: unknown) {
  return value ? new Date(String(value)) : new Date();
}

function bytes(value: unknown) {
  if (!value || typeof value !== "string") return null;
  return new Uint8Array(Buffer.from(value, "base64"));
}

async function stamp(table: string, id: string, updatedAt: unknown) {
  const when = dateOf(updatedAt);
  const sql: Record<string, (id: string) => Promise<number>> = {
    SchoolSettings: (rowId) => prisma.$executeRaw`UPDATE "SchoolSettings" SET "updatedAt" = ${when} WHERE "id" = ${rowId}`,
    Grade: (rowId) => prisma.$executeRaw`UPDATE "Grade" SET "updatedAt" = ${when} WHERE "id" = ${rowId}`,
    Section: (rowId) => prisma.$executeRaw`UPDATE "Section" SET "updatedAt" = ${when} WHERE "id" = ${rowId}`,
    Stream: (rowId) => prisma.$executeRaw`UPDATE "Stream" SET "updatedAt" = ${when} WHERE "id" = ${rowId}`,
    AcademicYear: (rowId) => prisma.$executeRaw`UPDATE "AcademicYear" SET "updatedAt" = ${when} WHERE "id" = ${rowId}`,
    Semester: (rowId) => prisma.$executeRaw`UPDATE "Semester" SET "updatedAt" = ${when} WHERE "id" = ${rowId}`,
    User: (rowId) => prisma.$executeRaw`UPDATE "User" SET "updatedAt" = ${when} WHERE "id" = ${rowId}`,
    Teacher: (rowId) => prisma.$executeRaw`UPDATE "Teacher" SET "updatedAt" = ${when} WHERE "id" = ${rowId}`,
    Student: (rowId) => prisma.$executeRaw`UPDATE "Student" SET "updatedAt" = ${when} WHERE "id" = ${rowId}`,
    Subject: (rowId) => prisma.$executeRaw`UPDATE "Subject" SET "updatedAt" = ${when} WHERE "id" = ${rowId}`,
    AssessmentComponent: (rowId) => prisma.$executeRaw`UPDATE "AssessmentComponent" SET "updatedAt" = ${when} WHERE "id" = ${rowId}`,
    Placement: (rowId) => prisma.$executeRaw`UPDATE "Placement" SET "updatedAt" = ${when} WHERE "id" = ${rowId}`,
    TeacherAssignment: (rowId) => prisma.$executeRaw`UPDATE "TeacherAssignment" SET "updatedAt" = ${when} WHERE "id" = ${rowId}`,
    Mark: (rowId) => prisma.$executeRaw`UPDATE "Mark" SET "updatedAt" = ${when} WHERE "id" = ${rowId}`,
  };
  await sql[table]?.(id);
}

async function blocked(entity: string, id: string, updatedAt: unknown) {
  const tomb = await prisma.tombstone.findUnique({ where: { entity_entityId: { entity, entityId: id } } });
  return Boolean(tomb && tomb.deletedAt.getTime() > dateOf(updatedAt).getTime());
}

export async function applyBackup(file: BackupFile, mode: "merge" | "replace"): Promise<SyncCounts> {
  const counts: SyncCounts = { inserted: 0, updated: 0, skipped: 0, deleted: 0 };
  if (mode === "replace") {
    await prisma.$transaction([
      prisma.mark.deleteMany(),
      prisma.teacherAssignment.deleteMany(),
      prisma.placement.deleteMany(),
      prisma.assessmentComponent.deleteMany(),
      prisma.subject.deleteMany(),
      prisma.importBatch.deleteMany(),
      prisma.syncLog.deleteMany(),
      prisma.tombstone.deleteMany(),
      prisma.semester.deleteMany(),
      prisma.academicYear.deleteMany(),
      prisma.student.deleteMany(),
      prisma.teacher.deleteMany(),
      prisma.user.deleteMany(),
      prisma.stream.deleteMany(),
      prisma.section.deleteMany(),
      prisma.grade.deleteMany(),
      prisma.schoolSettings.deleteMany(),
    ]);
  }
  const data = file.data;
  const consider = async (entity: string, table: string, row: Row | null, write: () => Promise<"inserted" | "updated" | "skipped">) => {
    if (!row) return;
    if (mode === "merge" && (await blocked(entity, row.id, row.updatedAt))) {
      counts.skipped += 1;
      return;
    }
    try {
      const result = await write();
      counts[result] += 1;
      if (result !== "skipped") await stamp(table, row.id, row.updatedAt);
    } catch {
      counts.skipped += 1;
    }
  };

  if (data.settings) {
    const row = data.settings;
    await consider("SchoolSettings", "SchoolSettings", row, async () => {
      const existing = await prisma.schoolSettings.findUnique({ where: { id: row.id } });
      const payload = {
        nameEn: String(row.nameEn),
        nameOm: String(row.nameOm),
        nameAm: String(row.nameAm),
        shortName: String(row.shortName),
        passMark: Number(row.passMark),
        showEthiopianCalendar: Boolean(row.showEthiopianCalendar),
        logoMime: row.logoMime ? String(row.logoMime) : null,
        logoData: bytes(row.logoData),
      };
      if (!existing) {
        await prisma.schoolSettings.create({ data: { id: row.id, ...payload } });
        return "inserted";
      }
      if (mode === "merge" && existing.updatedAt.getTime() > dateOf(row.updatedAt).getTime()) return "skipped";
      await prisma.schoolSettings.update({ where: { id: row.id }, data: payload });
      return "updated";
    });
  }

  for (const row of data.grades) {
    await consider("Grade", "Grade", row, async () => {
      const existing = await prisma.grade.findUnique({ where: { id: row.id } });
      const payload = { name: String(row.name), nameOm: String(row.nameOm ?? ""), nameAm: String(row.nameAm ?? ""), sortOrder: Number(row.sortOrder) };
      if (!existing) {
        await prisma.grade.create({ data: { id: row.id, ...payload } });
        return "inserted";
      }
      if (mode === "merge" && existing.updatedAt.getTime() > dateOf(row.updatedAt).getTime()) return "skipped";
      await prisma.grade.update({ where: { id: row.id }, data: payload });
      return "updated";
    });
  }
  for (const row of data.grades) {
    if (row.nextGradeId) {
      await prisma.grade.update({ where: { id: row.id }, data: { nextGradeId: String(row.nextGradeId) } }).catch(() => undefined);
    }
  }

  const simple: { entity: string; rows: Row[]; save: (row: Row, fresh: boolean) => Promise<void>; find: (id: string) => Promise<{ updatedAt: Date } | null> }[] = [
    {
      entity: "Section",
      rows: data.sections,
      find: (id) => prisma.section.findUnique({ where: { id } }),
      save: (row, fresh) => {
        const payload = { gradeId: String(row.gradeId), name: String(row.name) };
        return fresh ? prisma.section.create({ data: { id: row.id, ...payload } }).then(() => undefined) : prisma.section.update({ where: { id: row.id }, data: payload }).then(() => undefined);
      },
    },
    {
      entity: "Stream",
      rows: data.streams,
      find: (id) => prisma.stream.findUnique({ where: { id } }),
      save: (row, fresh) => {
        const payload = { gradeId: String(row.gradeId), nameEn: String(row.nameEn), nameOm: String(row.nameOm), nameAm: String(row.nameAm) };
        return fresh ? prisma.stream.create({ data: { id: row.id, ...payload } }).then(() => undefined) : prisma.stream.update({ where: { id: row.id }, data: payload }).then(() => undefined);
      },
    },
    {
      entity: "AcademicYear",
      rows: data.years,
      find: (id) => prisma.academicYear.findUnique({ where: { id } }),
      save: (row, fresh) => {
        const payload = { nameEn: String(row.nameEn), nameOm: String(row.nameOm), nameAm: String(row.nameAm), startDate: dateOf(row.startDate), endDate: dateOf(row.endDate), isCurrent: Boolean(row.isCurrent) };
        return fresh ? prisma.academicYear.create({ data: { id: row.id, ...payload } }).then(() => undefined) : prisma.academicYear.update({ where: { id: row.id }, data: payload }).then(() => undefined);
      },
    },
    {
      entity: "Semester",
      rows: data.semesters,
      find: (id) => prisma.semester.findUnique({ where: { id } }),
      save: (row, fresh) => {
        const payload = { academicYearId: String(row.academicYearId), nameEn: String(row.nameEn), nameOm: String(row.nameOm), nameAm: String(row.nameAm), sortOrder: Number(row.sortOrder), isPublished: Boolean(row.isPublished) };
        return fresh ? prisma.semester.create({ data: { id: row.id, ...payload } }).then(() => undefined) : prisma.semester.update({ where: { id: row.id }, data: payload }).then(() => undefined);
      },
    },
    {
      entity: "User",
      rows: data.users,
      find: (id) => prisma.user.findUnique({ where: { id } }),
      save: (row, fresh) => {
        const payload = {
          username: String(row.username),
          passwordHash: String(row.passwordHash),
          role: String(row.role) as "ADMIN" | "TEACHER" | "DIRECTOR" | "STUDENT",
          fullName: String(row.fullName),
          firstName: String(row.firstName ?? ""),
          fatherName: String(row.fatherName ?? ""),
          sex: row.sex ? (String(row.sex) as "MALE" | "FEMALE") : null,
          phone: row.phone ? String(row.phone) : null,
          mustChangePassword: Boolean(row.mustChangePassword),
          preferredLanguage: String(row.preferredLanguage ?? "en"),
          tokenVersion: Number(row.tokenVersion ?? 0),
        };
        return fresh ? prisma.user.create({ data: { id: row.id, ...payload } }).then(() => undefined) : prisma.user.update({ where: { id: row.id }, data: payload }).then(() => undefined);
      },
    },
    {
      entity: "Teacher",
      rows: data.teachers,
      find: (id) => prisma.teacher.findUnique({ where: { id } }),
      save: (row, fresh) => (fresh ? prisma.teacher.create({ data: { id: row.id, userId: String(row.userId) } }) : prisma.teacher.update({ where: { id: row.id }, data: { userId: String(row.userId) } })).then(() => undefined),
    },
    {
      entity: "Student",
      rows: data.students,
      find: (id) => prisma.student.findUnique({ where: { id } }),
      save: (row, fresh) => {
        const payload = {
          userId: String(row.userId),
          studentCode: String(row.studentCode),
          firstName: String(row.firstName),
          fatherName: String(row.fatherName),
          grandfatherName: String(row.grandfatherName ?? ""),
          sex: String(row.sex) as "MALE" | "FEMALE",
          status: String(row.status ?? "ACTIVE") as "ACTIVE" | "GRADUATED" | "LEFT",
        };
        return fresh ? prisma.student.create({ data: { id: row.id, ...payload } }).then(() => undefined) : prisma.student.update({ where: { id: row.id }, data: payload }).then(() => undefined);
      },
    },
    {
      entity: "Subject",
      rows: data.subjects,
      find: (id) => prisma.subject.findUnique({ where: { id } }),
      save: (row, fresh) => {
        const payload = { gradeId: String(row.gradeId), streamId: row.streamId ? String(row.streamId) : null, code: String(row.code), nameEn: String(row.nameEn), nameOm: String(row.nameOm), nameAm: String(row.nameAm), sortOrder: Number(row.sortOrder ?? 0) };
        return fresh ? prisma.subject.create({ data: { id: row.id, ...payload } }).then(() => undefined) : prisma.subject.update({ where: { id: row.id }, data: payload }).then(() => undefined);
      },
    },
    {
      entity: "AssessmentComponent",
      rows: data.components,
      find: (id) => prisma.assessmentComponent.findUnique({ where: { id } }),
      save: (row, fresh) => {
        const payload = { subjectId: String(row.subjectId), nameEn: String(row.nameEn), nameOm: String(row.nameOm), nameAm: String(row.nameAm), maxScore: Number(row.maxScore), sortOrder: Number(row.sortOrder) };
        return fresh ? prisma.assessmentComponent.create({ data: { id: row.id, ...payload } }).then(() => undefined) : prisma.assessmentComponent.update({ where: { id: row.id }, data: payload }).then(() => undefined);
      },
    },
    {
      entity: "Placement",
      rows: data.placements,
      find: (id) => prisma.placement.findUnique({ where: { id } }),
      save: (row, fresh) => {
        const payload = { studentId: String(row.studentId), academicYearId: String(row.academicYearId), gradeId: String(row.gradeId), sectionId: String(row.sectionId), streamId: row.streamId ? String(row.streamId) : null, isRepeater: Boolean(row.isRepeater) };
        return fresh ? prisma.placement.create({ data: { id: row.id, ...payload } }).then(() => undefined) : prisma.placement.update({ where: { id: row.id }, data: payload }).then(() => undefined);
      },
    },
    {
      entity: "TeacherAssignment",
      rows: data.assignments,
      find: (id) => prisma.teacherAssignment.findUnique({ where: { id } }),
      save: (row, fresh) => {
        const payload = { teacherId: String(row.teacherId), subjectId: String(row.subjectId), sectionId: String(row.sectionId), academicYearId: String(row.academicYearId) };
        return fresh ? prisma.teacherAssignment.create({ data: { id: row.id, ...payload } }).then(() => undefined) : prisma.teacherAssignment.update({ where: { id: row.id }, data: payload }).then(() => undefined);
      },
    },
    {
      entity: "Mark",
      rows: data.marks,
      find: (id) => prisma.mark.findUnique({ where: { id } }),
      save: (row, fresh) => {
        const payload = { studentId: String(row.studentId), subjectId: String(row.subjectId), semesterId: String(row.semesterId), componentId: String(row.componentId), score: Number(row.score), enteredById: row.enteredById ? String(row.enteredById) : null };
        return fresh ? prisma.mark.create({ data: { id: row.id, ...payload } }).then(() => undefined) : prisma.mark.update({ where: { id: row.id }, data: payload }).then(() => undefined);
      },
    },
  ];

  for (const group of simple) {
    for (const row of group.rows) {
      await consider(group.entity, group.entity, row, async () => {
        const existing = await group.find(row.id);
        if (!existing) {
          await group.save(row, true);
          return "inserted";
        }
        if (mode === "merge" && existing.updatedAt.getTime() > dateOf(row.updatedAt).getTime()) return "skipped";
        await group.save(row, false);
        return "updated";
      });
    }
  }

  for (const tomb of data.tombstones) {
    const existing = await prisma.tombstone.findUnique({ where: { entity_entityId: { entity: tomb.entity, entityId: tomb.entityId } } });
    if (existing && existing.deletedAt.getTime() > dateOf(tomb.deletedAt).getTime()) {
      counts.skipped += 1;
      continue;
    }
    await prisma.tombstone.upsert({
      where: { entity_entityId: { entity: tomb.entity, entityId: tomb.entityId } },
      create: { id: tomb.id, entity: tomb.entity, entityId: tomb.entityId, deletedAt: dateOf(tomb.deletedAt) },
      update: { deletedAt: dateOf(tomb.deletedAt) },
    });
    const removed = await removeEntity(tomb.entity, tomb.entityId);
    if (removed) counts.deleted += removed;
  }
  return counts;
}

async function removeEntity(entity: string, id: string) {
  const result =
    entity === "User" ? await prisma.user.deleteMany({ where: { id } }) :
    entity === "Student" ? await prisma.student.deleteMany({ where: { id } }) :
    entity === "Teacher" ? await prisma.teacher.deleteMany({ where: { id } }) :
    entity === "Grade" ? await prisma.grade.deleteMany({ where: { id } }) :
    entity === "Section" ? await prisma.section.deleteMany({ where: { id } }) :
    entity === "Stream" ? await prisma.stream.deleteMany({ where: { id } }) :
    entity === "Subject" ? await prisma.subject.deleteMany({ where: { id } }) :
    entity === "AssessmentComponent" ? await prisma.assessmentComponent.deleteMany({ where: { id } }) :
    entity === "AcademicYear" ? await prisma.academicYear.deleteMany({ where: { id } }) :
    entity === "Semester" ? await prisma.semester.deleteMany({ where: { id } }) :
    entity === "Placement" ? await prisma.placement.deleteMany({ where: { id } }) :
    entity === "TeacherAssignment" ? await prisma.teacherAssignment.deleteMany({ where: { id } }) :
    entity === "Mark" ? await prisma.mark.deleteMany({ where: { id } }) :
    entity === "SchoolSettings" ? await prisma.schoolSettings.deleteMany({ where: { id } }) :
    { count: 0 };
  return result.count;
}

export function tokensMatch(header: string | null) {
  const expected = process.env.SYNC_TOKEN || "";
  if (!expected || !header?.startsWith("Bearer ")) return false;
  const given = header.slice("Bearer ".length);
  const left = Buffer.from(given);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function pushRemote() {
  const url = process.env.SYNC_REMOTE_URL;
  const token = process.env.SYNC_TOKEN;
  if (!url || !token) throw new Error("backup.notConfigured");
  const payload = await buildExport();
  const response = await fetch(new URL("/api/sync/push", url), {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("errors.sync");
  return response.json() as Promise<SyncCounts>;
}

export async function pullRemote() {
  const url = process.env.SYNC_REMOTE_URL;
  const token = process.env.SYNC_TOKEN;
  if (!url || !token) throw new Error("backup.notConfigured");
  const response = await fetch(new URL("/api/sync/pull", url), { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("errors.sync");
  const file = parseBackup(JSON.stringify(await response.json()));
  return applyBackup(file, "merge");
}

void iso;
