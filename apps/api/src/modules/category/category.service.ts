import { prisma } from "../../common/db.js";
import type { SkillSummary } from "@skills-hub/shared";

const summarySelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  category: { select: { name: true, slug: true } },
  author: { select: { username: true, avatarUrl: true } },
  status: true,
  visibility: true,
  platforms: true,
  qualityScore: true,
  installCount: true,
  likeCount: true,
  avgRating: true,
  reviewCount: true,
  createdAt: true,
  updatedAt: true,
  tags: { include: { tag: { select: { name: true } } } },
  versions: {
    where: { isLatest: true },
    select: { version: true },
    take: 1,
  },
  compositionOf: { select: { id: true } },
  org: { select: { slug: true, name: true } },
};

function toSummary(row: any): SkillSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    author: row.author,
    status: row.status,
    visibility: row.visibility,
    platforms: row.platforms,
    qualityScore: row.qualityScore,
    installCount: row.installCount,
    likeCount: row.likeCount ?? 0,
    userLiked: false,
    avgRating: row.avgRating,
    reviewCount: row.reviewCount,
    latestVersion: row.versions[0]?.version ?? "0.0.0",
    tags: row.tags.map((t: any) => t.tag.name),
    isComposition: !!row.compositionOf,
    org: row.org ? { slug: row.org.slug, name: row.org.name } : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
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
  const topSkillIds = await prisma.$queryRaw<{ id: string }[]>`
    SELECT DISTINCT ON ("categoryId") id
    FROM "Skill"
    WHERE status = 'PUBLISHED'
      AND visibility = 'PUBLIC'
      AND "likeCount" >= 1
    ORDER BY "categoryId", "likeCount" DESC
  `;

  const result: Record<string, SkillSummary | null> = {};
  const catSlugMap = new Map(categories.map((c) => [c.id, c.slug]));

  if (topSkillIds.length > 0) {
    const skills = await prisma.skill.findMany({
      where: { id: { in: topSkillIds.map((s) => s.id) } },
      select: { ...summarySelect, categoryId: true },
    });

    for (const skill of skills) {
      const catSlug = catSlugMap.get((skill as any).categoryId);
      if (catSlug) {
        result[catSlug] = toSummary(skill);
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

export async function getFeaturedSkill(categorySlug: string): Promise<SkillSummary | null> {
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
  });
  if (!category) return null;

  const skill = await prisma.skill.findFirst({
    where: {
      categoryId: category.id,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      likeCount: { gte: 1 },
    },
    orderBy: { likeCount: "desc" },
    select: summarySelect,
  });

  return skill ? toSummary(skill) : null;
}
