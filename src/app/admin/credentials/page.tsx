import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { gradeLabel } from "@/lib/labels";
import { one } from "@/lib/form";
import { Notice } from "@/components/bits";
import { PrintButton } from "@/components/offline";
import { resetStudentPassword } from "@/server/student-actions";

export default async function CredentialsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, lang } = await getI18n();
  const search = await searchParams;
  const students = await prisma.student.findMany({
    include: { user: true, placements: { where: { academicYear: { isCurrent: true } }, include: { grade: true, section: true } } },
    orderBy: { studentCode: "asc" },
  });
  return (
    <>
      <h1>{t("credentials.title")}</h1>
      <p className="lede">{t("credentials.hint")}</p>
      <Notice t={t} search={search} vars={{ username: one(search.username) }} />
      <p className="row no-print">
        <PrintButton label={t("credentials.print")} />
        <a className="btn" href="/api/export/credentials?format=xlsx">{t("common.exportExcel")}</a>
        <a className="btn" href="/api/export/credentials?format=pdf">{t("common.exportPdf")}</a>
      </p>
      <div className="table-wrap">
        <table className="responsive">
          <thead>
            <tr>
              <th>{t("common.name")}</th>
              <th>{t("students.studentId")}</th>
              <th>{t("students.username")}</th>
              <th>{t("common.grade")}</th>
              <th>{t("credentials.passwordIsId")}</th>
              <th>{t("credentials.mustChange")}</th>
              <th className="no-print"></th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const place = student.placements[0];
              return (
                <tr key={student.id}>
                  <td data-label={t("common.name")}>{student.user.fullName}</td>
                  <td data-label={t("students.studentId")}>{student.studentCode}</td>
                  <td data-label={t("students.username")}>{student.user.username}</td>
                  <td data-label={t("common.grade")}>{place ? `${gradeLabel(lang, place.grade)} ${place.section.name}` : "—"}</td>
                  <td data-label={t("credentials.passwordIsId")}>{student.studentCode}</td>
                  <td data-label={t("credentials.mustChange")}>{student.user.mustChangePassword ? t("common.yes") : t("credentials.changed")}</td>
                  <td className="no-print">
                    <form action={resetStudentPassword}>
                      <input type="hidden" name="studentId" value={student.id} />
                      <button className="btn small" type="submit">{t("credentials.reset")}</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
