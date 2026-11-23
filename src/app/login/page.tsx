import { redirect } from "next/navigation";
import { SchoolMark, TopBar } from "@/components/chrome";
import { Field, Notice } from "@/components/bits";
import { getI18n } from "@/lib/i18n";
import { getSession } from "@/lib/session";
import { homeFor } from "@/lib/types";
import { loginAction } from "@/server/auth-actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession();
  if (session && !session.mustChangePassword) redirect(homeFor(session.role));
  if (session?.mustChangePassword) redirect("/change-password");
  const { t } = await getI18n();
  const search = await searchParams;
  const demo = process.env.DEMO_HINTS === "true";
  return (
    <>
      <TopBar session={null} showNav={false} />
      <main className="wrap">
        <section className="card login-card">
          <SchoolMark size={96} className="login-mark" />
          <h1>{t("auth.login")}</h1>
          <p className="lede">{t("app.tagline")}</p>
          <Notice t={t} search={search} />
          <form action={loginAction}>
            <Field label={t("auth.username")}>
              <input name="username" autoComplete="username" required />
            </Field>
            <Field label={t("auth.password")}>
              <input name="password" type="password" autoComplete="current-password" required />
            </Field>
            <button className="btn primary" type="submit">{t("auth.submit")}</button>
          </form>
          {demo ? (
            <div className="demo">
              <strong>{t("auth.demoTitle")}</strong>
              <p>{t("auth.demoNote")}</p>
              <p>admin / the SEED_ADMIN_PASSWORD you chose</p>
              <p>director / director123</p>
              <p>tigist.bekele / ABT001</p>
              <p>samuel.desta / ABT002</p>
              <p>abebe.kebede / AB0001</p>
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
