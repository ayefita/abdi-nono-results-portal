import { cache } from "react";
import { cookies } from "next/headers";
import en, { type Catalog } from "../../messages/en";
import om from "../../messages/om";
import am from "../../messages/am";
import { getSession } from "./session";

export const LANGUAGE_NAMES = [
  { code: "en", label: "English" },
  { code: "om", label: "Afaan Oromoo" },
  { code: "am", label: "አማርኛ" },
] as const;

export type Lang = (typeof LANGUAGE_NAMES)[number]["code"];

const dictionaries: Record<Lang, Catalog> = { en, om, am };

export function isLang(value: string | undefined | null): value is Lang {
  return value === "en" || value === "om" || value === "am";
}

function lookup(tree: unknown, key: string): string | undefined {
  let cursor: unknown = tree;
  for (const part of key.split(".")) {
    if (!cursor || typeof cursor !== "object" || !(part in cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return typeof cursor === "string" ? cursor : undefined;
}

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>) {
  let text = lookup(dictionaries[lang], key) ?? lookup(dictionaries.en, key) ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

export const getI18n = cache(async () => {
  const jar = await cookies();
  const session = await getSession();
  const preferred = session?.language;
  const cookieLang = jar.get("lang")?.value;
  const lang: Lang = isLang(preferred) ? preferred : isLang(cookieLang) ? cookieLang : "en";
  const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);
  return { lang, t };
});

export function flattenKeys(tree: unknown, prefix = ""): string[] {
  if (!tree || typeof tree !== "object") return prefix ? [prefix] : [];
  return Object.entries(tree as Record<string, unknown>).flatMap(([key, value]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") return flattenKeys(value, next);
    return [next];
  });
}
