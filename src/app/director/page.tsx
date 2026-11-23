import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { gradeLabel, localizedName, schoolName } from "@/lib/labels";
import { buildReport } from "@/lib/reports";
import { one } from "@/lib/form";
import { Field, statusLabel } from "@/components/bits";
import { PrintButton } from "@/components/offline";
import { getSettings } from "@/lib/settings";
import { Hero } from "@/components/chrome";

export default async function DirectorPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, lang } = await getI18n();
  const settings = await getSettings();
  const search = await searchParams;
  const years = await prisma.academicYear.findMany({ orderBy: { startDate: "desc" }, include: { semesters: { orderBy: { sortOrder: "asc" } } } });
  const grades = await prisma.grade.findMany({ orderBy: { sortOrder: "asc" }, include: { sections: { orderBy: { name: "asc" } } } });
  const yearId = one(search.academicYearId) || years.find((year) => year.isCurrent)?.id || years[0]?.id || "";
  const year = years.find((item) => item.id === yearId) ?? years[0];
  const semesterId = one(search.semesterId) || year?.semesters[0]?.id || "";
  const gradeId = one(search.gradeId);
  const sectionId = one(search.sectionId);
  const subjectId = one(search.subjectId);
  const subjects = await prisma.subject.findMany({ where: gradeId ? { gradeId } : undefined, orderBy: { sortOrder: "asc" }, include: { grade: true } });
  const report = year ? await buildReport({ academicYearId: year.id, semesterId, gradeId, sectionId, subjectId }, lang) : null;
  const query = new URLSearchParams({ academicYearId: year?.id || "", semesterId, gradeId, sectionId, subjectId });
  const sections = grades.find((grade) => grade.id === gradeId)?.sections ?? grades.flatMap((grade) => grade.sections);
  return (
    <>
      <Hero eyebrow={schoolName(lang, settings)} title={t("director.title")} text={t("director.readonly")} />
      <p className="alert warn">{t("director.hint")}</p>
      <form className="card grid-2" method="get">
        <Field label={t("common.year")}>
          <select name="academicYearId" defaultValue={year?.id}>
            {years.map((item) => <option key={item.id} value={item.id}>{localizedName(lang, item)}</option>)}
          </select>
        </Field>
        <Field label={t("common.semester")}>
          <select name="semesterId" defaultValue={semesterId}>
            {year?.semesters.map((item) => <option key={item.id} value={item.id}>{localizedName(lang, item)}</option>)}
          </select>
        </Field>
        <Field label={t("common.grade")}>
          <select name="gradeId" defaultValue={gradeId}>
            <option value="">{t("common.all")}</option>
            {grades.map((grade) => <option key={grade.id} value={grade.id}>{gradeLabel(lang, grade)}</option>)}
          </select>
        </Field>
        <Field label={t("common.section")}>
          <select name="sectionId" defaultValue={sectionId}>
            <option value="">{t("common.all")}</option>
            {sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
          </select>
        </Field>
        <Field label={t("common.subject")}>
          <select name="subjectId" defaultValue={subjectId}>
            <option value="">{t("common.all")}</option>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{gradeLabel(lang, subject.grade)} · {localizedName(lang, subject)}</option>)}
          </select>
        </Field>
        <button className="btn primary" type="submit">{t("director.apply")}</button>
      </form>
      <p className="row no-print">
        <PrintButton label={t("common.print")} />
        <a className="btn" href={`/api/export/director?${query.toString()}&format=xlsx`}>{t("common.exportExcel")}</a>
        <a className="btn" href={`/api/export/director?${query.toString()}&format=pdf`}>{t("common.exportPdf")}</a>
      </p>
      {!report || report.summary.count === 0 ? <p className="alert">{t("director.noData")}</p> : (
        <>
          <section className="stats">
            <div className="stat"><b>{report.summary.count}</b><small>{t("director.count")}</small></div>
            <div className="stat"><b>{report.summary.passRate}%</b><small>{t("director.passRate")}</small></div>
            <div className="stat"><b>{report.summary.highest.toFixed(1)}</b><small>{t("director.highest")}</small></div>
            <div className="stat"><b>{report.summary.lowest.toFixed(1)}</b><small>{t("director.lowest")}</small></div>
          </section>
          <p>{t("common.average")}: {report.summary.average.toFixed(1)}% · {t("common.pass")} {report.summary.pass} · {t("common.fail")} {report.summary.fail} · {t("common.incomplete")} {report.summary.incomplete}</p>
          <h2>{t("director.bySex")}</h2>
          <SimpleTable
            headers={[t("common.sex"), t("director.count"), t("common.average"), t("director.passRate")]}
            rows={report.bySex.map((row) => [row.sex === "FEMALE" ? t("common.female") : t("common.male"), row.count, `${row.average.toFixed(1)}%`, `${row.passRate}%`])}
          />
          <h2>{t("director.byGrade")}</h2>
          <SimpleTable headers={[t("common.grade"), t("director.count"), t("common.average"), t("director.highest"), t("director.lowest"), t("director.passRate")]} rows={report.byGrade.map((row) => [row.name, row.count, row.average.toFixed(1), row.highest.toFixed(1), row.lowest.toFixed(1), `${row.passRate}%`])} />
          <h2>{t("director.bySection")}</h2>
          <SimpleTable headers={[t("common.section"), t("director.count"), t("common.average"), t("director.passRate")]} rows={report.bySection.map((row) => [row.name, row.count, row.average.toFixed(1), `${row.passRate}%`])} />
          <h2>{t("director.bySubject")}</h2>
          <SimpleTable headers={[t("common.subject"), t("common.average"), t("director.highest"), t("director.lowest"), t("common.pass"), t("common.fail"), t("common.incomplete")]} rows={report.bySubject.map((row) => [row.name, row.average.toFixed(1), row.highest.toFixed(1), row.lowest.toFixed(1), row.pass, row.fail, row.incomplete])} />
          <h2>{t("director.top")}</h2>
          <SimpleTable headers={[t("common.name"), t("common.grade"), t("common.section"), t("common.sex"), t("common.average"), t("common.status")]} rows={report.top.map((row) => [row.fullName, row.grade, row.section, row.sex === "FEMALE" ? t("common.female") : t("common.male"), `${row.average.toFixed(1)}%`, statusLabel(t, row.overall)])} />
          {report.comparison.length > 0 ? (
            <>
              <h2>{t("director.compare")}</h2>
              <SimpleTable headers={[t("common.grade"), report.otherSemesterName || t("director.thisAverage"), t("director.otherAverage")]} rows={report.comparison.map((row) => [row.name, row.current.toFixed(1), row.other.toFixed(1)])} />
            </>
          ) : null}
          {report.yearComparison.length > 0 ? (
            <>
              <h2>{t("director.yearCompare")}</h2>
              <SimpleTable headers={[t("common.grade"), t("director.thisAverage"), t("director.yearCompare")]} rows={report.yearComparison.map((row) => [row.name, row.current.toFixed(1), row.previous.toFixed(1)])} />
            </>
          ) : null}
          <h2>{t("director.completion")}</h2>
          <p className="lede">{t("director.completionHint")}</p>
          <SimpleTable headers={[t("assignments.teacher"), t("common.subject"), t("common.section"), t("director.filled"), "%"]} rows={report.completion.map((row) => [row.teacher, row.subject, row.section, `${row.filled}/${row.expected}`, `${row.percent}%`])} />
          <h2>{t("director.unassigned")}</h2>
          {report.unassigned.length === 0 ? <p>{t("common.none")}</p> : <SimpleTable headers={[t("common.subject"), t("common.section")]} rows={report.unassigned.map((row) => [row.subject, row.section])} />}
        </>
      )}
    </>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="table-wrap">
      <table className="responsive">
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => <td key={cellIndex} data-label={headers[cellIndex]}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
