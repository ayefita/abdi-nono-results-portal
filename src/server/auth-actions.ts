"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth-token";
import { authenticate, changePassword, getSession } from "@/lib/session";
import { field, go, safePath } from "@/lib/form";
import { homeFor } from "@/lib/types";
import { isLang } from "@/lib/i18n";

export async function loginAction(formData: FormData) {
  const result = await authenticate(field(formData, "username"), field(formData, "password"));
  if (!result.ok) go("/login", { error: result.error });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, result.token, sessionCookieOptions());
  if (isLang(result.language)) jar.set("lang", result.language, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  if (result.mustChangePassword) redirect("/change-password");
  redirect(homeFor(result.role));
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function changePasswordAction(formData: FormData) {
  const jar = await cookies();
  const session = await getSession();
  if (!session) redirect("/login");
  const next = field(formData, "next");
  const confirm = field(formData, "confirm");
  if (next !== confirm) go("/change-password", { error: "errors.passwordMismatch" });
  const result = await changePassword(session.userId, field(formData, "current"), next);
  if (!result.ok) go("/change-password", { error: result.error });
  jar.set(SESSION_COOKIE, result.token, sessionCookieOptions());
  redirect(homeFor(result.role));
}

export async function setLanguage(formData: FormData) {
  const lang = field(formData, "lang");
  if (!isLang(lang)) return;
  const jar = await cookies();
  jar.set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const session = await getSession();
  if (session) await prisma.user.update({ where: { id: session.userId }, data: { preferredLanguage: lang } });
  const headerList = await headers();
  const next = safePath(field(formData, "next") || headerList.get("x-pathname") || "/", "/");
  redirect(next);
}
