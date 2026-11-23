import { PrismaClient, type Sex } from "@prisma/client";
import { hash } from "bcryptjs";
import { DEFAULT_COMPONENTS } from "../src/lib/defaults";

const prisma = new PrismaClient();

const subjectText = {
  ENG: { nameEn: "English", nameOm: "Afaan Ingilizii", nameAm: "እንግሊዝኛ" },
  MATH: { nameEn: "Mathematics", nameOm: "Herrega", nameAm: "ሒሳብ" },
  ENV: { nameEn: "Environmental Science", nameOm: "Saayinsii Naannoo", nameAm: "የአካባቢ ሳይንስ" },
  ORM: { nameEn: "Afaan Oromoo", nameOm: "Afaan Oromoo", nameAm: "አፋን ኦሮሞ" },
  SOC: { nameEn: "Social Studies", nameOm: "Qorannoo Hawaasaa", nameAm: "ማኅበራዊ ጥናት" },
  SCI: { nameEn: "General Science", nameOm: "Saayinsii Waliigalaa", nameAm: "አጠቃላይ ሳይንስ" },
  PHY: { nameEn: "Physics", nameOm: "Fiiziksii", nameAm: "ፊዚክስ" },
  CHE: { nameEn: "Chemistry", nameOm: "Keemistirii", nameAm: "ኬሚስትሪ" },
  BIO: { nameEn: "Biology", nameOm: "Baayoloojii", nameAm: "ባዮሎጂ" },
  GEO: { nameEn: "Geography", nameOm: "Ji'ograafii", nameAm: "ጂኦግራፊ" },
  HIS: { nameEn: "History", nameOm: "Seenaa", nameAm: "ታሪክ" },
  ECO: { nameEn: "Economics", nameOm: "Ikonomiksii", nameAm: "ኢኮኖሚክስ" },
} as const;

type Code = keyof typeof subjectText;

const students: { code: string; first: string; father: string; grand: string; sex: Sex; grade: string; section: string; stream: string | null; prev: string }[] = [
  { code: "AB0001", first: "Abebe", father: "Kebede", grand: "Tadesse", sex: "MALE", grade: "5", section: "A", stream: null, prev: "4" },
  { code: "AB0002", first: "Chaltu", father: "Megersa", grand: "Daba", sex: "FEMALE", grade: "5", section: "A", stream: null, prev: "4" },
  { code: "AB0003", first: "Dawit", father: "Lemma", grand: "Bekele", sex: "MALE", grade: "5", section: "A", stream: null, prev: "4" },
  { code: "AB0004", first: "Hana", father: "Tadesse", grand: "Alemu", sex: "FEMALE", grade: "5", section: "A", stream: null, prev: "4" },
  { code: "AB0005", first: "Kebede", father: "Abera", grand: "Tolosa", sex: "MALE", grade: "9", section: "A", stream: null, prev: "8" },
  { code: "AB0006", first: "Lensa", father: "Fikadu", grand: "Gemechu", sex: "FEMALE", grade: "9", section: "A", stream: null, prev: "8" },
  { code: "AB0007", first: "Mohammed", father: "Ahmed", grand: "Ali", sex: "MALE", grade: "9", section: "A", stream: null, prev: "8" },
  { code: "AB0008", first: "Sara", father: "Bekele", grand: "Desta", sex: "FEMALE", grade: "9", section: "A", stream: null, prev: "8" },
  { code: "AB0009", first: "Tolosa", father: "Gemechu", grand: "Abebe", sex: "MALE", grade: "11", section: "A", stream: "Natural", prev: "10" },
  { code: "AB0010", first: "Bontu", father: "Hailu", grand: "Negash", sex: "FEMALE", grade: "11", section: "A", stream: "Natural", prev: "10" },
  { code: "AB0011", first: "Yonas", father: "Tesfaye", grand: "Mekonnen", sex: "MALE", grade: "11", section: "B", stream: "Social", prev: "10" },
  { code: "AB0012", first: "Meron", father: "Alemu", grand: "Worku", sex: "FEMALE", grade: "11", section: "B", stream: "Social", prev: "10" },
];

