import { prisma } from "@/lib/prisma";
import { getI18n } from "@/lib/i18n";
import { gradeLabel, localizedName } from "@/lib/labels";
import { one } from "@/lib/form";
import { Notice } from "@/components/bits";
import { deleteStudents } from "@/server/student-actions";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, lang } = await getI18n();
  const search = await searchParams;
  const q = one(search.q);
  const page = Math.max(1, Number(one(search.page) || "1"));
  const where = q
    ? {
        OR: [
          { studentCode: { contains: q, mode: "insensitive" as const } },
          { firstName: { contains: q, mode: "insensitive" as const } },
          { fatherName: { contains: q, mode: "insensitive" as const } },
          { user: { username: { contains: q, mode: "insensitive" as const } } },
          { user: { fullName: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};
  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: { user: true, placements: { where: { academicYear: { isCurrent: true } }, include: { grade: true, section: true, stream: true } } },
      orderBy: { studentCode: "asc" },
      skip: (page - 1) * 30,
      take: 30,
    }),
  ]);
  return (
    <>
      <div className="spread">
        <h1>{t("students.title")}</h1>
        <p className="row no-print">
          <a className="btn primary" href="/admin/students/new">{t("students.new")}</a>
          <a className="btn" href="/admin/students/import">{t("students.import")}</a>
        </p>
      </div>
      <Notice t={t} search={search} />
      <form className="row" method="get">
        <input name="q" defaultValue={q} placeholder={t("students.searchPlaceholder")} aria-label={t("common.search")} />
        <button className="btn" type="submit">{t("common.search")}</button>
      </form>
      <form action={deleteStudents}>
        <div className="table-wrap">
          <table className="responsive">
            <thead>
              <tr>
                <th></th>
                <th>{t("students.studentId")}</th>
                <th>{t("common.name")}</th>
                <th>{t("students.username")}</th>
                <th>{t("common.grade")}</th>
                <th>{t("common.sex")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const place = student.placements[0];
                return (
                  <tr key={student.id}>
                    <td data-label=""><input type="checkbox" name="ids" value={student.id} aria-label={student.user.fullName} /></td>
                    <td data-label={t("students.studentId")}>{student.studentCode}</td>
                    <td data-label={t("common.name")}>{student.user.fullName}</td>
                    <td data-label={t("students.username")}>{student.user.username}</td>
                    <td data-label={t("common.grade")}>{place ? `${gradeLabel(lang, place.grade)} ${place.section.name}${place.stream ? ` · ${localizedName(lang, place.stream)}` : ""}` : "—"}</td>
                    <td data-label={t("common.sex")}>{student.sex === "MALE" ? t("common.male") : t("common.female")}</td>
                    <td><a href={`/admin/students/${student.id}`}>{t("common.edit")}</a></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {students.length === 0 ? <p className="alert">{t("students.empty")}</p> : null}
        <div className="card">
          <p>{t("students.bulkHint")}</p>
          <input name="confirm" placeholder="DELETE" aria-label="DELETE" />
          <button className="btn danger" type="submit">{t("students.bulkDelete")}</button>
        </div>
      </form>
      <p className="row">
        {page > 1 ? <a className="btn" href={`/admin/students?q=${encodeURIComponent(q)}&page=${page - 1}`}>{t("common.previous")}</a> : null}
        {page * 30 < total ? <a className="btn" href={`/admin/students?q=${encodeURIComponent(q)}&page=${page + 1}`}>{t("common.next")}</a> : null}
      </p>
    </>
  );
}
