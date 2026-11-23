import { headers } from "next/headers";
import { getI18n, LANGUAGE_NAMES } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { schoolName } from "@/lib/labels";
import { formatWhen } from "@/lib/format";
import { homeFor, type Role, type Session } from "@/lib/types";
import { logoutAction, setLanguage } from "@/server/auth-actions";
import { SessionTimer } from "./session-timer";

const NAV: Record<Role, [string, string, string][]> = {
  ADMIN: [
    ["/admin", "nav.dashboard", "home"],
    ["/admin/students", "nav.students", "students"],
    ["/admin/teachers", "nav.teachers", "teachers"],
    ["/admin/directors", "nav.directors", "director"],
    ["/admin/grades", "nav.grades", "grades"],
    ["/admin/subjects", "nav.subjects", "subjects"],
    ["/admin/years", "nav.years", "years"],
    ["/admin/components", "nav.components", "marks"],
    ["/admin/assignments", "nav.assignments", "assign"],
    ["/admin/marks", "nav.marks", "marks"],
    ["/admin/reports", "nav.report", "report"],
    ["/admin/promotion", "nav.promotion", "promote"],
    ["/admin/credentials", "nav.credentials", "key"],
    ["/admin/settings", "nav.settings", "settings"],
    ["/admin/backup", "nav.backup", "backup"],
  ],
  TEACHER: [
    ["/teacher", "nav.dashboard", "home"],
    ["/teacher/marks", "nav.marks", "marks"],
    ["/teacher/reports", "nav.report", "report"],
  ],
  STUDENT: [
    ["/student", "nav.results", "results"],
    ["/student/report", "nav.report", "report"],
  ],
  DIRECTOR: [
    ["/director", "nav.reports", "reports"],
    ["/director/cards", "nav.report", "report"],
  ],
};

const BOTTOM: Record<Role, [string, string, string][]> = {
  ADMIN: [
    ["/admin", "nav.dashboard", "home"],
    ["/admin/students", "nav.students", "students"],
    ["/admin/marks", "nav.marks", "marks"],
  ],
  TEACHER: [
    ["/teacher", "nav.dashboard", "home"],
    ["/teacher/marks", "nav.marks", "marks"],
  ],
  STUDENT: [
    ["/student", "nav.results", "results"],
    ["/student/report", "nav.report", "report"],
  ],
  DIRECTOR: [["/director", "nav.reports", "reports"]],
};

function active(href: string, path: string) {
  const bare = path.split("?")[0];
  if (href === "/admin" || href === "/teacher" || href === "/student" || href === "/director") return bare === href;
  return bare === href || bare.startsWith(`${href}/`);
}

function Glyph({ name }: { name: string }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, "aria-hidden": true } as const;
  if (name === "students") return <svg {...common}><circle cx="9" cy="8" r="3" /><circle cx="16" cy="9" r="2.2" /><path d="M3.5 18c.6-2.6 2.8-4 5.5-4s4.9 1.4 5.5 4M14 14.2c1.6-.3 3.2.2 4.3 1.8" /></svg>;
  if (name === "teachers") return <svg {...common}><circle cx="12" cy="8" r="3" /><path d="M5 19c.8-3 3.2-4.5 7-4.5S18.2 16 19 19" /></svg>;
  if (name === "marks") return <svg {...common}><path d="M5 19V9M10 19V5M15 19v-7M20 19V8" /></svg>;
  if (name === "reports") return <svg {...common}><path d="M5 19V10M10 19V6M15 19v-4M20 19V8" /><path d="M4 19h16" /></svg>;
  if (name === "results") return <svg {...common}><path d="M7 15l3-4 3 2 4-6" /><circle cx="7" cy="15" r="1.2" fill="currentColor" /><circle cx="17" cy="7" r="1.2" fill="currentColor" /></svg>;
  if (name === "report") return <svg {...common}><path d="M7 4h7l4 4v12H7z" /><path d="M14 4v4h4M9 12h6M9 16h4" /></svg>;
  if (name === "home") return <svg {...common}><path d="M4 11.5 12 5l8 6.5V20H4z" /><path d="M10 20v-6h4v6" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="7" /><path d="M12 8v4l2.5 1.5" /></svg>;
}