function markFor(index: number, subjectIndex: number, max: number, salt: number) {
  const bases = [0.9, 0.78, 0.42, 0.7, 0.86, 0.63, 0.8, 0.94, 0.73, 0.84, 0.55, 0.88];
  const jitter = ((index * 5 + subjectIndex * 3 + salt) % 9) - 4;
  const percent = Math.min(0.99, Math.max(0.15, bases[index % bases.length] + jitter / 100));
  return Math.max(0, Math.min(max, Math.round(percent * max)));
}

async function main() {
  if ((await prisma.user.count()) > 0 && process.env.SEED_FORCE !== "1") {
    console.log("Seed skipped because users already exist. Set SEED_FORCE=1 to rebuild demo data.");
    return;
  }
  if (process.env.SEED_FORCE === "1") {
    await prisma.mark.deleteMany();
    await prisma.teacherAssignment.deleteMany();
    await prisma.placement.deleteMany();
    await prisma.assessmentComponent.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.importBatch.deleteMany();
    await prisma.syncLog.deleteMany();
    await prisma.tombstone.deleteMany();
    await prisma.semester.deleteMany();
    await prisma.academicYear.deleteMany();
    await prisma.student.deleteMany();
    await prisma.teacher.deleteMany();
    await prisma.user.deleteMany();
    await prisma.stream.deleteMany();
    await prisma.section.deleteMany();
    await prisma.grade.deleteMany();
    await prisma.schoolSettings.deleteMany();
  }

  await prisma.schoolSettings.create({
    data: {
      id: "school",
      nameEn: "Abdi Nono Model Primary School",
      nameOm: "Abdi Nono Model Primary School",
      nameAm: "Abdi Nono Model Primary School",
      shortName: "ABDI NONO",
      passMark: 50,
      showEthiopianCalendar: true,
      studentIdFormat: "AB{seq:4}",
      teacherIdFormat: "ABT{seq:3}",
      studentSeq: 12,
      teacherSeq: 2,
    },
  });

  const gradeNames = ["KG", ...Array.from({ length: 12 }, (_, index) => String(index + 1))];
  const gradeIds = new Map<string, string>();
  for (const [index, name] of gradeNames.entries()) {
    const grade = await prisma.grade.create({
      data: { name, nameOm: name === "KG" ? "KG" : name, nameAm: name === "KG" ? "ኪጂ" : name, sortOrder: index },
    });
    gradeIds.set(name, grade.id);
  }
  for (let index = 0; index < gradeNames.length - 1; index += 1) {
    await prisma.grade.update({ where: { id: gradeIds.get(gradeNames[index]) }, data: { nextGradeId: gradeIds.get(gradeNames[index + 1]) } });
  }

  const sectionKey = (grade: string, name: string) => `${grade}:${name}`;
  const sectionIds = new Map<string, string>();
  for (const item of [
    ["4", "A"],
    ["5", "A"],
    ["8", "A"],
    ["9", "A"],
    ["10", "A"],
    ["11", "A"],
    ["11", "B"],
  ] as const) {
    const section = await prisma.section.create({ data: { gradeId: gradeIds.get(item[0])!, name: item[1] } });
    sectionIds.set(sectionKey(item[0], item[1]), section.id);
  }

  const natural = await prisma.stream.create({ data: { gradeId: gradeIds.get("11")!, nameEn: "Natural", nameOm: "Uumamaa", nameAm: "ናቹራል" } });
  const social = await prisma.stream.create({ data: { gradeId: gradeIds.get("11")!, nameEn: "Social", nameOm: "Hawaasummaa", nameAm: "ሶሻል" } });
  const streamIds = new Map<string, string>([["Natural", natural.id], ["Social", social.id]]);

  const plans: { grade: string; stream?: string; codes: Code[] }[] = [
    { grade: "4", codes: ["ENG", "MATH", "ENV"] },
    { grade: "5", codes: ["ENG", "MATH", "ENV", "ORM", "SOC"] },
    { grade: "8", codes: ["ENG", "MATH", "SCI"] },
    { grade: "9", codes: ["ENG", "MATH", "PHY", "CHE", "BIO", "GEO"] },
    { grade: "10", codes: ["ENG", "MATH", "PHY"] },
    { grade: "11", stream: "Natural", codes: ["MATH", "ENG", "PHY", "CHE", "BIO"] },
    { grade: "11", stream: "Social", codes: ["MATH", "ENG", "HIS", "GEO", "ECO"] },
  ];

  const subjectIds = new Map<string, { id: string; components: { id: string; nameEn: string; maxScore: number }[] }>();
  for (const plan of plans) {
    for (const [order, code] of plan.codes.entries()) {
      const subject = await prisma.subject.create({
        data: {
          gradeId: gradeIds.get(plan.grade)!,
          streamId: plan.stream ? streamIds.get(plan.stream)! : null,
          code,
          sortOrder: order + 1,
          ...subjectText[code],
        },
      });
      await prisma.assessmentComponent.createMany({ data: DEFAULT_COMPONENTS.map((component) => ({ ...component, subjectId: subject.id })) });
      const components = await prisma.assessmentComponent.findMany({ where: { subjectId: subject.id }, orderBy: { sortOrder: "asc" } });
      subjectIds.set(`${plan.grade}:${plan.stream ?? ""}:${code}`, { id: subject.id, components });
    }
  }

  const year2018 = await prisma.academicYear.create({
    data: { nameEn: "2018 E.C. (2025/26)", nameOm: "Bara 2018 A.L.O. (2025/26)", nameAm: "2018 ዓ.ም (2025/26)", startDate: new Date("2025-09-11"), endDate: new Date("2026-09-10"), isCurrent: false },
  });
  const year2019 = await prisma.academicYear.create({
    data: { nameEn: "2019 E.C. (2026/27)", nameOm: "Bara 2019 A.L.O. (2026/27)", nameAm: "2019 ዓ.ም (2026/27)", startDate: new Date("2026-09-11"), endDate: new Date("2027-09-11"), isCurrent: true },
  });
  const sem = async (yearId: string, name: string, order: number, published: boolean) =>
    prisma.semester.create({
      data: { academicYearId: yearId, nameEn: `Semester ${name}`, nameOm: `Semistarrii ${name}`, nameAm: `ሴሚስተር ${name}`, sortOrder: order, isPublished: published },
    });
  const s18a = await sem(year2018.id, "1", 1, true);
  const s18b = await sem(year2018.id, "2", 2, true);
  const s19a = await sem(year2019.id, "1", 1, true);
  await sem(year2019.id, "2", 2, false);

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 8) {
    throw new Error("Set SEED_ADMIN_PASSWORD to at least 8 characters before seeding.");
  }
  const adminHash = await hash(adminPassword, 10);
  const directorHash = await hash("director123", 10);
  const tigistHash = await hash("ABT001", 10);
  const samuelHash = await hash("ABT002", 10);
  await prisma.user.create({ data: { username: "admin", passwordHash: adminHash, role: "ADMIN", fullName: "Abdi Nono Admin", firstName: "Abdi", fatherName: "Nono" } });
  await prisma.user.create({ data: { username: "director", passwordHash: directorHash, role: "DIRECTOR", fullName: "Diriba Gemechu", firstName: "Diriba", fatherName: "Gemechu", sex: "MALE" } });
  const tigistUser = await prisma.user.create({ data: { username: "tigist.bekele", passwordHash: tigistHash, role: "TEACHER", fullName: "Tigist Bekele", firstName: "Tigist", fatherName: "Bekele", sex: "FEMALE", phone: "0911000001", staffCode: "ABT001", mustChangePassword: true } });
  const samuelUser = await prisma.user.create({ data: { username: "samuel.desta", passwordHash: samuelHash, role: "TEACHER", fullName: "Samuel Desta", firstName: "Samuel", fatherName: "Desta", sex: "MALE", phone: "0911000002", staffCode: "ABT002", mustChangePassword: true } });
  const tigist = await prisma.teacher.create({ data: { userId: tigistUser.id } });
  const samuel = await prisma.teacher.create({ data: { userId: samuelUser.id } });

  for (const code of ["ENG", "MATH", "ENV", "ORM", "SOC"] as Code[]) {
    const subject = subjectIds.get(`5::${code}`)!;
    await prisma.teacherAssignment.create({ data: { teacherId: tigist.id, subjectId: subject.id, sectionId: sectionIds.get("5:A")!, academicYearId: year2019.id } });
  }
  for (const code of ["PHY", "CHE", "BIO"] as Code[]) {
    const grade9 = subjectIds.get(`9::${code}`)!;
    const grade11 = subjectIds.get(`11:Natural:${code}`)!;
    await prisma.teacherAssignment.create({ data: { teacherId: samuel.id, subjectId: grade9.id, sectionId: sectionIds.get("9:A")!, academicYearId: year2019.id } });
    await prisma.teacherAssignment.create({ data: { teacherId: samuel.id, subjectId: grade11.id, sectionId: sectionIds.get("11:A")!, academicYearId: year2019.id } });
  }

  for (const [index, person] of students.entries()) {
    const passwordHash = await hash(person.code, 10);
    const name = `${person.first} ${person.father} ${person.grand}`;
    const user = await prisma.user.create({
      data: {
        username: `${person.first}.${person.father}`.toLowerCase(),
        passwordHash,
        role: "STUDENT",
        fullName: name,
        firstName: person.first,
        fatherName: person.father,
        sex: person.sex,
        mustChangePassword: true,
      },
    });
    const student = await prisma.student.create({
      data: { userId: user.id, studentCode: person.code, firstName: person.first, fatherName: person.father, grandfatherName: person.grand, sex: person.sex },
    });
    const current = await prisma.placement.create({
      data: {
        studentId: student.id,
        academicYearId: year2019.id,
        gradeId: gradeIds.get(person.grade)!,
        sectionId: sectionIds.get(sectionKey(person.grade, person.section))!,
        streamId: person.stream ? streamIds.get(person.stream)! : null,
      },
    });
    const previous = await prisma.placement.create({
      data: {
        studentId: student.id,
        academicYearId: year2018.id,
        gradeId: gradeIds.get(person.prev)!,
        sectionId: sectionIds.get(sectionKey(person.prev, "A"))!,
      },
    });
    await writeMarks(index, person.grade, person.stream, current.id, student.id, s19a.id, 2, adminUserId(tigistUser.id));
    await writeMarks(index, person.prev, null, previous.id, student.id, s18a.id, 1, tigistUser.id);
    await writeMarks(index, person.prev, null, previous.id, student.id, s18b.id, 4, tigistUser.id);
  }

  async function writeMarks(index: number, grade: string, stream: string | null, _placementId: string, studentId: string, semesterId: string, salt: number, enteredById: string) {
    const prefix = `${grade}:${stream ?? ""}:`;
    const subjects = [...subjectIds.entries()].filter(([key]) => key.startsWith(prefix));
    for (const [subjectIndex, [, subject]] of subjects.entries()) {
      const code = [...subjectIds.entries()].find(([, value]) => value.id === subject.id)?.[0] ?? "";
      const isGeo2019 = grade === "9" && code.endsWith(":GEO") && semesterId === s19a.id;
      if (isGeo2019) continue;
      for (const component of subject.components) {
        const skipFinal = grade === "11" && semesterId === s19a.id && component.nameEn === "Final exam";
        if (skipFinal) continue;
        await prisma.mark.create({
          data: {
            studentId,
            subjectId: subject.id,
            semesterId,
            componentId: component.id,
            score: markFor(index, subjectIndex, component.maxScore, salt),
            enteredById,
          },
        });
      }
    }
  }

  console.log("Seeded Abdi Nono Model Primary School.");
  console.log("admin / (value of SEED_ADMIN_PASSWORD)");
  console.log("director / director123");
  console.log("tigist.bekele / ABT001");
  console.log("samuel.desta / ABT002");
  console.log("abebe.kebede / AB0001");
}

function adminUserId(id: string) {
  return id;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
