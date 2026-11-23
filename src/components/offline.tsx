"use client";

import { useEffect, useState } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);
  return null;
}

export function OfflineBanner({ text }: { text: string }) {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (!offline) return null;
  return <p className="alert warn">{text}</p>;
}

export function PrintButton({ label }: { label: string }) {
  return (
    <button className="btn" type="button" onClick={() => window.print()}>
      {label}
    </button>
  );
}
