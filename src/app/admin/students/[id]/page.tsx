import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { gradeLabel, localizedName } from "@/lib/labels";
import { one } from "@/lib/form";
import { Field, Notice } from "@/components/bits";
import { deleteStudents, updateStudent } from "@/server/student-actions";

export default async function EditStudent({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const { t, lang } = await getI18n();
  const search = await searchParams;
  const student = await prisma.student.findUnique({ where: { id }, include: { user: true, placements: { where: { academicYear: { isCurrent: true } } } } });
  if (!student) notFound();
  const grades = await prisma.grade.findMany({ orderBy: { sortOrder: "asc" }, include: { sections: true, streams: true } });
  const gradeId = one(search.gradeId) || student.placements[0]?.gradeId || grades[0]?.id;
  const grade = grades.find((item) => item.id === gradeId);
  return (
    <>
      <h1>{t("students.edit")}</h1>
      <Notice t={t} search={search} />
      <p className="alert ok">{t("students.username")}: <strong>{student.user.username}</strong>. {t("students.passwordNote")} {student.studentCode}.</p>
      <form method="get" className="card">
        <Field label={t("students.placement")}>
          <select name="gradeId" defaultValue={gradeId}>
            {grades.map((item) => <option key={item.id} value={item.id}>{gradeLabel(lang, item)}</option>)}
          </select>
        </Field>
        <button className="btn" type="submit">{t("common.show")}</button>
      </form>
      <form className="card grid-2" action={updateStudent}>
        <input type="hidden" name="id" value={student.id} />
        <input type="hidden" name="gradeId" value={grade?.id || ""} />
        <Field label={t("students.studentId")}><input value={student.studentCode} readOnly /></Field>
        <Field label={t("students.username")}><input name="username" defaultValue={student.user.username} required /></Field>
        <Field label={t("students.firstName")}><input name="firstName" defaultValue={student.firstName} required /></Field>
        <Field label={t("students.fatherName")}><input name="fatherName" defaultValue={student.fatherName} required /></Field>
        <Field label={t("students.grandfather")}><input name="grandfather" defaultValue={student.grandfatherName} /></Field>
        <Field label={t("common.sex")}>
          <select name="sex" defaultValue={student.sex}>
            <option value="MALE">{t("common.male")}</option>
            <option value="FEMALE">{t("common.female")}</option>
          </select>
        </Field>
        <Field label={t("common.status")}>
          <select name="status" defaultValue={student.status}>
            <option value="ACTIVE">{t("common.active")}</option>
            <option value="GRADUATED">{t("common.graduated")}</option>
            <option value="LEFT">{t("common.left")}</option>
          </select>
        </Field>
        <Field label={t("common.section")}>
          <select name="sectionId" defaultValue={student.placements[0]?.sectionId}>
            {grade?.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
          </select>
        </Field>
        {grade && grade.streams.length > 0 ? (
          <Field label={t("common.stream")}>
            <select name="streamId" defaultValue={student.placements[0]?.streamId ?? ""}>
              {grade.streams.map((stream) => <option key={stream.id} value={stream.id}>{localizedName(lang, stream)}</option>)}
            </select>
          </Field>
        ) : null}
        <button className="btn primary" type="submit">{t("common.save")}</button>
      </form>
      <form className="card" action={deleteStudents}>
        <input type="hidden" name="ids" value={student.id} />
        <input type="hidden" name="back" value={`/admin/students/${student.id}`} />
        <Field label={t("students.bulkHint")}><input name="confirm" placeholder="DELETE" /></Field>
        <button className="btn danger" type="submit">{t("common.delete")}</button>
      </form>
    </>
  );
}
