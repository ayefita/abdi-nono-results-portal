import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { gradeLabel, localizedName } from "@/lib/labels";
import { Field, Notice } from "@/components/bits";
import { createGrade, createSection, createStream, deleteGrade, deleteSection, deleteStream, updateGrade } from "@/server/school-actions";

export default async function GradesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, lang } = await getI18n();
  const grades = await prisma.grade.findMany({ orderBy: { sortOrder: "asc" }, include: { sections: { orderBy: { name: "asc" } }, streams: true, nextGrade: true } });
  return (
    <>
      <h1>{t("grades.title")}</h1>
      <p className="lede">{t("grades.hint")}</p>
      <Notice t={t} search={await searchParams} />
      {grades.map((grade) => (
        <section className="card" key={grade.id}>
          <form className="grid-2" action={updateGrade}>
            <input type="hidden" name="id" value={grade.id} />
            <Field label={t("grades.name")}><input name="name" defaultValue={grade.name} required /></Field>
            <Field label={t("grades.sort")}><input name="sortOrder" type="number" defaultValue={grade.sortOrder} /></Field>
            <Field label={t("grades.nameOm")}><input name="nameOm" defaultValue={grade.nameOm} /></Field>
            <Field label={t("grades.nameAm")}><input name="nameAm" defaultValue={grade.nameAm} /></Field>
            <Field label={t("grades.next")}>
              <select name="nextGradeId" defaultValue={grade.nextGradeId ?? ""}>
                <option value="">{t("common.none")}</option>
                {grades.filter((item) => item.id !== grade.id).map((item) => <option key={item.id} value={item.id}>{gradeLabel(lang, item)}</option>)}
              </select>
            </Field>
            <button className="btn" type="submit">{t("common.save")}</button>
          </form>
          <p><strong>{t("grades.sections")}:</strong> {grade.sections.map((section) => section.name).join(", ") || t("common.none")}</p>
          <form className="row" action={createSection}>
            <input type="hidden" name="gradeId" value={grade.id} />
            <input name="name" placeholder="A" aria-label={t("grades.addSection")} />
            <button className="btn" type="submit">{t("grades.addSection")}</button>
          </form>
          {grade.sections.map((section) => (
            <form key={section.id} action={deleteSection} className="row">
              <input type="hidden" name="id" value={section.id} />
              <span>{section.name}</span>
              <button className="btn danger small" type="submit">{t("common.remove")}</button>
            </form>
          ))}
          <p><strong>{t("grades.streams")}:</strong> {grade.streams.map((stream) => localizedName(lang, stream)).join(", ") || t("common.none")}</p>
          <form className="grid-2" action={createStream}>
            <input type="hidden" name="gradeId" value={grade.id} />
            <Field label={t("grades.streamEn")}><input name="nameEn" /></Field>
            <Field label={t("grades.streamOm")}><input name="nameOm" /></Field>
            <Field label={t("grades.streamAm")}><input name="nameAm" /></Field>
            <button className="btn" type="submit">{t("grades.addStream")}</button>
          </form>
          {grade.streams.map((stream) => (
            <form key={stream.id} action={deleteStream}>
              <input type="hidden" name="id" value={stream.id} />
              <button className="btn danger small" type="submit">{t("common.remove")} {localizedName(lang, stream)}</button>
            </form>
          ))}
          <form action={deleteGrade}>
            <input type="hidden" name="id" value={grade.id} />
            <button className="btn danger" type="submit">{t("common.delete")} {gradeLabel(lang, grade)}</button>
          </form>
        </section>
      ))}
      <h2>{t("grades.add")}</h2>
      <form className="card grid-2" action={createGrade}>
        <Field label={t("grades.name")}><input name="name" required placeholder="KG" /></Field>
        <Field label={t("grades.sort")}><input name="sortOrder" type="number" defaultValue={grades.length} /></Field>
        <Field label={t("grades.nameOm")}><input name="nameOm" /></Field>
        <Field label={t("grades.nameAm")}><input name="nameAm" /></Field>
        <Field label={t("grades.next")}>
          <select name="nextGradeId"><option value="">{t("common.none")}</option>{grades.map((grade) => <option key={grade.id} value={grade.id}>{gradeLabel(lang, grade)}</option>)}</select>
        </Field>
        <button className="btn primary" type="submit">{t("common.add")}</button>
      </form>
    </>
  );
}
