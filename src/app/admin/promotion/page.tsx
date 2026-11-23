import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { gradeLabel, localizedName } from "@/lib/labels";
import { one } from "@/lib/form";
import { Field, Notice } from "@/components/bits";
import { promoteStudents } from "@/server/school-actions";

export default async function PromotionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, lang } = await getI18n();
  const search = await searchParams;
  const years = await prisma.academicYear.findMany({ orderBy: { startDate: "desc" } });
  const from = years.find((year) => year.id === one(search.fromYear)) ?? years.find((year) => year.isCurrent) ?? years[0];
  const placements = from
    ? await prisma.placement.findMany({ where: { academicYearId: from.id }, include: { student: { include: { user: true } }, grade: true, section: true }, orderBy: [{ grade: { sortOrder: "asc" } }, { student: { fatherName: "asc" } }] })
    : [];
  return (
    <>
      <h1>{t("promotion.title")}</h1>
      <p className="lede">{t("promotion.hint")}</p>
      <Notice t={t} search={search} vars={{ count: one(search.count), names: one(search.names) }} />
      <form method="get" className="card">
        <Field label={t("promotion.from")}>
          <select name="fromYear" defaultValue={from?.id}>{years.map((year) => <option key={year.id} value={year.id}>{localizedName(lang, year)}</option>)}</select>
        </Field>
        <button className="btn" type="submit">{t("common.show")}</button>
      </form>
      <form action={promoteStudents}>
        <input type="hidden" name="fromYear" value={from?.id || ""} />
        <div className="card grid-2">
          <Field label={t("promotion.to")}>
            <select name="toYear">
              <option value="">{t("promotion.createYear")}</option>
              {years.filter((year) => year.id !== from?.id).map((year) => <option key={year.id} value={year.id}>{localizedName(lang, year)}</option>)}
            </select>
          </Field>
          <label className="check"><input type="checkbox" name="createYear" value="yes" /> {t("promotion.createYear")}</label>
          <Field label={t("promotion.yearName")}><input name="yearName" /></Field>
          <Field label={t("settings.nameOm")}><input name="yearNameOm" /></Field>
          <Field label={t("settings.nameAm")}><input name="yearNameAm" /></Field>
          <Field label={t("years.start")}><input name="start" type="date" /></Field>
          <Field label={t("years.end")}><input name="end" type="date" /></Field>
        </div>
        <div className="table-wrap">
          <table className="responsive">
            <thead><tr><th>{t("common.name")}</th><th>{t("common.grade")}</th><th>{t("promotion.action")}</th></tr></thead>
            <tbody>
              {placements.map((placement) => (
                <tr key={placement.id}>
                  <td data-label={t("common.name")}>{placement.student.user.fullName}</td>
                  <td data-label={t("common.grade")}>{gradeLabel(lang, placement.grade)} {placement.section.name}</td>
                  <td data-label={t("promotion.action")}>
                    <select name={`action_${placement.studentId}`} defaultValue={placement.grade.nextGradeId ? "promote" : "repeat"}>
                      <option value="promote">{t("promotion.promote")}</option>
                      <option value="repeat">{t("promotion.repeat")}</option>
                      <option value="graduate">{t("promotion.graduate")}</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {placements.length === 0 ? <p className="alert">{t("promotion.noStudents")}</p> : <button className="btn primary" type="submit">{t("promotion.run")}</button>}
      </form>
    </>
  );
}
