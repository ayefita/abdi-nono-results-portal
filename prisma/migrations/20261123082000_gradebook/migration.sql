ALTER TABLE "SchoolSettings" ADD COLUMN "gradeScale" JSONB;
ALTER TABLE "SchoolSettings" ADD COLUMN "studentIdFormat" TEXT NOT NULL DEFAULT 'AB{seq:4}';
ALTER TABLE "SchoolSettings" ADD COLUMN "teacherIdFormat" TEXT NOT NULL DEFAULT 'ABT{seq:3}';
ALTER TABLE "SchoolSettings" ADD COLUMN "studentSeq" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SchoolSettings" ADD COLUMN "teacherSeq" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "staffCode" TEXT;
CREATE UNIQUE INDEX "User_staffCode_key" ON "User"("staffCode");

ALTER TABLE "AssessmentComponent" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'classwork';
ALTER TABLE "AssessmentComponent" ADD COLUMN "assessedOn" TIMESTAMP(3);
ALTER TABLE "AssessmentComponent" ADD COLUMN "isFormula" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AssessmentComponent" ADD COLUMN "formula" TEXT;

UPDATE "AssessmentComponent" SET "kind" = 'final' WHERE "nameEn" ILIKE '%final%';
UPDATE "AssessmentComponent" SET "kind" = 'mid' WHERE "nameEn" ILIKE '%mid%';
UPDATE "AssessmentComponent" SET "kind" = 'quiz' WHERE "kind" = 'classwork' AND "nameEn" ILIKE '%quiz%';
UPDATE "AssessmentComponent" SET "kind" = 'test' WHERE "kind" = 'classwork' AND "nameEn" ILIKE '%test%';
UPDATE "AssessmentComponent" SET "kind" = 'assignment' WHERE "kind" = 'classwork' AND "nameEn" ILIKE '%assign%';

CREATE TABLE "ReportComment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReportComment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportComment_studentId_semesterId_key" ON "ReportComment"("studentId", "semesterId");
ALTER TABLE "ReportComment" ADD CONSTRAINT "ReportComment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportComment" ADD CONSTRAINT "ReportComment_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;
