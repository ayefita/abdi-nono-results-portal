export function asciiPart(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "")
    .toLowerCase();
}

export function baseUsername(firstName: string, fatherName: string, fallback = "") {
  const first = asciiPart(firstName);
  const father = asciiPart(fatherName);
  if (first && father) return `${first}.${father}`;
  return first || father || asciiPart(fallback) || "student";
}

export function uniqueUsername(base: string, taken: Set<string>) {
  const root = base || "student";
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}${n}`)) n += 1;
  return `${root}${n}`;
}

export function fullName(first: string, father: string, grandfather = "") {
  return [first, father, grandfather].map((p) => p.trim()).filter(Boolean).join(" ");
}
