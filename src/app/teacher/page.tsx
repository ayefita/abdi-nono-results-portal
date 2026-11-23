import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { gradeLabel, localizedName, schoolName } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { Hero } from "@/components/chrome";

export default async function TeacherHome() {
  const session = await requireRole("TEACHER");
  const { t, lang } = await getI18n();
  const settings = await getSettings();
  const year = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId: session.teacherId!, academicYearId: year?.id },
    include: { subject: true, section: { include: { grade: true } }, academicYear: { include: { semesters: { orderBy: { sortOrder: "asc" } } } } },
  });
  return (
    <>
      <Hero eyebrow={schoolName(lang, settings)} title={session.fullName} text={t("marks.teacherHint")} />
      {assignments.length === 0 ? <p className="alert warn">{t("assignments.empty")}</p> : (
        <div className="tiles">
          {assignments.flatMap((assignment) =>
            assignment.academicYear.semesters.map((semester) => (
              <a
                className="tile"
                key={`${assignment.id}-${semester.id}`}
                href={`/teacher/marks?academicYearId=${assignment.academicYearId}&semesterId=${semester.id}&sectionId=${assignment.sectionId}&subjectId=${assignment.subjectId}`}
              >
                <strong>{localizedName(lang, assignment.subject)}</strong>
                <span>
                  {gradeLabel(lang, assignment.section.grade)} {assignment.section.name} · {localizedName(lang, semester)}
                  {" · "}
                  {semester.isPublished ? t("common.published") : t("common.draft")}
                </span>
              </a>
            )),
          )}
        </div>
      )}
    </>
  );
}
