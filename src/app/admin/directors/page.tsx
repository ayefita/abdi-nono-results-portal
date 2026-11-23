import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { one } from "@/lib/form";
import { Field, Notice } from "@/components/bits";
import { deleteStaff, saveStaff } from "@/server/student-actions";

export default async function DirectorsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t } = await getI18n();
  const search = await searchParams;
  const directors = await prisma.user.findMany({ where: { role: "DIRECTOR" }, orderBy: { fullName: "asc" } });
  return (
    <>
      <h1>{t("directors.title")}</h1>
      <p className="lede">{t("directors.readOnly")}</p>
      <Notice t={t} search={search} vars={{ username: one(search.username) }} />
      <div className="table-wrap">
        <table className="responsive">
          <thead><tr><th>{t("common.name")}</th><th>{t("students.username")}</th><th></th></tr></thead>
          <tbody>
            {directors.map((director) => (
              <tr key={director.id}>
                <td data-label={t("common.name")}>{director.fullName}</td>
                <td data-label={t("students.username")}>{director.username}</td>
                <td>
                  <form action={deleteStaff}>
                    <input type="hidden" name="role" value="DIRECTOR" />
                    <input type="hidden" name="id" value={director.id} />
                    <input type="hidden" name="confirm" value="DELETE" />
                    <button className="btn danger small" type="submit">{t("common.delete")}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {directors.length === 0 ? <p className="alert">{t("directors.empty")}</p> : null}
      <h2>{t("directors.new")}</h2>
      <form className="card grid-2" action={saveStaff}>
        <input type="hidden" name="role" value="DIRECTOR" />
        <Field label={t("students.firstName")}><input name="firstName" required /></Field>
        <Field label={t("students.fatherName")}><input name="fatherName" required /></Field>
        <Field label={t("common.sex")}>
          <select name="sex"><option value="FEMALE">{t("common.female")}</option><option value="MALE">{t("common.male")}</option></select>
        </Field>
        <Field label={t("students.username")}><input name="username" /></Field>
        <Field label={t("teachers.password")}><input name="password" type="password" minLength={8} required /></Field>
        <button className="btn primary" type="submit">{t("common.save")}</button>
      </form>
    </>
  );
}
