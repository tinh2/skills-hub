import { Prisma } from "@prisma/client";
import { prisma } from "../../common/db.js";
import { isOrgMember } from "../org/org.auth.js";
import { batchHasUserLiked } from "../like/like.service.js";
import type { SkillQuery } from "@skills-hub/shared";

/**
 * Full-text search using PostgreSQL tsvector/GIN index.
 * Name is weighted A (highest), description weighted B.
 * Falls back to ILIKE for tag matching (tags are in a separate table).
 */
export async function searchSkills(query: SkillQuery, requesterId?: string | null) {
  const where: Prisma.SkillWhereInput = { status: "PUBLISHED", visibility: "PUBLIC" };

  // Org-scoped search: show both PUBLIC and ORG-visible skills for members
  if (query.org && requesterId) {
    const org = await prisma.organization.findUnique({ where: { slug: query.org } });
    if (org) {
      const member = await isOrgMember(requesterId, org.id);
      if (member) {
        delete where.visibility;
        where.AND = [
          { OR: [{ visibility: "PUBLIC" }, { visibility: "ORG", orgId: org.id }] },
        ];
      }
    }
  }

  if (query.category) {
    where.category = { slug: query.category };
  }
  if (query.platform) {
    where.platforms = { has: query.platform };
  }
  if (query.minScore !== undefined) {
    where.qualityScore = { gte: query.minScore };
  }

  // Use tsvector for name/description search, ILIKE for tag matching
  let tsvectorIds: string[] | null = null;
  if (query.q) {
    const searchTerm = query.q.trim();

    // Use tsvector search for name + description (GIN indexed)
    const tsQuery = searchTerm
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
      .filter(Boolean)
      .join(" & ");

    if (tsQuery) {
      // Raw tsvector query must match the same visibility rules as the Prisma where clause
      const isOrgSearch = !!where.AND;
      const tsvectorResults = isOrgSearch
        ? await prisma.$queryRaw<{ id: string }[]>`
            SELECT id FROM "Skill"
            WHERE "searchVector" @@ to_tsquery('english', ${tsQuery + ":*"})
              AND status = 'PUBLISHED'
              AND (visibility = 'PUBLIC' OR visibility = 'ORG')
            ORDER BY ts_rank("searchVector", to_tsquery('english', ${tsQuery + ":*"})) DESC
            LIMIT 200
          `
        : await prisma.$queryRaw<{ id: string }[]>`
            SELECT id FROM "Skill"
            WHERE "searchVector" @@ to_tsquery('english', ${tsQuery + ":*"})
              AND status = 'PUBLISHED'
              AND visibility = 'PUBLIC'
            ORDER BY ts_rank("searchVector", to_tsquery('english', ${tsQuery + ":*"})) DESC
            LIMIT 200
          `;
      tsvectorIds = tsvectorResults.map((r) => r.id);
    }

    // Also match by tag name (tags not in tsvector)
    where.OR = [
      ...(tsvectorIds ? [{ id: { in: tsvectorIds } }] : []),
      { tags: { some: { tag: { name: { contains: searchTerm.toLowerCase(), mode: "insensitive" as const } } } } },
    ];
  }

  // For "relevance" sort with tsvector results, we preserve the tsvector rank ordering
  // by not applying a Prisma orderBy (the ID list from tsvector is already ranked)
  const useRelevanceSort = query.sort === "relevance" && tsvectorIds && tsvectorIds.length > 0;

  const orderBy: Prisma.SkillOrderByWithRelationInput = (() => {
    if (useRelevanceSort) return { createdAt: "desc" as const }; // fallback, re-sorted below
    switch (query.sort) {
      case "most_installed": return { installCount: "desc" as const };
      case "most_liked": return { likeCount: "desc" as const };
      case "highest_rated": return { avgRating: "desc" as const };
      case "recently_updated": return { updatedAt: "desc" as const };
      default: return { createdAt: "desc" as const };
    }
  })();

  const findArgs: Prisma.SkillFindManyArgs = {
    where,
    orderBy,
    take: query.limit + 1,
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
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
      category: { select: { name: true, slug: true } },
      author: { select: { username: true, avatarUrl: true } },
      tags: { select: { tag: { select: { name: true } } } },
      versions: {
        where: { isLatest: true },
        select: { version: true },
        take: 1,
      },
      compositionOf: { select: { id: true } },
      org: { select: { slug: true, name: true } },
    },
  };

  // Cursor pagination is incompatible with relevance sort (results are re-sorted
  // by tsvector rank after fetching, making cursor position meaningless for page 2+)
  if (query.cursor && !useRelevanceSort) {
    findArgs.cursor = { id: query.cursor };
    findArgs.skip = 1;
  }

  let skills = await prisma.skill.findMany(findArgs) as any[];

  // Re-sort by tsvector rank for relevance sort
  if (useRelevanceSort && tsvectorIds) {
    const rankMap = new Map(tsvectorIds.map((id, i) => [id, i]));
    skills.sort((a: any, b: any) => {
      const ra = rankMap.get(a.id) ?? Infinity;
      const rb = rankMap.get(b.id) ?? Infinity;
      return ra - rb;
    });
  }

  const hasMore = skills.length > query.limit;
  const data = skills.slice(0, query.limit);

  // Batch check userLiked
  let likedSet = new Set<string>();
  if (requesterId) {
    likedSet = await batchHasUserLiked(requesterId, data.map((s: any) => s.id));
  }

  return {
    data: data.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      description: s.description,
      category: s.category,
      author: s.author,
      status: s.status,
      visibility: s.visibility,
      platforms: s.platforms,
      qualityScore: s.qualityScore,
      installCount: s.installCount,
      likeCount: s.likeCount ?? 0,
      userLiked: likedSet.has(s.id),
      avgRating: s.avgRating,
      reviewCount: s.reviewCount,
      latestVersion: s.versions[0]?.version ?? "0.0.0",
      tags: s.tags.map((t: any) => t.tag.name),
      isComposition: !!s.compositionOf,
      org: s.org ? { slug: s.org.slug, name: s.org.name } : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    cursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
  };
}

/**
 * Get search suggestions for autocomplete.
 */
export async function getSearchSuggestions(q: string, limit = 5) {
  const skills = await prisma.skill.findMany({
    where: {
      status: "PUBLISHED",
      visibility: "PUBLIC",
      name: { contains: q, mode: "insensitive" },
    },
    take: limit,
    select: { name: true, slug: true },
    orderBy: { installCount: "desc" },
  });

  const tags = await prisma.tag.findMany({
    where: { name: { contains: q.toLowerCase(), mode: "insensitive" } },
    take: limit,
    select: { name: true },
  });

  return {
    skills: skills.map((s) => ({ name: s.name, slug: s.slug })),
    tags: tags.map((t) => t.name),
  };
}
