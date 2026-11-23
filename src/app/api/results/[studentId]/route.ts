import { NextResponse } from "next/server";
import { apiSession } from "@/lib/api";
import { getStudentResult } from "@/lib/results";
import { isLang } from "@/lib/i18n";

export async function GET(request: Request, context: { params: Promise<{ studentId: string }> }) {
  const { session, response } = await apiSession();
  if (!session) return response;
  const { studentId } = await context.params;
  const semesterId = new URL(request.url).searchParams.get("semesterId") || "";
  try {
    const result = await getStudentResult(session, studentId, semesterId, isLang(session.language) ? session.language : "en");
    return NextResponse.json({
      studentId: result.studentId,
      fullName: result.fullName,
      average: result.average,
      overall: result.overall,
      rank: result.rank,
      classSize: result.classSize,
      subjects: result.subjects.map((subject) => ({ name: subject.name, total: subject.total, percent: subject.percent, status: subject.status })),
    });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status: number }).status) : 400;
    const key = error instanceof Error ? error.message : "errors.forbidden";
    return NextResponse.json({ error: key }, { status });
  }
}
