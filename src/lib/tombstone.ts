import { prisma } from "./prisma";

export async function rememberDelete(entity: string, entityId: string) {
  await prisma.tombstone.upsert({
    where: { entity_entityId: { entity, entityId } },
    create: { entity, entityId },
    update: { deletedAt: new Date() },
  });
}

export async function deleteUser(userId: string, studentId?: string | null) {
  if (studentId) await rememberDelete("Student", studentId);
  await rememberDelete("User", userId);
  await prisma.user.delete({ where: { id: userId } });
}
