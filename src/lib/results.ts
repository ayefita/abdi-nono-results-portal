import { prisma } from "./prisma";
import { calcOverall, calcSubject, rankMap, type MarkStatus } from "./marks";
import { gradeLabel, localizedName } from "./labels";
import type { Lang } from "./i18n";
import { getSettings } from "./settings";
import type { Session } from "./types";

export type SubjectView = {
  subjectId: string;
  code: string;
  name: string;
  components: { id: string; name: string; max: number; score: number | null }[];
  total: number;
  max: number;
  percent: number;
  status: MarkStatus;
};

export type ResultView = {
  studentId: string;
  fullName: string;
  username: string;
  studentCode: string;
  sex: "MALE" | "FEMALE";
  placement: { grade: string; section: string; stream: string | null; year: string; isRepeater: boolean } | null;
  semester: { id: string; name: string; yearName: string; isPublished: boolean; academicYearId: string };
  subjects: SubjectView[];
  average: number;
  overall: MarkStatus;
  rank: number | null;
  classSize: number;
  passMark: number;
};

type SubjectRow = {
  id: string;
  gradeId: string;
  streamId: string | null;
  code: string;
  nameEn: string;
  nameOm: string;
  nameAm: string;
  sortOrder: number;
  components: { id: string; nameEn: string; nameOm: string; nameAm: string; maxScore: number; sortOrder: number }[];
};

function subjectsFor(all: SubjectRow[], gradeId: string, streamId: string | null) {
  return all
    .filter((subject) => subject.gradeId === gradeId && (subject.streamId == null || subject.streamId === streamId))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
}

export async function assertCanReadStudent(actor: Session, studentId: string) {
  if (actor.role === "ADMIN" || actor.role === "DIRECTOR") return;
  if (actor.role === "STUDENT") {
    if (actor.studentId !== studentId) {
      const error = new Error("errors.forbidden");
      (error as Error & { status: number }).status = 403;
      throw error;
    }
    return;
  }
  if (actor.role === "TEACHER" && actor.teacherId) {
    const placement = await prisma.placement.findFirst({
      where: {
        studentId,
        section: { assignments: { some: { teacherId: actor.teacherId } } },
      },
      select: { id: true },
    });
    if (placement) return;
  }
  const error = new Error("errors.forbidden");
  (error as Error & { status: number }).status = 403;
  throw error;
}

export async function getStudentResult(actor: Session, studentId: string, semesterId: string, lang: Lang): Promise<ResultView> {
  await assertCanReadStudent(actor, studentId);
  const settings = await getSettings();
  const semester = await prisma.semester.findUnique({ where: { id: semesterId }, include: { academicYear: true } });
  if (!semester) {
    const error = new Error("errors.notFound");
    (error as Error & { status: number }).status = 404;
    throw error;
  }
  if (actor.role === "STUDENT" && !semester.isPublished) {
    const error = new Error("results.unpublished");
    (error as Error & { status: number }).status = 403;
    throw error;
  }
  const student = await prisma.student.findUnique({ where: { id: studentId }, include: { user: true } });
  if (!student) {
    const error = new Error("errors.notFound");
    (error as Error & { status: number }).status = 404;
    throw error;
  }
  const placement = await prisma.placement.findUnique({
    where: { studentId_academicYearId: { studentId, academicYearId: semester.academicYearId } },
    include: { grade: true, section: true, stream: true, academicYear: true },
  });
  const yearName = localizedName(lang, semester.academicYear);
  const semesterName = localizedName(lang, semester);
  if (!placement) {
    return {
      studentId,
      fullName: student.user.fullName,
      username: student.user.username,
      studentCode: student.studentCode,
      sex: student.sex,
      placement: null,
      semester: { id: semester.id, name: semesterName, yearName, isPublished: semester.isPublished, academicYearId: semester.academicYearId },
      subjects: [],
      average: 0,
      overall: "incomplete",
      rank: null,
      classSize: 0,
      passMark: settings.passMark,
    };
  }
  const classmates = await prisma.placement.findMany({
    where: { academicYearId: semester.academicYearId, sectionId: placement.sectionId },
    include: { student: { include: { user: true } }, stream: true },
  });
  const gradeSubjects = await prisma.subject.findMany({
    where: { gradeId: placement.gradeId },
    include: { components: { orderBy: { sortOrder: "asc" } } },
  });
  const marks = await prisma.mark.findMany({
    where: { semesterId, studentId: { in: classmates.map((row) => row.studentId) } },
  });
  const byStudent = new Map<string, Map<string, number>>();
  for (const mark of marks) {
    const bucket = byStudent.get(mark.studentId) ?? new Map<string, number>();
    bucket.set(mark.componentId, mark.score);
    byStudent.set(mark.studentId, bucket);
  }
  const summaries = classmates.map((row) => {
    const applicable = subjectsFor(gradeSubjects, row.gradeId, row.streamId);
    const subjects = applicable.map((subject) => {
      const scores = byStudent.get(row.studentId) ?? new Map<string, number>();
      return calcSubject(
        subject.components.map((component) => ({
          componentId: component.id,
          maxScore: component.maxScore,
          score: scores.get(component.id) ?? null,
        })),
        settings.passMark,
      );
    });
    return { id: row.studentId, ...calcOverall(subjects) };
  });
  const ranks = rankMap(summaries.map((row) => ({ id: row.id, average: row.average })));
  const mineScores = byStudent.get(studentId) ?? new Map<string, number>();
  const mineSubjects = subjectsFor(gradeSubjects, placement.gradeId, placement.streamId).map((subject) => {
    const components = subject.components.map((component) => ({
      id: component.id,
      name: localizedName(lang, component),
      max: component.maxScore,
      score: mineScores.get(component.id) ?? null,
    }));
    const calc = calcSubject(
      components.map((component) => ({ componentId: component.id, maxScore: component.max, score: component.score })),
      settings.passMark,
    );
    return {
      subjectId: subject.id,
      code: subject.code,
      name: localizedName(lang, subject),
      components,
      ...calc,
    };
  });
  const overall = calcOverall(mineSubjects);
  return {
    studentId,
    fullName: student.user.fullName,
    username: student.user.username,
    studentCode: student.studentCode,
    sex: student.sex,
    placement: {
      grade: gradeLabel(lang, placement.grade),
      section: placement.section.name,
      stream: placement.stream ? localizedName(lang, placement.stream) : null,
      year: yearName,
      isRepeater: placement.isRepeater,
    },
    semester: { id: semester.id, name: semesterName, yearName, isPublished: semester.isPublished, academicYearId: semester.academicYearId },
    subjects: mineSubjects,
    average: overall.average,
    overall: overall.overall,
    rank: ranks.get(studentId) ?? null,
    classSize: classmates.length,
    passMark: settings.passMark,
  };
}
