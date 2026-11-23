export type Lang = "en" | "om" | "am";

type Named = { nameEn: string; nameOm: string; nameAm: string };
type GradeLike = { name: string; nameOm: string; nameAm: string };

export function pick(lang: string, en: string, om: string, am: string) {
  if (lang === "om" && om.trim()) return om;
  if (lang === "am" && am.trim()) return am;
  return en;
}

export function localizedName(lang: string, row: Named) {
  return pick(lang, row.nameEn, row.nameOm, row.nameAm);
}

export function gradeLabel(lang: string, grade: GradeLike) {
  return pick(lang, grade.name, grade.nameOm || grade.name, grade.nameAm || grade.name);
}

export function schoolName(lang: string, settings: { nameEn: string; nameOm: string; nameAm: string }) {
  return pick(lang, settings.nameEn, settings.nameOm, settings.nameAm);
}
