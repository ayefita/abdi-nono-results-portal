import { getI18n } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { Field, Notice } from "@/components/bits";
import { saveSettings } from "@/server/school-actions";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t } = await getI18n();
  const settings = await getSettings();
  return (
    <>
      <h1>{t("settings.title")}</h1>
      <Notice t={t} search={await searchParams} />
      <form className="card grid-2" action={saveSettings}>
        <Field label={t("settings.nameEn")}><input name="nameEn" defaultValue={settings.nameEn} required /></Field>
        <Field label={t("settings.nameOm")}><input name="nameOm" defaultValue={settings.nameOm} required /></Field>
        <Field label={t("settings.nameAm")}><input name="nameAm" defaultValue={settings.nameAm} required /></Field>
        <Field label={t("settings.shortName")}><input name="shortName" defaultValue={settings.shortName} required /></Field>
        <Field label={t("settings.passMark")}><input name="passMark" type="number" min="0" max="100" step="0.5" defaultValue={settings.passMark} required /></Field>
        <Field label={t("ids.studentFormat")}><input name="studentIdFormat" defaultValue={settings.studentIdFormat} required /></Field>
        <Field label={t("ids.teacherFormat")}><input name="teacherIdFormat" defaultValue={settings.teacherIdFormat} required /></Field>
        <p className="lede">{t("ids.formatHint")}</p>
        <label className="check"><input type="checkbox" name="calendar" value="yes" defaultChecked={settings.showEthiopianCalendar} /> {t("settings.calendar")}</label>
        <p className="lede">{t("settings.calendarHint")}</p>
        <Field label={t("settings.logo")}><input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" /></Field>
        <p className="lede">{t("settings.logoHint")}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="settings-mark" src="/api/logo" alt="ANMPS" width={72} height={72} />
        <label className="check"><input type="checkbox" name="removeLogo" value="yes" /> {t("settings.removeLogo")}</label>
        <button className="btn primary" type="submit">{t("common.save")}</button>
      </form>
    </>
  );
}
