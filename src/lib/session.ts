import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { SESSION_COOKIE, readToken, signSession } from "./auth-token";
import { hashPassword, verifyPassword } from "./password";
import { homeFor, type Role, type Session } from "./types";

export const getSession = cache(async (): Promise<Session | null> => {
  const jar = await cookies();
  const token = await readToken(jar.get(SESSION_COOKIE)?.value);
  if (!token) return null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: token.sub },
      include: { student: { select: { id: true } }, teacher: { select: { id: true } } },
    });
    if (!user || user.tokenVersion !== token.tv || user.role !== token.role) return null;
    return {
      userId: user.id,
      role: user.role,
      fullName: user.fullName,
      username: user.username,
      studentId: user.student?.id ?? null,
      teacherId: user.teacher?.id ?? null,
      mustChangePassword: user.mustChangePassword,
      language: user.preferredLanguage,
    };
  } catch {
    return null;
  }
});

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.mustChangePassword) redirect("/change-password");
  return session;
}

export async function requireRole(role: Role) {
  const session = await requireUser();
  if (session.role !== role) redirect(homeFor(session.role));
  return session;
}

export async function authenticate(username: string, password: string) {
  const key = username.trim();
  const byName = await prisma.user.findFirst({
    where: { username: { equals: key, mode: "insensitive" } },
    include: { student: { select: { id: true } }, teacher: { select: { id: true } } },
  });
  const user =
    byName ??
    (
      await prisma.student.findFirst({
        where: { studentCode: { equals: key, mode: "insensitive" } },
        include: { user: { include: { student: { select: { id: true } }, teacher: { select: { id: true } } } } },
      })
    )?.user;
  const ok = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !ok) return { ok: false as const, error: "auth.invalid" };
  const token = await signSession({
    sub: user.id,
    role: user.role,
    tv: user.tokenVersion,
    mcp: user.mustChangePassword,
  });
  return {
    ok: true as const,
    token,
    role: user.role,
    studentId: user.student?.id ?? null,
    teacherId: user.teacher?.id ?? null,
    mustChangePassword: user.mustChangePassword,
    language: user.preferredLanguage || "en",
  };
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { student: true } });
  if (!user) return { ok: false as const, error: "errors.notFound" };
  const matches = await verifyPassword(current, user.passwordHash);
  if (!matches) return { ok: false as const, error: "auth.invalid" };
  if (next.length < 8) return { ok: false as const, error: "errors.passwordShort" };
  if (next === current) return { ok: false as const, error: "errors.passwordSame" };
  if (user.student && next === user.student.studentCode) return { ok: false as const, error: "errors.passwordSame" };
  const passwordHash = await hashPassword(next);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false, tokenVersion: { increment: 1 } },
  });
  const token = await signSession({ sub: updated.id, role: updated.role, tv: updated.tokenVersion, mcp: false });
  return { ok: true as const, token, role: updated.role };
}
