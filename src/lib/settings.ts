import { cache } from "react";
import { prisma } from "./prisma";

const fallback = {
  id: "school",
  nameEn: "Abdi Nono Model Primary School",
  nameOm: "Abdi Nono Model Primary School",
  nameAm: "Abdi Nono Model Primary School",
  shortName: "ANMPS",
  passMark: 50,
  showEthiopianCalendar: true,
  logoData: null as Uint8Array | null,
  logoMime: null as string | null,
  gradeScale: null as unknown,
  studentIdFormat: "AB{seq:4}",
  teacherIdFormat: "ABT{seq:3}",
  studentSeq: 0,
  teacherSeq: 0,
  updatedAt: new Date(0),
};

export const getSettings = cache(async () => {
  try {
    const row = await prisma.schoolSettings.findUnique({ where: { id: "school" } });
    if (row) return row;
  } catch {
    return fallback;
  }
  return fallback;
});