export function SchoolMark({ size = 72, className = "school-mark" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src="/api/logo" alt="ANMPS" width={size} height={size} />
  );
}

export function Hero({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) {
  return (
    <section className="hero">
      <SchoolMark size={72} className="hero-mark" />
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {text ? <p>{text}</p> : null}
      </div>
    </section>
  );
}

export async function TopBar({ session }: { session: Session | null; showNav?: boolean }) {
  const { t, lang } = await getI18n();
  const settings = await getSettings();
  const path = (await headers()).get("x-pathname") || (session ? homeFor(session.role) : "/login");
  const name = schoolName(lang, settings);
  return (
    <header className="topbar login-top">
      <div className="wrap">
        <div className="top-row">
          <a className="brand" href={session ? homeFor(session.role) : "/login"}>
            <SchoolMark size={46} className="brand-mark" />
            <span>
              <strong>{name}</strong>
            </span>
          </a>
          <form action={setLanguage} className="langs">
            <input type="hidden" name="next" value={path} />
            {LANGUAGE_NAMES.map((item) => (
              <button key={item.code} name="lang" value={item.code} type="submit" aria-current={item.code === lang ? "true" : undefined}>
                {item.label}
              </button>
            ))}
          </form>
        </div>
        {settings.showEthiopianCalendar ? <p className="date-line">{t("app.today")}: {formatWhen(new Date(), lang, true)}</p> : null}
      </div>
    </header>
  );
}

export async function Shell({ session, children }: { session: Session; children: React.ReactNode }) {
  const { t, lang } = await getI18n();
  const settings = await getSettings();
  const path = (await headers()).get("x-pathname") || homeFor(session.role);
  const name = schoolName(lang, settings);
  const links = NAV[session.role];
  return (
    <div className="app-shell">
      <SessionTimer />
      <input id="nav-toggle" className="nav-check" type="checkbox" />
      <header className="topbar">
        <label className="nav-label" htmlFor="nav-toggle">{t("nav.menu")}</label>
        <a className="brand" href={homeFor(session.role)}>
          <SchoolMark size={42} className="brand-mark" />
          <span>
            <strong className="brand-title">{name}</strong>
          </span>
        </a>
        <form action={setLanguage} className="langs">
          <input type="hidden" name="next" value={path} />
          {LANGUAGE_NAMES.map((item) => (
            <button key={item.code} name="lang" value={item.code} type="submit" aria-current={item.code === lang ? "true" : undefined}>
              {item.label}
            </button>
          ))}
        </form>
      </header>
      <aside className="sidebar">
        <SchoolMark size={64} className="side-mark" />
        <p className="side-school">{name}</p>
        {settings.showEthiopianCalendar ? <p className="side-date">{formatWhen(new Date(), lang, true)}</p> : null}
        <nav>
          {links.map(([href, key, icon]) => (
            <a key={href} href={href} className={active(href, path) ? "active" : undefined}>
              <Glyph name={icon} />
              <span>{t(key)}</span>
            </a>
          ))}
        </nav>
        <form action={logoutAction}>
          <button type="submit">{t("nav.logout")}</button>
        </form>
      </aside>
      <label className="nav-backdrop" htmlFor="nav-toggle" aria-hidden="true" />
      <div className="app-main">
        <main className="wrap">{children}</main>
        <nav className="bottom-nav" aria-label={t("nav.menu")}>
          {BOTTOM[session.role].map(([href, key, icon]) => (
            <a key={href} href={href} className={active(href, path) ? "active" : undefined}>
              <Glyph name={icon} />
              <span>{t(key)}</span>
            </a>
          ))}
          <label htmlFor="nav-toggle">
            <Glyph name="home" />
            <span>{t("nav.menu")}</span>
          </label>
        </nav>
      </div>
    </div>
  );
}
