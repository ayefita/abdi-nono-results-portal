import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { gradeLabel, localizedName } from "@/lib/labels";
import { one } from "@/lib/form";
import { Field, Notice } from "@/components/bits";
import { createSubject, deleteSubject, updateSubject } from "@/server/school-actions";

export default async function SubjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, lang } = await getI18n();
  const search = await searchParams;
  const grades = await prisma.grade.findMany({ orderBy: { sortOrder: "asc" }, include: { streams: true } });
  const grade = grades.find((item) => item.id === one(search.gradeId)) ?? grades.find((item) => item.name === "5") ?? grades[0];
  const subjects = grade ? await prisma.subject.findMany({ where: { gradeId: grade.id }, orderBy: { sortOrder: "asc" }, include: { stream: true } }) : [];
  return (
    <>
      <h1>{t("subjects.title")}</h1>
      <p className="lede">{t("subjects.hint")}</p>
      <Notice t={t} search={search} />
      <form className="card" method="get">
        <Field label={t("subjects.filter")}>
          <select name="gradeId" defaultValue={grade?.id}>{grades.map((item) => <option key={item.id} value={item.id}>{gradeLabel(lang, item)}</option>)}</select>
        </Field>
        <button className="btn" type="submit">{t("common.show")}</button>
      </form>
      {subjects.map((subject) => (
        <article className="card" key={subject.id}>
        <form className="grid-2" action={updateSubject}>
          <input type="hidden" name="id" value={subject.id} />
          <Field label={t("common.code")}><input name="code" defaultValue={subject.code} required /></Field>
          <Field label={t("common.stream")}>
            <select name="streamId" defaultValue={subject.streamId ?? ""}>
              <option value="">{t("subjects.allStreams")}</option>
              {grade?.streams.map((stream) => <option key={stream.id} value={stream.id}>{localizedName(lang, stream)}</option>)}
            </select>
          </Field>
          <Field label={t("settings.nameEn")}><input name="nameEn" defaultValue={subject.nameEn} required /></Field>
          <Field label={t("settings.nameOm")}><input name="nameOm" defaultValue={subject.nameOm} /></Field>
          <Field label={t("settings.nameAm")}><input name="nameAm" defaultValue={subject.nameAm} /></Field>
          <Field label={t("grades.sort")}><input name="sortOrder" type="number" defaultValue={subject.sortOrder} /></Field>
          <button className="btn" type="submit">{t("common.save")}</button>
        </form>
          <form action={deleteSubject}>
            <input type="hidden" name="id" value={subject.id} />
            <label className="check"><input type="checkbox" name="confirm" value="yes" /> {t("subjects.confirmDelete")}</label>
            <p className="lede">{t("subjects.deleteWarn")}</p>
            <button className="btn danger" type="submit">{t("common.delete")}</button>
          </form>
        </article>
      ))}
      {subjects.length === 0 ? <p className="alert">{t("subjects.empty")}</p> : null}
      {grade ? (
        <form className="card grid-2" action={createSubject}>
          <h2>{t("subjects.add")}</h2>
          <input type="hidden" name="gradeId" value={grade.id} />
          <Field label={t("common.code")}><input name="code" required placeholder="ENG" /></Field>
          <Field label={t("common.stream")}>
            <select name="streamId"><option value="">{t("subjects.allStreams")}</option>{grade.streams.map((stream) => <option key={stream.id} value={stream.id}>{localizedName(lang, stream)}</option>)}</select>
          </Field>
          <Field label={t("settings.nameEn")}><input name="nameEn" required /></Field>
          <Field label={t("settings.nameOm")}><input name="nameOm" /></Field>
          <Field label={t("settings.nameAm")}><input name="nameAm" /></Field>
          <Field label={t("grades.sort")}><input name="sortOrder" type="number" defaultValue={subjects.length + 1} /></Field>
          <button className="btn primary" type="submit">{t("common.add")}</button>
        </form>
      ) : null}
    </>
  );
}
