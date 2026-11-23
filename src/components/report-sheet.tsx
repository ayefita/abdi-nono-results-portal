import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { schoolName, localizedName, gradeLabel } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { bandFor, calcOverall, calcSubject, parseScale } from "@/lib/marks";
import { formatWhen } from "@/lib/format";
import { saveComment } from "@/server/mark-actions";
import { PrintButton } from "./offline";
import { SchoolMark } from "./chrome";
import type { Session } from "@/lib/types";

function autoKey(average: number) {
  if (average >= 85) return "reportcard.excellent";
  if (average >= 70) return "reportcard.good";
  if (average >= 50) return "reportcard.fair";
  return "reportcard.low";
}

export async function ReportDeck({
  actor,
  yearId,
  studentId,
  sectionId,
  back,
}: {
  actor: Session;
  yearId?: string;
  studentId?: string;
  sectionId?: string;
  back: string;
}) {
  const { t, lang } = await getI18n();
  const settings = await getSettings();
  const scale = parseScale(settings.gradeScale);
  const year = yearId
    ? await prisma.academicYear.findUnique({ where: { id: yearId }, include: { semesters: { orderBy: { sortOrder: "asc" } } } })
    : await prisma.academicYear.findFirst({ where: { isCurrent: true }, include: { semesters: { orderBy: { sortOrder: "asc" } } } });
  if (!year) return <p className="alert">{t("results.empty")}</p>;
  const semesters = actor.role === "STUDENT" ? year.semesters.filter((item) => item.isPublished) : year.semesters;
  const placements = await prisma.placement.findMany({
    where: {
      academicYearId: year.id,
      ...(studentId ? { studentId } : {}),
      ...(sectionId ? { sectionId } : {}),
    },
    include: { student: { include: { user: true } }, grade: true, section: true, stream: true },
    orderBy: { student: { fatherName: "asc" } },
  });
  const visible = [];
  for (const placement of placements) {
    if (actor.role === "STUDENT" && actor.studentId !== placement.studentId) continue;
    if (actor.role === "TEACHER") {
      const allowed = await prisma.teacherAssignment.findFirst({ where: { teacherId: actor.teacherId || "", sectionId: placement.sectionId, academicYearId: year.id } });
      if (!allowed) continue;
    }
    visible.push(placement);
  }
  const comments = await prisma.reportComment.findMany({ where: { studentId: { in: visible.map((row) => row.studentId) }, semesterId: { in: semesters.map((item) => item.id) } } });
  const cards = [];
  for (const placement of visible) {
        const subjects = await prisma.subject.findMany({
          where: { gradeId: placement.gradeId, OR: [{ streamId: null }, ...(placement.streamId ? [{ streamId: placement.streamId }] : [])] },
          include: { components: true },
          orderBy: { sortOrder: "asc" },
        });
        const marks = await prisma.mark.findMany({ where: { studentId: placement.studentId, semesterId: { in: semesters.map((item) => item.id) } } });
        const classmates = await prisma.placement.findMany({ where: { sectionId: placement.sectionId, academicYearId: year.id } });
        const classMarks = await prisma.mark.findMany({
          where: { studentId: { in: classmates.map((row) => row.studentId) }, semesterId: { in: semesters.map((item) => item.id) } },
        });
        const rows = subjects.map((subject) => {
          const terms = semesters.map((semester) => {
            const calc = calcSubject(
              subject.components.filter((component) => !component.isFormula).map((component) => ({
                componentId: component.id,
                maxScore: component.maxScore,
                score: marks.find((mark) => mark.semesterId === semester.id && mark.componentId === component.id)?.score ?? null,
              })),
              settings.passMark,
            );
            const band = bandFor(calc.percent, scale);
            return { id: semester.id, name: localizedName(lang, semester), percent: calc.percent, letter: band.letter, status: calc.status };
          });
          const scored = terms.filter((term) => term.status !== "incomplete");
          const final = calcOverall(scored.map((term) => ({ percent: term.percent, status: term.status })));
          return { name: localizedName(lang, subject), terms, final, letter: scored.length ? bandFor(final.average, scale).letter : "—" };
        });
        const overall = calcOverall(rows.map((row) => ({ percent: row.final.average, status: row.final.overall })));
        const later = await prisma.placement.findFirst({ where: { studentId: placement.studentId, academicYear: { startDate: { gt: year.startDate } } } });
        const promoted = later ? !later.isRepeater : overall.overall === "pass";
        const comment = comments.find((item) => item.studentId === placement.studentId);
        const commentText = comment?.body || t(autoKey(overall.average));
        const canEdit = actor.role === "ADMIN" || actor.role === "TEACHER";
        const averages = classmates.map((mate) => {
          const mine = classMarks.filter((mark) => mark.studentId === mate.studentId);
          const scored = subjects.map((subject) => {
            const terms = semesters.map((semester) =>
              calcSubject(
                subject.components.filter((component) => !component.isFormula).map((component) => ({
                  componentId: component.id,
                  maxScore: component.maxScore,
                  score: mine.find((mark) => mark.semesterId === semester.id && mark.componentId === component.id)?.score ?? null,
                })),
                settings.passMark,
              ),
            );
            return calcOverall(terms.filter((term) => term.status !== "incomplete").map((term) => ({ percent: term.percent, status: term.status })));
          });
          return calcOverall(scored.map((row) => ({ percent: row.average, status: row.overall }))).average;
        });
        const rank = averages.filter((value) => value > overall.average + 1e-9).length + 1;
        cards.push({ placement, rows, overall, promoted, commentText, canEdit, rank, classSize: classmates.length });
  }
  return (
    <>
      {cards.map(({ placement, rows, overall, promoted, commentText, canEdit, rank, classSize }) => (
          <article className="rcard" key={placement.id}>
            <div className="rc-logo">
              <SchoolMark size={96} className="login-mark" />
            </div>
            <h1>{t("reportcard.heading")}</h1>
            <p className="rc-school"><span />{schoolName(lang, settings)}<span /></p>
            <div className="rc-info">
              <p><strong>{t("report.student")}</strong><br />{placement.student.user.fullName}</p>
              <p><strong>{t("reportcard.className")}</strong><br />{gradeLabel(lang, placement.grade)} {placement.section.name}</p>
              <p><strong>{t("common.date")}</strong><br />{formatWhen(new Date(), lang, settings.showEthiopianCalendar)}</p>
            </div>
            <table className="rc-table">
              <thead>
                <tr>
                  <th>{t("common.subject")}</th>
                  {semesters.map((semester) => <th key={semester.id}>{localizedName(lang, semester)}</th>)}
                  <th>{t("reportcard.final")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    {row.terms.map((term) => <td key={term.id}>{term.status === "incomplete" ? "—" : `${term.percent.toFixed(0)} ${term.letter}`}</td>)}
                    <td>{row.letter === "—" ? "—" : `${row.final.average.toFixed(0)} ${row.letter}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="rc-summary">
              {t("common.average")}: {overall.average.toFixed(1)}% · {t("common.rank")}: {rank} / {classSize}
              · <strong>{promoted ? t("reportcard.promoted") : t("reportcard.notPromoted")}</strong>
            </p>
            <h2>{t("reportcard.comments")}</h2>
            {canEdit && semesters[0] ? (
              <form action={saveComment} className="no-print">
                <input type="hidden" name="studentId" value={placement.studentId} />
                <input type="hidden" name="semesterId" value={semesters[0].id} />
                <input type="hidden" name="back" value={back} />
                <textarea name="body" defaultValue={commentText} />
                <button className="btn" type="submit">{t("common.save")}</button>
              </form>
            ) : null}
            <p className={canEdit ? "rc-comment print-only" : "rc-comment"}>{commentText}</p>
            <div className="rc-sign">
              <p>{t("reportcard.teacherName")} ________ {t("reportcard.signature")} ________</p>
              <p>{t("reportcard.principalName")} ________ {t("reportcard.signature")} ________</p>
            </div>
          </article>
      ))}
      <p className="no-print row">
        <PrintButton label={t("common.print")} />
      </p>
    </>
  );
}
