import { prisma } from "./db";

/** Create an internal notification for a user (proposal §27). */
export async function notify(userId: string, title: string, body = ""): Promise<void> {
  await prisma.notification.create({ data: { userId, title, body } });
}

/** Notify every user at a given seller level (level-targeted notifications). */
export async function notifyLevel(levelId: string, title: string, body = ""): Promise<void> {
  const users = await prisma.user.findMany({
    where: { levelId },
    select: { id: true },
  });
  if (users.length === 0) return;
  await prisma.notification.createMany({
    data: users.map((u) => ({ userId: u.id, title, body })),
  });
}
