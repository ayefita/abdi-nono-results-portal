import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { gradeLabel, localizedName } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { one } from "@/lib/form";
import { parseScale } from "@/lib/marks";
import { formatWhen } from "@/lib/format";
import { addGradebookColumn, saveMarks } from "@/server/mark-actions";
import { Field, Notice } from "./bits";
import { GradebookGrid } from "./gradebook";

export async function MarkEntry({
  basePath,
  teacherId,
  searchParams,
}: {
  basePath: string;
  teacherId: string | null;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { t, lang } = await getI18n();
  const settings = await getSettings();
  const scale = parseScale(settings.gradeScale);
  const requestedTeacher = one(searchParams.teacherId);
  const years = await prisma.academicYear.findMany({ orderBy: { startDate: "desc" }, include: { semesters: { orderBy: { sortOrder: "asc" } } } });
  const semesterPick = years.flatMap((year) => year.semesters.map((item) => ({ item, year }))).find((row) => row.item.id === one(searchParams.semesterId));
  const selectedYear = semesterPick?.year ?? years.find((year) => year.id === one(searchParams.academicYearId)) ?? years.find((year) => year.isCurrent) ?? years[0];
  const teachers = teacherId
    ? await prisma.teacher.findMany({ where: { id: teacherId }, include: { user: true } })
    : await prisma.teacher.findMany({ include: { user: true }, orderBy: { user: { fullName: "asc" } } });
  const activeTeacherId = teacherId || requestedTeacher || teachers[0]?.id || "";
  const semester = selectedYear?.semesters.find((item) => item.id === one(searchParams.semesterId)) ?? selectedYear?.semesters[0];
  const assignments = activeTeacherId
    ? await prisma.teacherAssignment.findMany({
        where: { teacherId: activeTeacherId, academicYearId: selectedYear?.id },
        include: { section: { include: { grade: true } }, subject: true },
      })
    : [];
  const options = teacherId || requestedTeacher
    ? assignments
    : await prisma.subject.findMany({ include: { grade: true }, orderBy: [{ grade: { sortOrder: "asc" } }, { sortOrder: "asc" }] }).then(async (subjects) => {
        const sections = await prisma.section.findMany({ include: { grade: true } });
        return subjects.flatMap((subject) =>
          sections
            .filter((section) => section.gradeId === subject.gradeId)
            .map((section) => ({ subject, section, subjectId: subject.id, sectionId: section.id })),
        );
      });
  const pair = one(searchParams.pair);
  const pairSubject = pair.split("|")[0] || one(searchParams.subjectId);
  const pairSection = pair.split("|")[1] || one(searchParams.sectionId);
  const chosen = options.find((item) => item.subjectId === pairSubject && item.sectionId === pairSection) ?? options[0];
  const query = new URLSearchParams();
  if (selectedYear) query.set("academicYearId", selectedYear.id);
  if (semester) query.set("semesterId", semester.id);
  if (activeTeacherId) query.set("teacherId", activeTeacherId);
  if (chosen) {
    query.set("subjectId", chosen.subjectId);
    query.set("sectionId", chosen.sectionId);
  }
  const back = `${basePath}?${query.toString()}`;
  let students: { id: string; name: string; code: string; scores: Record<string, number | null> }[] = [];
  let columns: { id: string; name: string; kind: string; max: number; date: string; isFormula: boolean; formula: string }[] = [];
  if (semester && chosen) {
    const rows = await prisma.assessmentComponent.findMany({ where: { subjectId: chosen.subjectId }, orderBy: { sortOrder: "asc" } });
    columns = rows.map((row) => ({
      id: row.id,
      name: localizedName(lang, row),
      kind: row.kind,
      max: row.maxScore,
      date: row.assessedOn ? formatWhen(row.assessedOn, lang, false) : "",
      isFormula: row.isFormula,
      formula: row.formula || "total",
    }));
    const placements = await prisma.placement.findMany({
      where: {
        sectionId: chosen.sectionId,
        academicYearId: selectedYear!.id,
        ...(chosen.subject.streamId ? { streamId: chosen.subject.streamId } : {}),
      },
      include: { student: { include: { user: true } } },
      orderBy: { student: { fatherName: "asc" } },
    });
    const marks = await prisma.mark.findMany({
      where: { semesterId: semester.id, subjectId: chosen.subjectId, studentId: { in: placements.map((row) => row.studentId) } },
    });
    students = placements.map((row) => ({
      id: row.studentId,
      name: row.student.user.fullName,
      code: row.student.studentCode,
      scores: Object.fromEntries(marks.filter((mark) => mark.studentId === row.studentId).map((mark) => [mark.componentId, mark.score])),
    }));
  }

  return (
    <div className="gradebook-page">
      <h1>{t("gradebook.title")}</h1>
      <Notice t={t} search={searchParams} />
      <form className="gb-filters" method="get">
        <Field label={t("assignments.teacher")}>
          <select name={teacherId ? undefined : "teacherId"} defaultValue={activeTeacherId} disabled={Boolean(teacherId)}>
            {teachers.map((item) => <option key={item.id} value={item.id}>{item.user.fullName}{item.user.staffCode ? ` · ${item.user.staffCode}` : ""}</option>)}
          </select>
          {teacherId ? <input type="hidden" name="teacherId" value={teacherId} /> : null}
        </Field>
        <Field label={`${t("common.year")} / ${t("common.semester")}`}>
          <select name="semesterId" defaultValue={semester?.id}>
            {years.flatMap((year) => year.semesters.map((item) => (
              <option key={item.id} value={item.id}>{localizedName(lang, year)} · {localizedName(lang, item)}</option>
            )))}
          </select>
          {selectedYear ? <input type="hidden" name="academicYearId" value={selectedYear.id} /> : null}
        </Field>
        <Field label={t("common.subject")}>
          <select name="pair" defaultValue={chosen ? `${chosen.subjectId}|${chosen.sectionId}` : ""}>
            {options.map((item) => (
              <option key={`${item.subjectId}-${item.sectionId}`} value={`${item.subjectId}|${item.sectionId}`}>
                ({t("common.grade")} {gradeLabel(lang, item.section.grade)}) {localizedName(lang, item.subject)} {item.section.name}
              </option>
            ))}
          </select>
        </Field>
        <button className="btn primary" type="submit">{t("common.show")}</button>
      </form>
      {semester && chosen ? (
        <>
          <div className="gb-actions no-print">
            <details id="add-column">
              <summary className="btn gb-add">{t("gradebook.addColumn")}</summary>
              <form className="card grid-2" action={addGradebookColumn}>
                <input type="hidden" name="back" value={back} />
                <input type="hidden" name="subjectId" value={chosen.subjectId} />
                <input type="hidden" name="sectionId" value={chosen.sectionId} />
                <input type="hidden" name="semesterId" value={semester.id} />
                <Field label={t("gradebook.columnName")}><input name="name" required /></Field>
                <Field label={t("gradebook.columnType")}>
                  <select name="kind" defaultValue="classwork">
                    <option value="classwork">Classwork</option>
                    <option value="assignment">Assignment</option>
                    <option value="quiz">Quiz</option>
                    <option value="test">Test</option>
                    <option value="mid">Mid</option>
                    <option value="final">Final</option>
                  </select>
                </Field>
                <Field label={t("components.max")}><input name="max" type="number" min="1" step="1" defaultValue={10} required /></Field>
                <Field label={t("gradebook.date")}><input name="date" type="date" /></Field>
                <button className="btn primary" type="submit">{t("common.add")}</button>
              </form>
            </details>
            <details>
              <summary className="btn gb-formula">{t("gradebook.addFormula")}</summary>
              <form className="card" action={addGradebookColumn}>
                <input type="hidden" name="back" value={back} />
                <input type="hidden" name="subjectId" value={chosen.subjectId} />
                <input type="hidden" name="sectionId" value={chosen.sectionId} />
                <input type="hidden" name="semesterId" value={semester.id} />
                <input type="hidden" name="formula" value="yes" />
                <Field label={t("gradebook.columnName")}><input name="name" defaultValue="Final grade" required /></Field>
                <Field label={t("gradebook.formula")}>
                  <select name="formulaKind">
                    <option value="total">Total</option>
                    <option value="percent">Percent</option>
                    <option value="letter">Letter</option>
                  </select>
                </Field>
                <button className="btn primary" type="submit">{t("common.add")}</button>
              </form>
            </details>
          </div>
          <GradebookGrid
            students={students}
            columns={columns}
            scale={scale}
            saveAction={saveMarks}
            hidden={{ back, semesterId: semester.id, sectionId: chosen.sectionId, subjectId: chosen.subjectId }}
            labels={{
              students: t("common.name"),
              average: t("gradebook.average"),
              save: t("gradebook.save"),
              unsaved: t("gradebook.unsaved"),
              invalid: t("errors.scoreRange"),
            }}
          />
          <details id="gb-settings" className="card no-print">
            <summary>{t("nav.settings")}</summary>
            <p>{t("gradebook.settings")}</p>
            <p>{scale.map((band) => `${band.min}+ ${band.mark} ${band.letter}`).join(" · ")}</p>
          </details>
        </>
      ) : <p className="alert">{t("marks.noSelection")}</p>}
    </div>
  );
}

