const base = process.env.BASE_URL || "http://127.0.0.1:43123";

async function login(username: string, password: string) {
  const response = await fetch(`${base}/api/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await response.json();
  const cookie = (response.headers.getSetCookie?.() ?? []).map((item) => item.split(";")[0]).join("; ");
  if (!response.ok) throw new Error(`login failed for ${username}: ${response.status} ${JSON.stringify(body)}`);
  return { cookie, body };
}

async function openSession(username: string, password: string) {
  const session = await login(username, password);
  if (!session.body.mustChangePassword) return session;
  const response = await fetch(`${base}/api/change-password`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: session.cookie },
    body: JSON.stringify({ current: password, next: "Changed@2040" }),
  });
  const body = await response.json();
  const cookie = (response.headers.getSetCookie?.() ?? []).map((item) => item.split(";")[0]).join("; ") || session.cookie;
  if (!response.ok) throw new Error(`password change failed for ${username}: ${response.status} ${JSON.stringify(body)}`);
  return { cookie, body };
}

async function main() {
  const failures: string[] = [];
  const check = (name: string, ok: boolean, detail = "") => {
    if (!ok) failures.push(`${name} ${detail}`);
    else console.log("ok", name);
  };
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) throw new Error("Set SEED_ADMIN_PASSWORD before the access test.");
  const admin = await login("admin", adminPassword);
  const directory = await fetch(`${base}/api/admin/directory`, { headers: { cookie: admin.cookie } }).then((response) => response.json());
  const abebe = directory.students.find((student: { user: { username: string } }) => student.user.username === "abebe.kebede");
  const chaltu = directory.students.find((student: { user: { username: string } }) => student.user.username === "chaltu.megersa");
  const published = directory.semesters.find((semester: { nameEn: string; isPublished: boolean; academicYear: { nameEn: string } }) => semester.isPublished && semester.nameEn === "Semester 1" && semester.academicYear.nameEn.startsWith("2019"));
  const unpublished = directory.semesters.find((semester: { isPublished: boolean }) => !semester.isPublished);
  const grade5 = directory.sections.find((section: { grade: { name: string }; name: string }) => section.grade.name === "5" && section.name === "A");
  const english = directory.subjects.find((subject: { code: string; grade: { name: string } }) => subject.code === "ENG" && subject.grade.name === "5");
  const physics = directory.subjects.find((subject: { code: string; grade: { name: string }; stream: { nameEn: string } | null }) => subject.code === "PHY" && subject.grade.name === "9");
  const student = await openSession("abebe.kebede", "AB0001");
  const other = await fetch(`${base}/api/results/${chaltu.id}?semesterId=${published.id}`, { headers: { cookie: student.cookie } });
  check("student cannot read another student", other.status === 403, String(other.status));
  const self = await fetch(`${base}/api/results/${abebe.id}?semesterId=${published.id}`, { headers: { cookie: student.cookie } });
  const selfBody = await self.json();
  check("student can read own results", self.status === 200 && selfBody.fullName?.includes("Abebe"), JSON.stringify(selfBody).slice(0, 180));
  const hidden = await fetch(`${base}/api/results/${abebe.id}?semesterId=${unpublished.id}`, { headers: { cookie: student.cookie } });
  check("student cannot read unpublished semester", hidden.status === 403, String(hidden.status));
  const studentWrite = await fetch(`${base}/api/marks`, {
    method: "POST",
    headers: { cookie: student.cookie, "content-type": "application/json" },
    body: JSON.stringify({ semesterId: published.id, subjectId: english.id, sectionId: grade5.id, entries: [] }),
  });
  check("student cannot post marks", studentWrite.status === 403, String(studentWrite.status));
  const director = await login("director", "director123");
  const directorRead = await fetch(`${base}/api/results/${chaltu.id}?semesterId=${published.id}`, { headers: { cookie: director.cookie } });
  check("director can read any student", directorRead.status === 200, String(directorRead.status));
  const directorWrite = await fetch(`${base}/api/marks`, {
    method: "POST",
    headers: { cookie: director.cookie, "content-type": "application/json" },
    body: JSON.stringify({ semesterId: published.id, subjectId: english.id, sectionId: grade5.id, entries: [] }),
  });
  check("director cannot post marks", directorWrite.status === 403, String(directorWrite.status));
  const directorSettings = await fetch(`${base}/api/settings`, { method: "POST", headers: { cookie: director.cookie } });
  check("director cannot change settings", directorSettings.status === 403, String(directorSettings.status));
  const tigist = await openSession("tigist.bekele", "ABT001");
  const classWork = directory.components.find((component: { subjectId: string; nameEn: string }) => component.subjectId === english.id && component.nameEn === "Class work");
  const allowed = await fetch(`${base}/api/marks`, {
    method: "POST",
    headers: { cookie: tigist.cookie, "content-type": "application/json" },
    body: JSON.stringify({
      semesterId: published.id,
      subjectId: english.id,
      sectionId: grade5.id,
      entries: [{ studentId: abebe.id, componentId: classWork.id, score: 8 }],
    }),
  });
  check("assigned teacher can save a mark", allowed.status === 200, await allowed.text());
  const samuel = await openSession("samuel.desta", "ABT002");
  const denied = await fetch(`${base}/api/marks`, {
    method: "POST",
    headers: { cookie: samuel.cookie, "content-type": "application/json" },
    body: JSON.stringify({ semesterId: published.id, subjectId: english.id, sectionId: grade5.id, entries: [] }),
  });
  check("unassigned teacher cannot save marks", denied.status === 403, String(denied.status));
  const samuelOwn = await fetch(`${base}/api/marks`, {
    method: "POST",
    headers: { cookie: samuel.cookie, "content-type": "application/json" },
    body: JSON.stringify({ semesterId: published.id, subjectId: physics.id, sectionId: directory.sections.find((section: { grade: { name: string } }) => section.grade.name === "9").id, entries: [] }),
  });
  check("science teacher can open own subject", samuelOwn.status === 200, await samuelOwn.text());
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log("access checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
