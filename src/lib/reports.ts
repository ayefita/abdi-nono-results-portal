import { prisma } from "./prisma";
import { calcOverall, calcSubject, round2, type MarkStatus } from "./marks";
import { gradeLabel, localizedName } from "./labels";
import type { Lang } from "./i18n";
import { getSettings } from "./settings";

export type Snapshot = {
  studentId: string;
  fullName: string;
  sex: "MALE" | "FEMALE";
  gradeId: string;
  grade: string;
  sectionId: string;
  section: string;
  stream: string | null;
  average: number;
  overall: MarkStatus;
  subjects: { subjectId: string; name: string; percent: number; status: MarkStatus; total: number; max: number; filled: number }[];
};

export async function loadSnapshots(semesterId: string, lang: Lang) {
  const settings = await getSettings();
  const semester = await prisma.semester.findUnique({ where: { id: semesterId }, include: { academicYear: true } });
  if (!semester) return null;
  const placements = await prisma.placement.findMany({
    where: { academicYearId: semester.academicYearId },
    include: { student: { include: { user: true } }, grade: true, section: true, stream: true },
  });
  const subjects = await prisma.subject.findMany({ include: { components: true, grade: true, stream: true } });
  const marks = await prisma.mark.findMany({ where: { semesterId } });
  const byStudent = new Map<string, Map<string, number>>();
  for (const mark of marks) {
    const bucket = byStudent.get(mark.studentId) ?? new Map<string, number>();
    bucket.set(mark.componentId, mark.score);
    byStudent.set(mark.studentId, bucket);
  }
  const snapshots: Snapshot[] = placements.map((row) => {
    const applicable = subjects
      .filter((subject) => subject.gradeId === row.gradeId && (subject.streamId == null || subject.streamId === row.streamId))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const scores = byStudent.get(row.studentId) ?? new Map<string, number>();
    const subjectViews = applicable.map((subject) => {
      const calc = calcSubject(
        subject.components.map((component) => ({
          componentId: component.id,
          maxScore: component.maxScore,
          score: scores.get(component.id) ?? null,
        })),
        settings.passMark,
      );
      return { subjectId: subject.id, name: localizedName(lang, subject), ...calc };
    });
    const overall = calcOverall(subjectViews);
    return {
      studentId: row.studentId,
      fullName: row.student.user.fullName,
      sex: row.student.sex,
      gradeId: row.gradeId,
      grade: gradeLabel(lang, row.grade),
      sectionId: row.sectionId,
      section: row.section.name,
      stream: row.stream ? localizedName(lang, row.stream) : null,
      average: overall.average,
      overall: overall.overall,
      subjects: subjectViews,
    };
  });
  return { semester, snapshots, passMark: settings.passMark, subjects };
}

export type ReportFilters = {
  academicYearId?: string;
  semesterId?: string;
  gradeId?: string;
  sectionId?: string;
  subjectId?: string;
};

function applyFilters(rows: Snapshot[], filters: ReportFilters) {
  return rows.filter((row) => {
    if (filters.gradeId && row.gradeId !== filters.gradeId) return false;
    if (filters.sectionId && row.sectionId !== filters.sectionId) return false;
    return true;
  });
}

function rate(rows: { overall: MarkStatus }[]) {
  const complete = rows.filter((row) => row.overall !== "incomplete");
  const pass = complete.filter((row) => row.overall === "pass").length;
  return { count: rows.length, complete: complete.length, pass, fail: complete.length - pass, incomplete: rows.length - complete.length, passRate: complete.length ? round2((pass / complete.length) * 100) : 0 };
}

function band(rows: Snapshot[], key: (row: Snapshot) => string) {
  const groups = new Map<string, Snapshot[]>();
  for (const row of rows) {
    const name = key(row);
    groups.set(name, [...(groups.get(name) ?? []), row]);
  }
  return [...groups.entries()].map(([name, group]) => {
    const averages = group.map((row) => row.average);
    return { name, ...rate(group), average: averages.length ? round2(averages.reduce((a, b) => a + b, 0) / averages.length) : 0, highest: averages.length ? Math.max(...averages) : 0, lowest: averages.length ? Math.min(...averages) : 0 };
  });
}

