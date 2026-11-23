import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { Field, Notice } from "@/components/bits";
import { deleteStaff, saveStaff } from "@/server/student-actions";

export default async function EditTeacher({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const { t } = await getI18n();
  const teacher = await prisma.teacher.findUnique({ where: { id }, include: { user: true } });
  if (!teacher) notFound();
  return (
    <>
      <h1>{t("teachers.edit")}</h1>
      <Notice t={t} search={await searchParams} />
      <form className="card grid-2" action={saveStaff}>
        <input type="hidden" name="role" value="TEACHER" />
        <input type="hidden" name="id" value={teacher.id} />
        <Field label={t("students.firstName")}><input name="firstName" defaultValue={teacher.user.firstName} required /></Field>
        <Field label={t("students.fatherName")}><input name="fatherName" defaultValue={teacher.user.fatherName} required /></Field>
        <Field label={t("students.username")}><input name="username" defaultValue={teacher.user.username} required /></Field>
        <Field label={t("common.sex")}>
          <select name="sex" defaultValue={teacher.user.sex ?? "FEMALE"}>
            <option value="FEMALE">{t("common.female")}</option>
            <option value="MALE">{t("common.male")}</option>
          </select>
        </Field>
        <Field label={t("common.phone")}><input name="phone" defaultValue={teacher.user.phone ?? ""} /></Field>
        <Field label={t("teachers.resetPassword")}><input name="password" type="password" minLength={8} /></Field>
        <button className="btn primary" type="submit">{t("common.save")}</button>
      </form>
      <form className="card" action={deleteStaff}>
        <input type="hidden" name="role" value="TEACHER" />
        <input type="hidden" name="id" value={teacher.id} />
        <Field label={t("students.bulkHint")}><input name="confirm" placeholder="DELETE" /></Field>
        <button className="btn danger" type="submit">{t("common.delete")}</button>
      </form>
    </>
  );
}
