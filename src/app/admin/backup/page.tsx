import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { one } from "@/lib/form";
import { Field, Notice } from "@/components/bits";
import { restoreBackup, syncNow } from "@/server/school-actions";

export default async function BackupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t } = await getI18n();
  const search = await searchParams;
  const logs = await prisma.syncLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 });
  const counts = { inserted: one(search.inserted), updated: one(search.updated), skipped: one(search.skipped), deleted: one(search.deleted) };
  return (
    <>
      <h1>{t("backup.title")}</h1>
      <p className="lede">{t("backup.hint")}</p>
      <Notice t={t} search={search} vars={counts} />
      <div className="alert warn">{t("backup.conflict")}</div>
      <p className="lede">{t("backup.shell")}</p>
      <p><a className="btn primary" href="/api/backup">{t("backup.download")}</a></p>
      <form className="card" action={restoreBackup}>
        <Field label={t("backup.mode")}>
          <select name="mode">
            <option value="merge">{t("backup.merge")}</option>
            <option value="replace">{t("backup.replace")}</option>
          </select>
        </Field>
        <Field label={t("backup.restore")}><input type="file" name="file" accept="application/json,.json" required /></Field>
        <Field label={t("backup.confirmReplace")}><input name="confirm" placeholder="REPLACE" /></Field>
        <button className="btn" type="submit">{t("backup.restore")}</button>
      </form>
      <div className="row">
        <form action={syncNow}><input type="hidden" name="direction" value="push" /><button className="btn" type="submit">{t("backup.push")}</button></form>
        <form action={syncNow}><input type="hidden" name="direction" value="pull" /><button className="btn" type="submit">{t("backup.pull")}</button></form>
      </div>
      <h2>{t("backup.logs")}</h2>
      {logs.length === 0 ? <p>{t("common.empty")}</p> : (
        <ul>{logs.map((log) => <li key={log.id}>{log.createdAt.toISOString()} · {log.direction} · {log.detail}</li>)}</ul>
      )}
    </>
  );
}
