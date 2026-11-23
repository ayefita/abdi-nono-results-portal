import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { PrintButton } from "@/components/offline";

type Row = { status: string; studentId: string; username: string; name: string; detail: string };

export default async function ImportResult({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const { t } = await getI18n();
  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
  if (!batch || !Array.isArray(batch.summary)) notFound();
  const rows = batch.summary as Row[];
  const created = rows.filter((row) => row.status === "created").length;
  const updated = rows.filter((row) => row.status === "updated").length;
  const errors = rows.filter((row) => row.status === "error").length;
  return (
    <>
      <h1>{t("students.importResult")}</h1>
      <p>{t("students.createdCount")}: {created} · {t("students.updatedCount")}: {updated} · {t("students.errorCount")}: {errors}</p>
      <p className="lede">{t("students.passwordNote")}</p>
      <div className="table-wrap">
        <table className="responsive">
          <thead>
            <tr>
              <th>{t("common.status")}</th>
              <th>{t("students.studentId")}</th>
              <th>{t("common.name")}</th>
              <th>{t("students.username")}</th>
              <th>{t("students.initialPassword")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td data-label={t("common.status")}>{row.status === "error" ? t(row.detail) : row.status}</td>
                <td data-label={t("students.studentId")}>{row.studentId}</td>
                <td data-label={t("common.name")}>{row.name}</td>
                <td data-label={t("students.username")}>{row.username}</td>
                <td data-label={t("students.initialPassword")}>{row.status === "created" ? row.studentId : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="no-print"><PrintButton label={t("common.print")} /></p>
    </>
  );
}
