import { prisma } from "../../common/db.js";
import { NotFoundError } from "../../common/errors.js";
import { requireOrgRole } from "./org.auth.js";
import type { OrgAnalytics } from "@skills-hub/shared";

export async function getOrgAnalytics(
  userId: string,
  orgSlug: string,
): Promise<OrgAnalytics> {
  await requireOrgRole(userId, orgSlug, "MEMBER");

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) throw new NotFoundError("Organization");

  // Total skills
  const totalSkills = await prisma.skill.count({ where: { orgId: org.id } });

  // Total installs
  const installAgg = await prisma.skill.aggregate({
    where: { orgId: org.id },
    _sum: { installCount: true },
  });
  const totalInstalls = installAgg._sum.installCount ?? 0;

  // Active members (30d) — members who created or updated skills in the org recently
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const activeAuthors = await prisma.skill.findMany({
    where: { orgId: org.id, updatedAt: { gte: thirtyDaysAgo } },
    select: { authorId: true },
    distinct: ["authorId"],
  });
  const activeMembers = activeAuthors.length;

  // Skills by category
  const skillsByCategory = await prisma.skill.groupBy({
    by: ["categoryId"],
    where: { orgId: org.id },
    _count: true,
  });

  const categoryIds = skillsByCategory.map((s) => s.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  // Top skills by installs
  const topSkills = await prisma.skill.findMany({
    where: { orgId: org.id },
    orderBy: { installCount: "desc" },
    take: 10,
    select: { slug: true, name: true, installCount: true },
  });

  // Recent installs (last 30 days, grouped by day) — use raw SQL for DATE() truncation
  const dailyInstalls = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
    SELECT DATE("Install"."createdAt") as date, COUNT(*)::bigint as count
    FROM "Install"
    JOIN "Skill" ON "Skill"."id" = "Install"."skillId"
    WHERE "Skill"."orgId" = ${org.id}
      AND "Install"."createdAt" >= ${thirtyDaysAgo}
    GROUP BY DATE("Install"."createdAt")
    ORDER BY date
  `;

  const dateCountMap = new Map<string, number>();
  for (const entry of dailyInstalls) {
    const dateStr = entry.date instanceof Date
      ? entry.date.toISOString().split("T")[0]
      : String(entry.date);
    dateCountMap.set(dateStr, Number(entry.count));
  }

  return {
    totalSkills,
    totalInstalls,
    activeMembers,
    skillsByCategory: skillsByCategory.map((s) => ({
      category: categoryMap.get(s.categoryId) ?? "Unknown",
      count: s._count,
    })),
    topSkills: topSkills.map((s) => ({
      slug: s.slug,
      name: s.name,
      installs: s.installCount,
    })),
    recentInstalls: Array.from(dateCountMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count })),
  };
}
