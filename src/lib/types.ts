export const ROLES = ["ADMIN", "TEACHER", "DIRECTOR", "STUDENT"] as const;
export type Role = (typeof ROLES)[number];

export type Session = {
  userId: string;
  role: Role;
  fullName: string;
  username: string;
  studentId: string | null;
  teacherId: string | null;
  mustChangePassword: boolean;
  language: string;
};

export function homeFor(role: Role) {
  if (role === "ADMIN") return "/admin";
  if (role === "TEACHER") return "/teacher";
  if (role === "DIRECTOR") return "/director";
  return "/student";
}

export function canManageSchool(role: Role) {
  return role === "ADMIN";
}

export function canWriteMarks(role: Role) {
  return role === "ADMIN" || role === "TEACHER";
}

export function canReadStudent(role: Role, actorStudentId: string | null, targetStudentId: string) {
  if (role === "ADMIN" || role === "DIRECTOR") return true;
  if (role === "STUDENT") return actorStudentId === targetStudentId;
  if (role === "TEACHER") return true;
  return false;
}
