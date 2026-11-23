import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { one } from "@/lib/form";
import { Field, Notice } from "@/components/bits";
import { saveStaff } from "@/server/student-actions";

export default async function TeachersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t } = await getI18n();
  const search = await searchParams;
  const teachers = await prisma.teacher.findMany({ include: { user: true }, orderBy: { user: { fullName: "asc" } } });
  return (
    <>
      <h1>{t("teachers.title")}</h1>
      <Notice t={t} search={search} vars={{ username: one(search.username) }} />
      <div className="table-wrap">
        <table className="responsive">
          <thead><tr><th>{t("common.name")}</th><th>{t("students.username")}</th><th>{t("common.phone")}</th><th></th></tr></thead>
          <tbody>
            {teachers.map((teacher) => (
              <tr key={teacher.id}>
                <td data-label={t("common.name")}>{teacher.user.fullName}</td>
                <td data-label={t("students.username")}>{teacher.user.username}</td>
                <td data-label={t("common.phone")}>{teacher.user.phone}</td>
                <td><a href={`/admin/teachers/${teacher.id}`}>{t("common.edit")}</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {teachers.length === 0 ? <p className="alert">{t("teachers.empty")}</p> : null}
      <h2>{t("teachers.new")}</h2>
      <StaffForm role="TEACHER" />
    </>
  );
}

function StaffForm({ role }: { role: "TEACHER" | "DIRECTOR" }) {
  return <StaffFormInner role={role} />;
}

async function StaffFormInner({ role }: { role: "TEACHER" | "DIRECTOR" }) {
  const { t } = await getI18n();
  const { previewId } = await import("@/lib/ids");
  const nextId = role === "TEACHER" ? await previewId("teacher") : "";
  return (
    <form className="card grid-2" action={saveStaff}>
      <input type="hidden" name="role" value={role} />
      {role === "TEACHER" ? <Field label={t("ids.nextTeacher")}><input value={nextId} readOnly /></Field> : null}
      {role === "TEACHER" ? <p className="lede">{t("ids.autoTeacher")}</p> : null}
      <Field label={t("students.firstName")}><input name="firstName" required /></Field>
      <Field label={t("students.fatherName")}><input name="fatherName" required /></Field>
      <Field label={t("common.sex")}>
        <select name="sex" required><option value="FEMALE">{t("common.female")}</option><option value="MALE">{t("common.male")}</option></select>
      </Field>
      <Field label={t("common.phone")}><input name="phone" /></Field>
      <Field label={`${t("students.username")} (${t("teachers.usernameOptional")})`}><input name="username" /></Field>
      {role === "DIRECTOR" ? <Field label={t("teachers.password")}><input name="password" type="password" minLength={8} required /></Field> : null}
      <button className="btn primary" type="submit">{t("common.save")}</button>
    </form>
  );
}