export async function buildReport(filters: ReportFilters, lang: Lang) {
  const year = filters.academicYearId
    ? await prisma.academicYear.findUnique({ where: { id: filters.academicYearId }, include: { semesters: { orderBy: { sortOrder: "asc" } } } })
    : await prisma.academicYear.findFirst({ where: { isCurrent: true }, include: { semesters: { orderBy: { sortOrder: "asc" } } } });
  if (!year) return null;
  const semester = year.semesters.find((item) => item.id === filters.semesterId) ?? year.semesters[0];
  if (!semester) return null;
  const loaded = await loadSnapshots(semester.id, lang);
  if (!loaded) return null;
  const rows = applyFilters(loaded.snapshots, filters);
  const scoped = filters.subjectId
    ? rows
        .map((row) => {
          const subject = row.subjects.find((item) => item.subjectId === filters.subjectId);
          if (!subject) return null;
          return { ...row, average: subject.percent, overall: subject.status, subjects: [subject] };
        })
        .filter((row): row is Snapshot => Boolean(row))
    : rows;
  const averages = scoped.map((row) => row.average);
  const summary = {
    ...rate(scoped),
    average: averages.length ? round2(averages.reduce((a, b) => a + b, 0) / averages.length) : 0,
    highest: averages.length ? Math.max(...averages) : 0,
    lowest: averages.length ? Math.min(...averages) : 0,
  };
  const bySex = (["FEMALE", "MALE"] as const).map((sex) => {
    const group = scoped.filter((row) => row.sex === sex);
    const values = group.map((row) => row.average);
    return { sex, ...rate(group), average: values.length ? round2(values.reduce((a, b) => a + b, 0) / values.length) : 0 };
  });
  const subjectBands = new Map<string, { name: string; percents: number[]; pass: number; fail: number; incomplete: number }>();
  for (const row of scoped) {
    for (const subject of row.subjects) {
      const bucket = subjectBands.get(subject.subjectId) ?? { name: subject.name, percents: [], pass: 0, fail: 0, incomplete: 0 };
      bucket.percents.push(subject.percent);
      bucket[subject.status] += 1;
      subjectBands.set(subject.subjectId, bucket);
    }
  }
  const bySubject = [...subjectBands.values()].map((bucket) => ({
    name: bucket.name,
    count: bucket.percents.length,
    average: bucket.percents.length ? round2(bucket.percents.reduce((a, b) => a + b, 0) / bucket.percents.length) : 0,
    highest: bucket.percents.length ? Math.max(...bucket.percents) : 0,
    lowest: bucket.percents.length ? Math.min(...bucket.percents) : 0,
    pass: bucket.pass,
    fail: bucket.fail,
    incomplete: bucket.incomplete,
    passRate: bucket.pass + bucket.fail ? round2((bucket.pass / (bucket.pass + bucket.fail)) * 100) : 0,
  }));
  const top = [...scoped].sort((a, b) => b.average - a.average).slice(0, 8);
  const other = year.semesters.find((item) => item.id !== semester.id);
  let comparison: { name: string; current: number; other: number }[] = [];
  if (other) {
    const otherLoad = await loadSnapshots(other.id, lang);
    if (otherLoad) {
      const otherRows = applyFilters(otherLoad.snapshots, filters);
      const currentBands = band(scoped, (row) => row.grade);
      const otherBands = band(otherRows, (row) => row.grade);
      comparison = currentBands.map((item) => ({
        name: item.name,
        current: item.average,
        other: otherBands.find((candidate) => candidate.name === item.name)?.average ?? 0,
      }));
    }
  }
  const previousYear = await prisma.academicYear.findFirst({
    where: { startDate: { lt: year.startDate } },
    orderBy: { startDate: "desc" },
    include: { semesters: true },
  });
  const previousSemester = previousYear?.semesters.find((item) => item.nameEn === semester.nameEn);
  let yearComparison: { name: string; current: number; previous: number }[] = [];
  if (previousSemester) {
    const previousLoad = await loadSnapshots(previousSemester.id, lang);
    if (previousLoad) {
      const previousRows = applyFilters(previousLoad.snapshots, { ...filters, gradeId: undefined, sectionId: undefined });
      const currentBands = band(scoped, (row) => row.grade);
      const previousBands = band(previousRows, (row) => row.grade);
      yearComparison = currentBands.map((item) => ({
        name: item.name,
        current: item.average,
        previous: previousBands.find((candidate) => candidate.name === item.name)?.average ?? 0,
      }));
    }
  }
  const assignments = await prisma.teacherAssignment.findMany({
    where: {
      academicYearId: year.id,
      ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
    },
    include: { teacher: { include: { user: true } }, subject: true, section: { include: { grade: true } } },
  });
  const completion = assignments
    .filter((assignment) => !filters.gradeId || assignment.section.gradeId === filters.gradeId)
    .map((assignment) => {
      const classRows = loaded.snapshots.filter((row) => row.sectionId === assignment.sectionId && row.subjects.some((subject) => subject.subjectId === assignment.subjectId));
      const subject = loaded.subjects.find((item) => item.id === assignment.subjectId);
      const componentCount = subject?.components.length ?? 0;
      const expected = classRows.length * componentCount;
      const filledScores = classRows.reduce((sum, row) => sum + (row.subjects.find((item) => item.subjectId === assignment.subjectId)?.filled ?? 0), 0);
      return {
        teacher: assignment.teacher.user.fullName,
        subject: localizedName(lang, assignment.subject),
        section: `${gradeLabel(lang, assignment.section.grade)} ${assignment.section.name}`,
        students: classRows.length,
        expected,
        filled: filledScores,
        percent: expected ? round2((filledScores / expected) * 100) : 0,
        complete: expected > 0 && filledScores >= expected,
      };
    })
    .sort((a, b) => a.percent - b.percent);

  const covered = new Set(assignments.map((assignment) => `${assignment.sectionId}:${assignment.subjectId}`));
  const unassigned: { subject: string; section: string }[] = [];
  const sectionIds = new Set(loaded.snapshots.map((row) => row.sectionId));
  for (const subject of loaded.subjects) {
    if (filters.subjectId && subject.id !== filters.subjectId) continue;
    if (filters.gradeId && subject.gradeId !== filters.gradeId) continue;
    const sections = await prisma.section.findMany({ where: { gradeId: subject.gradeId, ...(filters.sectionId ? { id: filters.sectionId } : {}) }, include: { grade: true } });
    for (const section of sections) {
      if (!sectionIds.has(section.id)) continue;
      if (subject.streamId) {
        const any = loaded.snapshots.some((row) => row.sectionId === section.id && row.subjects.some((item) => item.subjectId === subject.id));
        if (!any) continue;
      }
      if (!covered.has(`${section.id}:${subject.id}`)) {
        unassigned.push({ subject: localizedName(lang, subject), section: `${gradeLabel(lang, section.grade)} ${section.name}` });
      }
    }
  }

  return {
    year,
    semester,
    passMark: loaded.passMark,
    summary,
    bySex,
    byGrade: band(scoped, (row) => row.grade),
    bySection: band(scoped, (row) => `${row.grade} ${row.section}`),
    bySubject,
    top,
    comparison,
    yearComparison,
    completion,
    unassigned,
    otherSemesterName: other ? localizedName(lang, other) : null,
  };
}
