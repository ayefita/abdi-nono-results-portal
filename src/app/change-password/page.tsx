import { redirect } from "next/navigation";
import { SchoolMark, TopBar } from "@/components/chrome";
import { Field, Notice } from "@/components/bits";
import { getI18n } from "@/lib/i18n";
import { getSession } from "@/lib/session";
import { changePasswordAction, logoutAction } from "@/server/auth-actions";

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { t } = await getI18n();
  const search = await searchParams;
  return (
    <>
      <TopBar session={session} showNav={false} />
      <main className="wrap">
        <section className="card login-card">
          <SchoolMark size={96} className="login-mark" />
          <h1>{t("change.title")}</h1>
          <p className="lede">{t("auth.mustChange")}</p>
          <p className="lede">{t("change.hint")}</p>
          <Notice t={t} search={search} />
          <form action={changePasswordAction}>
            <Field label={t("auth.currentPassword")}>
              <input name="current" type="password" autoComplete="current-password" required />
            </Field>
            <Field label={t("auth.newPassword")}>
              <input name="next" type="password" autoComplete="new-password" minLength={8} required />
            </Field>
            <Field label={t("auth.confirmPassword")}>
              <input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
            </Field>
            <button className="btn primary" type="submit">{t("auth.changePassword")}</button>
          </form>
          <form action={logoutAction}>
            <button className="btn" type="submit">{t("auth.logout")}</button>
          </form>
        </section>
      </main>
    </>
  );
}
