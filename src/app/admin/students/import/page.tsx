import { getI18n } from "@/lib/i18n";
import { Notice } from "@/components/bits";
import { Field } from "@/components/bits";
import { importStudents } from "@/server/student-actions";

export default async function ImportStudents({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t } = await getI18n();
  const search = await searchParams;
  return (
    <>
      <h1>{t("students.import")}</h1>
      <p className="lede">{t("students.importHelp")}</p>
      <Notice t={t} search={search} />
      <p><a className="btn" href="/api/templates/students">{t("students.template")}</a></p>
      <form className="card" action={importStudents}>
        <Field label={t("students.import")}><input type="file" name="file" accept=".xlsx,.csv" required /></Field>
        <button className="btn primary" type="submit">{t("common.save")}</button>
      </form>
    </>
  );
}
