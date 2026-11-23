import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { schoolName } from "@/lib/labels";
import { Hero } from "@/components/chrome";

const tiles = [
  ["/admin/students", "nav.students", "dash.studentsHint"],
  ["/admin/teachers", "nav.teachers", "dash.teachersHint"],
  ["/admin/directors", "nav.directors", "dash.directorsHint"],
  ["/admin/grades", "nav.grades", "dash.gradesHint"],
  ["/admin/subjects", "nav.subjects", "dash.subjectsHint"],
  ["/admin/years", "nav.years", "dash.yearsHint"],
  ["/admin/components", "nav.components", "dash.componentsHint"],
  ["/admin/assignments", "nav.assignments", "dash.assignmentsHint"],
  ["/admin/marks", "nav.marks", "dash.marksHint"],
  ["/admin/promotion", "nav.promotion", "dash.promotionHint"],
  ["/admin/credentials", "nav.credentials", "dash.credentialsHint"],
  ["/admin/settings", "nav.settings", "dash.settingsHint"],
  ["/admin/backup", "nav.backup", "dash.backupHint"],
] as const;

export default async function AdminHome() {
  const { t, lang } = await getI18n();
  const settings = await getSettings();
  const [students, teachers, directors, unpublished] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.user.count({ where: { role: "DIRECTOR" } }),
    prisma.semester.count({ where: { isPublished: false } }),
  ]);
  return (
    <>
      <Hero eyebrow={settings.shortName} title={schoolName(lang, settings)} text={t("dash.welcome")} />
      <section className="stats">
        <div className="stat"><b>{students}</b><small>{t("dash.statsStudents")}</small></div>
        <div className="stat"><b>{teachers}</b><small>{t("dash.statsTeachers")}</small></div>
        <div className="stat"><b>{directors}</b><small>{t("dash.statsDirectors")}</small></div>
        <div className="stat"><b>{unpublished}</b><small>{t("dash.unpublished")}</small></div>
      </section>
      <nav className="tiles">
        {tiles.map(([href, title, hint]) => (
          <a className="tile" key={href} href={href}>
            <strong>{t(title)}</strong>
            <span>{t(hint)}</span>
          </a>
        ))}
      </nav>
    </>
  );
}
