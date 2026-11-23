import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export function formatId(template: string, seq: number, year: string) {
  return template
    .replace(/\{seq:(\d+)\}/g, (_, width: string) => String(seq).padStart(Number(width), "0"))
    .replaceAll("{seq}", String(seq).padStart(4, "0"))
    .replaceAll("{year}", year || "");
}

export function yearToken(name: string | null | undefined) {
  const match = name?.match(/\d{4}/);
  return match?.[0] ?? String(new Date().getFullYear());
}

export async function previewId(kind: "student" | "teacher", year = "") {
  const settings = await prisma.schoolSettings.findUnique({ where: { id: "school" } });
  if (!settings) return kind === "student" ? "AB0001" : "ABT001";
  const seq = (kind === "student" ? settings.studentSeq : settings.teacherSeq) + 1;
  const template = kind === "student" ? settings.studentIdFormat : settings.teacherIdFormat;
  return formatId(template, seq, year);
}

export async function allocateId(tx: Prisma.TransactionClient, kind: "student" | "teacher", year: string) {
  await tx.$executeRaw`SELECT id FROM "SchoolSettings" WHERE id = 'school' FOR UPDATE`;
  const settings = await tx.schoolSettings.findUniqueOrThrow({ where: { id: "school" } });
  let seq = (kind === "student" ? settings.studentSeq : settings.teacherSeq) + 1;
  const template = kind === "student" ? settings.studentIdFormat : settings.teacherIdFormat;
  let code = formatId(template, seq, year);
  for (let guard = 0; guard < 100; guard += 1) {
    const taken =
      kind === "student"
        ? await tx.student.findFirst({ where: { studentCode: { equals: code, mode: "insensitive" } }, select: { id: true } })
        : await tx.user.findFirst({ where: { staffCode: { equals: code, mode: "insensitive" } }, select: { id: true } });
    if (!taken) break;
    seq += 1;
    code = formatId(template, seq, year);
  }
  await tx.schoolSettings.update({
    where: { id: "school" },
    data: kind === "student" ? { studentSeq: seq } : { teacherSeq: seq },
  });
  return code;
}
