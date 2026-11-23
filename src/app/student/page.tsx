import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { localizedName, schoolName } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { getStudentResult } from "@/lib/results";
import { one } from "@/lib/form";
import { Field, statusLabel } from "@/components/bits";
import { OfflineBanner } from "@/components/offline";
import { getSettings } from "@/lib/settings";
import { Hero } from "@/components/chrome";

export default async function StudentResults({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireRole("STUDENT");
  const { t, lang } = await getI18n();
  const settings = await getSettings();
  const search = await searchParams;
  const placements = await prisma.placement.findMany({
    where: { studentId: session.studentId! },
    include: { academicYear: { include: { semesters: { orderBy: { sortOrder: "asc" } } } } },
  });
  const semesters = placements
    .flatMap((placement) => placement.academicYear.semesters.filter((semester) => semester.isPublished).map((semester) => ({ semester, year: placement.academicYear })))
    .sort((a, b) => b.year.startDate.getTime() - a.year.startDate.getTime() || b.semester.sortOrder - a.semester.sortOrder);
  const chosen = semesters.find((item) => item.semester.id === one(search.semester)) ?? semesters[0];
  const result = chosen && session.studentId ? await getStudentResult(session, session.studentId, chosen.semester.id, lang) : null;
  return (
    <>
      <Hero eyebrow={schoolName(lang, settings)} title={t("results.title")} text={`${t("results.onlyYou")} ${t("results.pastYears")}`} />
      <OfflineBanner text={t("results.offline")} />
      {semesters.length === 0 ? <p className="alert warn">{t("results.empty")}</p> : (
        <form className="card" method="get">
          <Field label={t("results.choose")}>
            <select name="semester" defaultValue={chosen?.semester.id}>
              {semesters.map((item) => (
                <option key={item.semester.id} value={item.semester.id}>
                  {localizedName(lang, item.year)} · {localizedName(lang, item.semester)}
                </option>
              ))}
            </select>
          </Field>
          <button className="btn primary" type="submit">{t("common.show")}</button>
        </form>
      )}
      {result ? (
        <article className="sheet">
          {!result.placement ? <p className="alert">{t("results.noPlacement")}</p> : (
            <>
              <div className="spread">
                <div>
                  <h2 style={{ marginTop: 0 }}>{result.fullName}</h2>
                  <p>{result.studentCode} · {result.placement.grade} {result.placement.section}{result.placement.stream ? ` · ${result.placement.stream}` : ""}</p>
                  {result.placement.isRepeater ? <span className="badge">{t("common.repeater")}</span> : null}
                </div>
                <section className="stats">
                  <div className="stat"><b>{result.average.toFixed(1)}%</b><small>{t("common.average")}</small></div>
                  <div className="stat"><b>{result.rank ?? "—"}</b><small>{result.rank ? t("results.rankOf", { rank: result.rank, size: result.classSize }) : t("common.rank")}</small></div>
                  <div className="stat"><b><span className={`badge ${result.overall}`}>{statusLabel(t, result.overall)}</span></b><small>{t("common.overall")}</small></div>
                  <div className="stat"><b>{result.passMark}%</b><small>{t("results.passMark")}</small></div>
                </section>
              </div>
              <div className="table-wrap">
                <table className="responsive">
                  <thead>
                    <tr>
                      <th>{t("common.subject")}</th>
                      {result.subjects[0]?.components.map((component) => <th key={component.id}>{component.name}</th>)}
                      <th>{t("common.total")}</th>
                      <th>{t("common.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.subjects.map((subject) => (
                      <tr key={subject.subjectId}>
                        <td data-label={t("common.subject")}>{subject.name}</td>
                        {subject.components.map((component) => (
                          <td key={component.id} data-label={component.name}>{component.score ?? "—"}<small>/{component.max}</small></td>
                        ))}
                        <td data-label={t("common.total")}>{subject.total}/{subject.max}</td>
                        <td data-label={t("common.status")}><span className={`badge ${subject.status}`}>{statusLabel(t, subject.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="row no-print">
                <a className="btn primary" href={`/student/report?semester=${result.semester.id}`}>{t("results.report")}</a>
                <a className="btn" href={`/api/export/report?semesterId=${result.semester.id}`}>{t("common.exportPdf")}</a>
              </p>
            </>
          )}
        </article>
      ) : null}
    </>
  );
}
