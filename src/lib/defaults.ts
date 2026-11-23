export const DEFAULT_COMPONENTS = [
  { nameEn: "Class work", nameOm: "Hojii daree", nameAm: "የክፍል ስራ", maxScore: 10, sortOrder: 1, kind: "classwork" },
  { nameEn: "Assignment", nameOm: "Hojii manaa", nameAm: "የቤት ስራ", maxScore: 10, sortOrder: 2, kind: "assignment" },
  { nameEn: "Quiz", nameOm: "Qormaata gabaabaa", nameAm: "አጭር ፈተና", maxScore: 10, sortOrder: 3, kind: "quiz" },
  { nameEn: "Test", nameOm: "Qormaata", nameAm: "ሙከራ", maxScore: 10, sortOrder: 4, kind: "test" },
  { nameEn: "Mid exam", nameOm: "Qormaata gidduu", nameAm: "የመሃል ፈተና", maxScore: 20, sortOrder: 5, kind: "mid" },
  { nameEn: "Final exam", nameOm: "Qormaata xumuraa", nameAm: "የመጨረሻ ፈተና", maxScore: 40, sortOrder: 6, kind: "final" },
] as const;

export function componentCreate(subjectId: string) {
  return DEFAULT_COMPONENTS.map((component) => ({ ...component, subjectId }));
}
