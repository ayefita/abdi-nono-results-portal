import * as XLSX from "xlsx";

export function workbookBuffer(sheets: { name: string; rows: (string | number | null)[][] }[]) {
  const book = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const name = sheet.name.slice(0, 31);
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(sheet.rows), name);
  }
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function readTable(buffer: Buffer, filename: string) {
  const book = filename.toLowerCase().endsWith(".csv")
    ? XLSX.read(buffer.toString("utf8"), { type: "string" })
    : XLSX.read(buffer, { type: "buffer" });
  const sheet = book.Sheets[book.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
}

export function column(row: Record<string, unknown>, names: string[]) {
  const normalized = new Map(Object.entries(row).map(([key, value]) => [key.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"), String(value ?? "").trim()]));
  for (const name of names) {
    const value = normalized.get(name);
    if (value) return value;
  }
  return "";
}

export function studentTemplate() {
  return workbookBuffer([
    {
      name: "Students",
      rows: [
        ["student_id", "first_name", "father_name", "grandfather_name", "sex", "grade", "section", "stream"],
        ["EXAMPLE", "Delete", "This", "Row", "F", "5", "A", ""],
      ],
    },
  ]);
}
