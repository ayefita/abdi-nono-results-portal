import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { apiSession } from "@/lib/api";
import { getI18n } from "@/lib/i18n";
import { gradeLabel } from "@/lib/labels";
import { workbookBuffer } from "@/lib/excel";
import { pdfResponse, renderPdf, xlsxResponse } from "@/lib/pdf";

export async function GET(request: Request) {
  const { session, response } = await apiSession(["ADMIN"]);
  if (!session) return response;
  const { t, lang } = await getI18n();
  const students = await prisma.student.findMany({
    include: { user: true, placements: { where: { academicYear: { isCurrent: true } }, include: { grade: true, section: true } } },
    orderBy: { studentCode: "asc" },
  });
  const header = [t("common.name"), t("students.studentId"), t("students.username"), t("common.grade"), t("credentials.passwordIsId")];
  const rows = students.map((student) => {
    const place = student.placements[0];
    return [student.user.fullName, student.studentCode, student.user.username, place ? `${gradeLabel(lang, place.grade)} ${place.section.name}` : "", student.studentCode];
  });
  if (new URL(request.url).searchParams.get("format") === "pdf") {
    const settings = await getSettings();
    const pdf = await renderPdf((doc) => {
      doc.font("bold").fontSize(16).text(settings.nameEn);
      doc.font("body").fontSize(12).text(t("credentials.title"));
      doc.moveDown();
      for (const row of rows) doc.text(row.join("  ·  "));
    });
    return pdfResponse(pdf, "abdi-nono-usernames.pdf");
  }
  return xlsxResponse(workbookBuffer([{ name: "Usernames", rows: [header, ...rows] }]), "abdi-nono-usernames.xlsx");
}
