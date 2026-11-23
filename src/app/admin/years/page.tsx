import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { localizedName } from "@/lib/labels";
import { Field, Notice } from "@/components/bits";
import { createSemester, createYear, makeCurrentYear, setPublished } from "@/server/school-actions";

export default async function YearsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, lang } = await getI18n();
  const years = await prisma.academicYear.findMany({ orderBy: { startDate: "desc" }, include: { semesters: { orderBy: { sortOrder: "asc" } } } });
  return (
    <>
      <h1>{t("years.title")}</h1>
      <p className="lede">{t("years.publishedNote")}</p>
      <Notice t={t} search={await searchParams} />
      {years.map((year) => (
        <section className="card" key={year.id}>
          <h2>{localizedName(lang, year)} {year.isCurrent ? <span className="badge">{t("common.current")}</span> : null}</h2>
          {!year.isCurrent ? (
            <form action={makeCurrentYear}>
              <input type="hidden" name="id" value={year.id} />
              <button className="btn" type="submit">{t("years.makeCurrent")}</button>
            </form>
          ) : null}
          <ul>
            {year.semesters.map((semester) => (
              <li key={semester.id}>
                {localizedName(lang, semester)} · {semester.isPublished ? t("common.published") : t("common.draft")}
                <form action={setPublished}>
                  <input type="hidden" name="id" value={semester.id} />
                  <input type="hidden" name="publish" value={semester.isPublished ? "no" : "yes"} />
                  <button className="btn small" type="submit">{semester.isPublished ? t("years.unpublish") : t("years.publish")}</button>
                </form>
              </li>
            ))}
          </ul>
          <form className="grid-2" action={createSemester}>
            <input type="hidden" name="academicYearId" value={year.id} />
            <Field label={t("years.semesterName")}><input name="nameEn" placeholder="Semester 1" required /></Field>
            <Field label={t("settings.nameOm")}><input name="nameOm" /></Field>
            <Field label={t("settings.nameAm")}><input name="nameAm" /></Field>
            <button className="btn" type="submit">{t("years.addSemester")}</button>
          </form>
        </section>
      ))}
      {years.length === 0 ? <p className="alert">{t("years.empty")}</p> : null}
      <h2>{t("years.add")}</h2>
      <form className="card grid-2" action={createYear}>
        <Field label={t("settings.nameEn")}><input name="nameEn" required /></Field>
        <Field label={t("settings.nameOm")}><input name="nameOm" /></Field>
        <Field label={t("settings.nameAm")}><input name="nameAm" /></Field>
        <Field label={t("years.start")}><input name="start" type="date" required /></Field>
        <Field label={t("years.end")}><input name="end" type="date" required /></Field>
        <label className="check"><input type="checkbox" name="isCurrent" value="yes" /> {t("years.current")}</label>
        <button className="btn primary" type="submit">{t("common.add")}</button>
      </form>
    </>
  );
}
