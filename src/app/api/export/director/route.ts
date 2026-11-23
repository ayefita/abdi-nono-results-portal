import { apiSession } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { getI18n } from "@/lib/i18n";
import { buildReport } from "@/lib/reports";
import { workbookBuffer } from "@/lib/excel";
import { pdfResponse, renderPdf, xlsxResponse } from "@/lib/pdf";

export async function GET(request: Request) {
  const { session, response } = await apiSession(["DIRECTOR", "ADMIN"]);
  if (!session) return response;
  const url = new URL(request.url);
  const { t, lang } = await getI18n();
  const report = await buildReport({
    academicYearId: url.searchParams.get("academicYearId") || undefined,
    semesterId: url.searchParams.get("semesterId") || undefined,
    gradeId: url.searchParams.get("gradeId") || undefined,
    sectionId: url.searchParams.get("sectionId") || undefined,
    subjectId: url.searchParams.get("subjectId") || undefined,
  }, lang);
  if (!report) return Response.json({ error: "errors.notFound" }, { status: 404 });
  const summary = [[t("director.count"), report.summary.count], [t("common.average"), report.summary.average], [t("director.passRate"), report.summary.passRate], [t("director.highest"), report.summary.highest], [t("director.lowest"), report.summary.lowest]];
  const settings = await getSettings();
  if (url.searchParams.get("format") === "pdf") {
    const pdf = await renderPdf((doc) => {
      doc.font("bold").fontSize(16).text(settings.nameEn);
      doc.font("body").fontSize(12).text(t("director.title"));
      doc.moveDown();
      for (const row of summary) doc.text(`${row[0]}: ${row[1]}`);
      doc.moveDown();
      for (const row of report.byGrade) doc.text(`${row.name}: ${row.average}%  ${t("director.passRate")} ${row.passRate}%`);
    });
    return pdfResponse(pdf, "ifa-boru-report-director.pdf");
  }
  return xlsxResponse(workbookBuffer([
    { name: "Summary", rows: summary },
    { name: "Grades", rows: [[t("common.grade"), t("common.average"), t("director.passRate")], ...report.byGrade.map((row) => [row.name, row.average, row.passRate])] },
    { name: "Subjects", rows: [[t("common.subject"), t("common.average"), t("director.highest"), t("director.lowest")], ...report.bySubject.map((row) => [row.name, row.average, row.highest, row.lowest])] },
    { name: "Top", rows: [[t("common.name"), t("common.average")], ...report.top.map((row) => [row.fullName, row.average])] },
    { name: "Completion", rows: [[t("assignments.teacher"), t("common.subject"), "%"], ...report.completion.map((row) => [row.teacher, row.subject, row.percent])] },
  ]), "ifa-boru-director.xlsx");
}
