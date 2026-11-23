import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { gradeLabel, localizedName } from "@/lib/labels";
import { one } from "@/lib/form";
import { Field, Notice } from "@/components/bits";
import { createAssignment, deleteAssignment } from "@/server/school-actions";

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, lang } = await getI18n();
  const search = await searchParams;
  const years = await prisma.academicYear.findMany({ orderBy: { startDate: "desc" } });
  const year = years.find((item) => item.id === one(search.academicYearId)) ?? years.find((item) => item.isCurrent) ?? years[0];
  const sections = await prisma.section.findMany({ include: { grade: true }, orderBy: [{ grade: { sortOrder: "asc" } }, { name: "asc" }] });
  const section = sections.find((item) => item.id === one(search.sectionId)) ?? sections[0];
  const subjects = section ? await prisma.subject.findMany({ where: { gradeId: section.gradeId }, orderBy: { sortOrder: "asc" } }) : [];
  const teachers = await prisma.teacher.findMany({ include: { user: true }, orderBy: { user: { fullName: "asc" } } });
  const rows = year ? await prisma.teacherAssignment.findMany({ where: { academicYearId: year.id }, include: { teacher: { include: { user: true } }, subject: true, section: { include: { grade: true } } } }) : [];
  const back = `/admin/assignments?academicYearId=${year?.id ?? ""}&sectionId=${section?.id ?? ""}`;
  return (
    <>
      <h1>{t("assignments.title")}</h1>
      <p className="lede">{t("assignments.hint")}</p>
      <Notice t={t} search={search} />
      <form className="card grid-2" method="get">
        <Field label={t("common.year")}>
          <select name="academicYearId" defaultValue={year?.id}>{years.map((item) => <option key={item.id} value={item.id}>{localizedName(lang, item)}</option>)}</select>
        </Field>
        <Field label={t("common.section")}>
          <select name="sectionId" defaultValue={section?.id}>{sections.map((item) => <option key={item.id} value={item.id}>{gradeLabel(lang, item.grade)} {item.name}</option>)}</select>
        </Field>
        <button className="btn" type="submit">{t("common.show")}</button>
      </form>
      {year && section ? (
        <form className="card" action={createAssignment}>
          <input type="hidden" name="academicYearId" value={year.id} />
          <input type="hidden" name="sectionId" value={section.id} />
          <Field label={t("assignments.teacher")}>
            <select name="teacherId">{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.user.fullName}</option>)}</select>
          </Field>
          <fieldset>
            <legend>{t("common.subject")}</legend>
            {subjects.map((subject) => (
              <label className="check" key={subject.id}><input type="checkbox" name="subjectId" value={subject.id} /> {localizedName(lang, subject)}</label>
            ))}
          </fieldset>
          <button className="btn primary" type="submit">{t("assignments.add")}</button>
        </form>
      ) : null}
      <div className="table-wrap">
        <table className="responsive">
          <thead><tr><th>{t("assignments.teacher")}</th><th>{t("common.subject")}</th><th>{t("common.section")}</th><th></th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td data-label={t("assignments.teacher")}>{row.teacher.user.fullName}</td>
                <td data-label={t("common.subject")}>{localizedName(lang, row.subject)}</td>
                <td data-label={t("common.section")}>{gradeLabel(lang, row.section.grade)} {row.section.name}</td>
                <td>
                  <form action={deleteAssignment}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="back" value={back} />
                    <button className="btn danger small" type="submit">{t("common.remove")}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="alert">{t("assignments.empty")}</p> : null}
    </>
  );
}
