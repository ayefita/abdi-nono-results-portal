import { addisDate, toEthiopian } from "./calendar";
import { translate, type Lang } from "./i18n";

export function formatWhen(date: Date, lang: Lang, ethiopian: boolean) {
  const local = addisDate(date);
  const gregorian = new Intl.DateTimeFormat(lang === "am" ? "am-ET" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(local);
  if (!ethiopian) return gregorian;
  const eth = toEthiopian(local);
  const month = translate(lang, `calendar.m${eth.month}`);
  return `${gregorian} · ${eth.day} ${month} ${eth.year}`;
}

export function percentLabel(value: number) {
  return `${value.toFixed(1)}%`;
}
