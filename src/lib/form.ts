import { redirect } from "next/navigation";

export function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function safePath(path: string, fallback = "/") {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return fallback;
  return path;
}

export function go(path: string, params?: Record<string, string | number | undefined>): never {
  const [base, existing] = path.split("?");
  const search = new URLSearchParams(existing || "");
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === "") search.delete(key);
      else search.set(key, String(value));
    }
  }
  const qs = search.toString();
  redirect(qs ? `${base}?${qs}` : base);
}

export function parseSex(value: string): "MALE" | "FEMALE" | null {
  const text = value.trim().toLowerCase();
  if (["m", "male", "dhiira", "ወንድ"].includes(text)) return "MALE";
  if (["f", "female", "dubartii", "ሴት"].includes(text)) return "FEMALE";
  return null;
}

export function prismaKey(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code: string }).code);
    if (code === "P2002") return "errors.duplicate";
    if (code === "P2003") return "errors.inUse";
  }
  return null;
}
