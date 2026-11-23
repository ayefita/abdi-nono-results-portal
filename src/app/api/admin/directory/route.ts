import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSession } from "@/lib/api";

export async function GET() {
  const { session, response } = await apiSession(["ADMIN"]);
  if (!session) return response;
  const [students, subjects, sections, semesters, teachers, components] = await Promise.all([
    prisma.student.findMany({ select: { id: true, studentCode: true, user: { select: { username: true } } } }),
    prisma.subject.findMany({ select: { id: true, code: true, nameEn: true, grade: { select: { name: true } }, stream: { select: { nameEn: true } } } }),
    prisma.section.findMany({ select: { id: true, name: true, grade: { select: { name: true } } } }),
    prisma.semester.findMany({ select: { id: true, nameEn: true, isPublished: true, academicYear: { select: { nameEn: true } } } }),
    prisma.teacher.findMany({ select: { id: true, user: { select: { username: true } } } }),
    prisma.assessmentComponent.findMany({ select: { id: true, subjectId: true, nameEn: true } }),
  ]);
  return NextResponse.json({ students, subjects, sections, semesters, teachers, components });
}
