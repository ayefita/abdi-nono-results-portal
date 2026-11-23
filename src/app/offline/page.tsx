import { TopBar } from "@/components/chrome";
import { getI18n } from "@/lib/i18n";

export default async function OfflinePage() {
  const { t } = await getI18n();
  return (
    <>
      <TopBar session={null} showNav={false} />
      <main className="wrap">
        <h1>{t("offline.title")}</h1>
        <p>{t("offline.body")}</p>
      </main>
    </>
  );
}
