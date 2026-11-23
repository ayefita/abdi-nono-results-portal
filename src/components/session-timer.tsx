"use client";

import { useEffect } from "react";

const IDLE_MS = 30 * 60 * 1000;
const PING_MS = 5 * 60 * 1000;
const KEY = "anmps-last-activity";

// Logs the user out after 30 minutes with no activity, and keeps the server session
// alive while the user is working on one page (for example typing marks).
export function SessionTimer() {
  useEffect(() => {
    let lastPing = Date.now();
    let done = false;
    const now = () => Date.now();
    const stamp = () => {
      try {
        localStorage.setItem(KEY, String(now()));
      } catch {}
    };
    const lastActivity = () => {
      try {
        return Number(localStorage.getItem(KEY)) || now();
      } catch {
        return now();
      }
    };
    const expire = async () => {
      if (done) return;
      done = true;
      try {
        await fetch("/api/logout", { method: "POST" });
      } catch {}
      window.location.href = "/login?error=auth.expired";
    };
    const ping = async () => {
      lastPing = now();
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        if (response.status === 401) expire();
      } catch {
        // Offline: keep working; the server checks again when the network is back.
      }
    };
    const onActivity = () => {
      stamp();
      if (now() - lastPing > PING_MS && navigator.onLine) ping();
    };
    stamp();
    const events = ["pointerdown", "keydown", "scroll", "touchstart", "input"] as const;
    for (const name of events) window.addEventListener(name, onActivity, { passive: true });
    const timer = window.setInterval(() => {
      if (now() - lastActivity() >= IDLE_MS) expire();
    }, 15_000);
    return () => {
      window.clearInterval(timer);
      for (const name of events) window.removeEventListener(name, onActivity);
    };
  }, []);
  return null;
}
