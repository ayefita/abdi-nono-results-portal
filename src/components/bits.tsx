import { one } from "@/lib/form";

export function Notice({
  t,
  search,
  vars,
}: {
  t: (key: string, vars?: Record<string, string | number>) => string;
  search: Record<string, string | string[] | undefined>;
  vars?: Record<string, string | number>;
}) {
  const error = one(search.error);
  const ok = one(search.ok);
  if (!error && !ok) return null;
  return (
    <p className={error ? "alert toast" : "alert ok toast"} role={error ? "alert" : "status"}>
      {t(error || ok, vars)}
    </p>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function statusLabel(t: (key: string) => string, status: string) {
  if (status === "pass") return t("common.pass");
  if (status === "fail") return t("common.fail");
  if (status === "ACTIVE") return t("common.active");
  if (status === "GRADUATED") return t("common.graduated");
  if (status === "LEFT") return t("common.left");
  return t("common.incomplete");
}
