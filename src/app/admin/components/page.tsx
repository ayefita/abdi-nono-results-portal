import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { gradeLabel, localizedName } from "@/lib/labels";
import { one } from "@/lib/form";
import { Field, Notice } from "@/components/bits";
import { saveComponents } from "@/server/school-actions";

export default async function ComponentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, lang } = await getI18n();
  const search = await searchParams;
  const subjects = await prisma.subject.findMany({ orderBy: [{ grade: { sortOrder: "asc" } }, { sortOrder: "asc" }], include: { grade: true, stream: true, components: { orderBy: { sortOrder: "asc" } } } });
  const subject = subjects.find((item) => item.id === one(search.subjectId)) ?? subjects[0];
  const sum = subject?.components.reduce((total, component) => total + component.maxScore, 0) ?? 0;
  return (
    <>
      <h1>{t("components.title")}</h1>
      <p className="lede">{t("components.hint")}</p>
      <Notice t={t} search={search} />
      <form className="card" method="get">
        <Field label={t("components.pick")}>
          <select name="subjectId" defaultValue={subject?.id}>
            {subjects.map((item) => <option key={item.id} value={item.id}>{gradeLabel(lang, item.grade)} · {localizedName(lang, item)}{item.stream ? ` (${localizedName(lang, item.stream)})` : ""}</option>)}
          </select>
        </Field>
        <button className="btn" type="submit">{t("common.show")}</button>
      </form>
      {subject ? (
        <>
          <p>{t("components.sum")}: <strong>{sum}</strong></p>
          {sum !== 100 ? <p className="alert warn">{t("components.sumWarn")}</p> : null}
          <form action={saveComponents}>
            <input type="hidden" name="subjectId" value={subject.id} />
            {subject.components.map((component) => (
              <fieldset className="card grid-2" key={component.id}>
                <Field label={t("settings.nameEn")}><input name={`en_${component.id}`} defaultValue={component.nameEn} /></Field>
                <Field label={t("settings.nameOm")}><input name={`om_${component.id}`} defaultValue={component.nameOm} /></Field>
                <Field label={t("settings.nameAm")}><input name={`am_${component.id}`} defaultValue={component.nameAm} /></Field>
                <Field label={t("components.max")}><input name={`max_${component.id}`} type="number" step="0.5" min="0.5" defaultValue={component.maxScore} /></Field>
                <Field label={t("grades.sort")}><input name={`order_${component.id}`} type="number" defaultValue={component.sortOrder} /></Field>
                <button className="btn danger" name="deleteId" value={component.id} type="submit">{t("common.delete")}</button>
              </fieldset>
            ))}
            <label className="check"><input type="checkbox" name="confirm" value="yes" /> {t("subjects.confirmDelete")}</label>
            <button className="btn primary" type="submit">{t("common.save")}</button>
          </form>
          <form className="card grid-2" action={saveComponents}>
            <input type="hidden" name="subjectId" value={subject.id} />
            <input type="hidden" name="intent" value="add" />
            <h2>{t("components.add")}</h2>
            <Field label={t("settings.nameEn")}><input name="newEn" required /></Field>
            <Field label={t("settings.nameOm")}><input name="newOm" /></Field>
            <Field label={t("settings.nameAm")}><input name="newAm" /></Field>
            <Field label={t("components.max")}><input name="newMax" type="number" step="0.5" min="0.5" required /></Field>
            <button className="btn" type="submit">{t("common.add")}</button>
          </form>
        </>
      ) : <p className="alert">{t("components.empty")}</p>}
    </>
  );
}
