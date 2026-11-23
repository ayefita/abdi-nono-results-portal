import { apiSession } from "@/lib/api";
import { getI18n } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { schoolName } from "@/lib/labels";
import { getStudentResult } from "@/lib/results";
import { pdfResponse, renderPdf } from "@/lib/pdf";

export async function GET(request: Request) {
  const { session, response } = await apiSession(["STUDENT", "ADMIN", "DIRECTOR"]);
  if (!session) return response;
  const semesterId = new URL(request.url).searchParams.get("semesterId") || "";
  const studentId = session.role === "STUDENT" ? session.studentId || "" : new URL(request.url).searchParams.get("studentId") || "";
  if (!studentId) return Response.json({ error: "errors.notFound" }, { status: 404 });
  const { t, lang } = await getI18n();
  const settings = await getSettings();
  try {
    const result = await getStudentResult(session, studentId, semesterId, lang);
    const pdf = await renderPdf((doc) => {
      doc.font("bold").fontSize(18).text(schoolName(lang, settings));
      doc.font("bold").fontSize(16).text(t("report.title"));
      doc.font("body").fontSize(12);
      doc.moveDown();
      doc.text(`${t("report.student")}: ${result.fullName}`);
      doc.text(`${t("report.id")}: ${result.studentCode}`);
      doc.text(`${t("report.username")}: ${result.username}`);
      if (result.placement) doc.text(`${result.placement.year} · ${result.semester.name} · ${result.placement.grade} ${result.placement.section}`);
      doc.moveDown();
      for (const subject of result.subjects) {
        doc.text(`${subject.name}: ${subject.total}/${subject.max}  ${subject.percent.toFixed(1)}%  ${t(`common.${subject.status}`)}`);
      }
      doc.moveDown();
      doc.text(`${t("common.average")}: ${result.average.toFixed(1)}%`);
      if (result.rank) doc.text(t("results.rankOf", { rank: result.rank, size: result.classSize }));
    });
    return pdfResponse(pdf, "abdi-nono-report.pdf");
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status: number }).status) : 400;
    return Response.json({ error: error instanceof Error ? error.message : "errors.forbidden" }, { status });
  }
}
