// Ethiopian calendar conversion.
// Epoch 1724221 is Meskerem 1, year 1 on this JDN scale (29 August year 8, Julian).
// Checked against: 11 September 2005 = 1 Meskerem 1998,
// 11 September 2024 = 1 Meskerem 2017, 23 November 2026 = 14 Hidar 2019.
// New year is 11 September, or 12 September in the Gregorian year before a leap year.

const ETHIOPIC_EPOCH = 1724221;

function gregorianToJdn(year: number, month: number, day: number) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function yearStart(year: number) {
  return ETHIOPIC_EPOCH + 365 * (year - 1) + Math.floor(year / 4);
}

export type EthiopianDate = { year: number; month: number; day: number };

export function toEthiopian(date: Date): EthiopianDate {
  const jdn = gregorianToJdn(date.getFullYear(), date.getMonth() + 1, date.getDate());
  let year = Math.floor((4 * (jdn - ETHIOPIC_EPOCH) + 1463) / 1461);
  while (yearStart(year) > jdn) year -= 1;
  while (yearStart(year + 1) <= jdn) year += 1;
  const dayOfYear = jdn - yearStart(year);
  return { year, month: Math.floor(dayOfYear / 30) + 1, day: (dayOfYear % 30) + 1 };
}

export function addisDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(pick("year"), pick("month") - 1, pick("day"));
}
