export type MarkStatus = "pass" | "fail" | "incomplete";

export type ComponentScore = {
  componentId: string;
  maxScore: number;
  score: number | null;
};

export type GradeBand = { min: number; mark: string; letter: string };

export const DEFAULT_SCALE: GradeBand[] = [
  { min: 90, mark: "4", letter: "A" },
  { min: 80, mark: "3", letter: "B" },
  { min: 70, mark: "2", letter: "C" },
  { min: 50, mark: "1", letter: "D" },
  { min: 0, mark: "0", letter: "F" },
];

export function parseScale(value: unknown): GradeBand[] {
  if (!Array.isArray(value)) return DEFAULT_SCALE;
  const bands = value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as { min?: unknown; mark?: unknown; letter?: unknown };
      const min = Number(item.min);
      if (!Number.isFinite(min)) return null;
      return { min, mark: String(item.mark ?? ""), letter: String(item.letter ?? "") };
    })
    .filter((row): row is GradeBand => Boolean(row));
  return bands.length ? bands.sort((a, b) => b.min - a.min) : DEFAULT_SCALE;
}

export function scaleFromText(text: string): GradeBand[] {
  const bands = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [min, mark, letter] = line.split("|").map((part) => part.trim());
      return { min: Number(min), mark: mark || "", letter: letter || "" };
    })
    .filter((row) => Number.isFinite(row.min));
  return bands.length ? bands : DEFAULT_SCALE;
}

export function scaleToText(scale: GradeBand[]) {
  return [...scale].sort((a, b) => b.min - a.min).map((row) => `${row.min}|${row.mark}|${row.letter}`).join("\n");
}

export function bandFor(percent: number, scale: GradeBand[]) {
  const ordered = [...scale].sort((a, b) => b.min - a.min);
  return ordered.find((row) => percent + 1e-9 >= row.min) ?? ordered[ordered.length - 1];
}

export function inferKind(name: string) {
  const text = name.toLowerCase();
  if (text.includes("final")) return "final";
  if (text.includes("mid")) return "mid";
  if (text.includes("quiz")) return "quiz";
  if (text.includes("test")) return "test";
  if (text.includes("assign")) return "assignment";
  return "classwork";
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function calcSubject(components: ComponentScore[], passMark: number) {
  const max = components.reduce((sum, component) => sum + component.maxScore, 0);
  let total = 0;
  let filled = 0;
  for (const component of components) {
    if (component.score != null && !Number.isNaN(component.score)) {
      total += component.score;
      filled += 1;
    }
  }
  const complete = components.length > 0 && filled === components.length;
  const percent = max > 0 ? (total / max) * 100 : 0;
  const status: MarkStatus = !complete ? "incomplete" : percent + 1e-9 >= passMark ? "pass" : "fail";
  return { total: round2(total), max: round2(max), percent: round2(percent), complete, status, filled };
}

export function calcOverall(subjects: { status: MarkStatus; percent: number }[]) {
  if (subjects.length === 0) return { average: 0, overall: "incomplete" as MarkStatus };
  const average = round2(subjects.reduce((sum, subject) => sum + subject.percent, 0) / subjects.length);
  if (subjects.some((subject) => subject.status === "incomplete")) return { average, overall: "incomplete" as MarkStatus };
  if (subjects.some((subject) => subject.status === "fail")) return { average, overall: "fail" as MarkStatus };
  return { average, overall: "pass" as MarkStatus };
}

export function rankMap(rows: { id: string; average: number }[]) {
  const sorted = [...rows].sort((a, b) => b.average - a.average || a.id.localeCompare(b.id));
  const ranks = new Map<string, number>();
  let lastAverage = Number.NaN;
  let rank = 0;
  sorted.forEach((row, index) => {
    if (row.average !== lastAverage) {
      rank = index + 1;
      lastAverage = row.average;
    }
    ranks.set(row.id, rank);
  });
  return ranks;
}
