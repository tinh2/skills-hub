import { prisma } from "../../common/db.js";
import { NotFoundError } from "../../common/errors.js";

export async function toggleLike(
  userId: string,
  slug: string,
): Promise<{ liked: boolean; likeCount: number }> {
  const skill = await prisma.skill.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!skill) throw new NotFoundError("Skill");

  const existing = await prisma.skillLike.findUnique({
    where: { skillId_userId: { skillId: skill.id, userId } },
  });

  if (existing) {
    // Unlike
    try {
      await prisma.$transaction([
        prisma.skillLike.delete({
          where: { skillId_userId: { skillId: skill.id, userId } },
        }),
        prisma.skill.update({
          where: { id: skill.id },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
    } catch (e: any) {
      if (e?.code === "P2025") {
        // Already deleted by a concurrent request
      } else {
        throw e;
      }
    }

    const updated = await prisma.skill.findUniqueOrThrow({
      where: { id: skill.id },
      select: { likeCount: true },
    });
    return { liked: false, likeCount: Math.max(0, updated.likeCount) };
  }

  // Like
  try {
    await prisma.$transaction([
      prisma.skillLike.create({
        data: { skillId: skill.id, userId },
      }),
      prisma.skill.update({
        where: { id: skill.id },
        data: { likeCount: { increment: 1 } },
      }),
    ]);
  } catch (e: any) {
    if (e?.code === "P2002") {
      // Race condition: another request already liked — return current state
    } else {
      throw e;
    }
  }

  const updated = await prisma.skill.findUniqueOrThrow({
    where: { id: skill.id },
    select: { likeCount: true },
  });
  return { liked: true, likeCount: updated.likeCount };
}

export async function hasUserLiked(userId: string, skillId: string): Promise<boolean> {
  const like = await prisma.skillLike.findUnique({
    where: { skillId_userId: { skillId, userId } },
  });
  return !!like;
}

export async function batchHasUserLiked(
  userId: string,
  skillIds: string[],
): Promise<Set<string>> {
  if (skillIds.length === 0) return new Set();
  const likes = await prisma.skillLike.findMany({
    where: { userId, skillId: { in: skillIds } },
    select: { skillId: true },
  });
  return new Set(likes.map((l) => l.skillId));
}
