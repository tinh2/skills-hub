import { prisma } from "../../common/db.js";

export async function searchTags(q?: string, limit = 20) {
  const take = Math.min(limit, 50);

  const where = q
    ? { name: { contains: q.toLowerCase(), mode: "insensitive" as const } }
    : {};

  return prisma.tag.findMany({
    where,
    take,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { skills: true } },
    },
  });
}
