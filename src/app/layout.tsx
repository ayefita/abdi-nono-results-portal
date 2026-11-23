import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorker } from "@/components/offline";
import { getI18n } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const name = settings.nameEn || "Abdi Nono Model Primary School";
  return {
    title: { default: name, template: `%s · ${name}` },
    description: `${name} student results`,
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { url: "/logo.svg", type: "image/svg+xml" },
      ],
    },
    other: { google: "notranslate" },
    appleWebApp: { capable: true, title: "ANMPS", statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  themeColor: "#083c2b",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang } = await getI18n();
  return (
    <html lang={lang} translate="no" className="notranslate">
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
