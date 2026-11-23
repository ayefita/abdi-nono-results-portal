import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { gradeLabel, localizedName } from "@/lib/labels";
import { one } from "@/lib/form";
import { Field, Notice } from "@/components/bits";
import { createStudent } from "@/server/student-actions";
import { previewId, yearToken } from "@/lib/ids";

export default async function NewStudent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, lang } = await getI18n();
  const search = await searchParams;
  const grades = await prisma.grade.findMany({ orderBy: { sortOrder: "asc" }, include: { sections: { orderBy: { name: "asc" } }, streams: true } });
  const year = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  const nextId = await previewId("student", yearToken(year?.nameEn));
  const grade = grades.find((item) => item.id === one(search.gradeId)) ?? grades.find((item) => item.name === "5") ?? grades[0];
  return (
    <>
      <h1>{t("students.new")}</h1>
      <Notice t={t} search={search} vars={{ username: one(search.username), studentId: one(search.studentId) }} />
      {one(search.created) === "1" ? (
        <div className="alert ok">
          <strong>{t("students.created")}</strong>
          <p>{t("students.createdBody", { username: one(search.username), studentId: one(search.studentId) })}</p>
        </div>
      ) : null}
      <form className="card" method="get">
        <Field label={t("common.grade")}>
          <select name="gradeId" defaultValue={grade?.id}>
            {grades.map((item) => <option key={item.id} value={item.id}>{gradeLabel(lang, item)}</option>)}
          </select>
        </Field>
        <button className="btn" type="submit">{t("common.show")}</button>
      </form>
      {grade ? (
        <form className="card grid-2" action={createStudent}>
          <input type="hidden" name="gradeId" value={grade.id} />
          <Field label={t("ids.nextStudent")}><input value={nextId} readOnly /></Field>
          <p className="lede">{t("ids.autoStudent")}</p>
          <Field label={t("students.firstName")}><input name="firstName" required /></Field>
          <Field label={t("students.fatherName")}><input name="fatherName" required /></Field>
          <Field label={t("students.grandfather")}><input name="grandfather" /></Field>
          <Field label={t("common.sex")}>
            <select name="sex" required>
              <option value="MALE">{t("common.male")}</option>
              <option value="FEMALE">{t("common.female")}</option>
            </select>
          </Field>
          <Field label={t("common.section")}>
            <select name="sectionId" required>
              {grade.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
            </select>
          </Field>
          {grade.streams.length > 0 ? (
            <Field label={t("common.stream")}>
              <select name="streamId" required>
                {grade.streams.map((stream) => <option key={stream.id} value={stream.id}>{localizedName(lang, stream)}</option>)}
              </select>
            </Field>
          ) : null}
          <Field label={`${t("students.username")} (${t("common.optional")})`}><input name="username" /></Field>
          <p className="lede">{t("students.passwordNote")}</p>
          <button className="btn primary" type="submit">{t("common.save")}</button>
        </form>
      ) : null}
    </>
  );
}
