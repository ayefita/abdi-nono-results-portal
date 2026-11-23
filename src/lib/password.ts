import { compare, hash } from "bcryptjs";

const COST = 10;
let dummyHash: string | null = null;

export function hashPassword(password: string) {
  return hash(password, COST);
}

export async function verifyPassword(password: string, passwordHash: string | null) {
  if (!dummyHash) dummyHash = await hash("not-a-real-password", COST);
  return compare(password, passwordHash ?? dummyHash);
}
