import { prisma } from "../../common/db.js";
import { NotFoundError } from "../../common/errors.js";
import { skillSummarySelect, formatSkillSummary } from "../skill/skill-summary.js";
import type { SkillSummary } from "@skills-hub-ai/shared";

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getCategoryBySlug(slug: string) {
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) throw new NotFoundError("Category");
  return category;
}

// Cache featured skills for 5 minutes to avoid hammering the DB
let featuredCache: { data: Record<string, SkillSummary | null>; expiresAt: number } | null = null;
const FEATURED_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getFeaturedSkillPerCategory(): Promise<Record<string, SkillSummary | null>> {
  if (featuredCache && Date.now() < featuredCache.expiresAt) {
    return featuredCache.data;
  }

  const categories = await prisma.category.findMany({
    select: { slug: true, id: true },
  });

  // Single query: get top skill per category using Prisma raw for DISTINCT ON
  // Falls back to installCount when no likes exist (e.g. freshly seeded data)
  const topSkillIds = await prisma.$queryRaw<{ id: string }[]>`
    SELECT DISTINCT ON ("categoryId") id
    FROM "Skill"
    WHERE status = 'PUBLISHED'
      AND visibility = 'PUBLIC'
    ORDER BY "categoryId", "likeCount" DESC, "installCount" DESC
  `;

  const result: Record<string, SkillSummary | null> = {};
  const catSlugMap = new Map(categories.map((c) => [c.id, c.slug]));

  if (topSkillIds.length > 0) {
    const skills = await prisma.skill.findMany({
      where: { id: { in: topSkillIds.map((s) => s.id) } },
      select: { ...skillSummarySelect, categoryId: true },
    });

    for (const skill of skills) {
      const catSlug = catSlugMap.get((skill as any).categoryId);
      if (catSlug) {
        result[catSlug] = formatSkillSummary(skill);
      }
    }
  }

  // Fill in nulls for categories with no featured skill
  for (const cat of categories) {
    if (!(cat.slug in result)) {
      result[cat.slug] = null;
    }
  }

  featuredCache = { data: result, expiresAt: Date.now() + FEATURED_CACHE_TTL };
  return result;
}

