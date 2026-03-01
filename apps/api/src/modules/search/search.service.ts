import { Prisma } from "@prisma/client";
import { prisma } from "../../common/db.js";
import { isOrgMember } from "../org/org.auth.js";
import { batchHasUserLiked } from "../like/like.service.js";
import type { SkillQuery } from "@skills-hub/shared";

/**
 * Full-text search using PostgreSQL.
 * Uses ILIKE for v1 — will be replaced with tsvector/GIN index for production scale.
 * The SearchService interface stays the same regardless of backend.
 */
export async function searchSkills(query: SkillQuery, requesterId?: string | null) {
  const where: Prisma.SkillWhereInput = { status: "PUBLISHED", visibility: "PUBLIC" };

  // Org-scoped search
  if (query.org && requesterId) {
    const org = await prisma.organization.findUnique({ where: { slug: query.org } });
    if (org) {
      const member = await isOrgMember(requesterId, org.id);
      if (member) {
        where.visibility = "ORG";
        where.orgId = org.id;
      }
    }
  }

  if (query.category) {
    where.category = { slug: query.category };
  }
  if (query.platform) {
    where.platforms = { has: query.platform as any };
  }
  if (query.minScore !== undefined) {
    where.qualityScore = { gte: query.minScore };
  }

  if (query.q) {
    const searchTerm = query.q.trim();

    // Use PostgreSQL full-text search via raw query for ranking
    // Fall back to ILIKE for broader matching
    where.OR = [
      { name: { contains: searchTerm, mode: "insensitive" } },
      { description: { contains: searchTerm, mode: "insensitive" } },
      { tags: { some: { tag: { name: { contains: searchTerm.toLowerCase(), mode: "insensitive" } } } } },
    ];
  }

  const orderBy: Prisma.SkillOrderByWithRelationInput = (() => {
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
    include: {
      category: { select: { name: true, slug: true } },
      author: { select: { username: true, avatarUrl: true } },
      tags: { include: { tag: { select: { name: true } } } },
      versions: {
        where: { isLatest: true },
        select: { version: true },
        take: 1,
      },
      compositionOf: { select: { id: true } },
      org: { select: { slug: true, name: true } },
    },
  };

  if (query.cursor) {
    findArgs.cursor = { id: query.cursor };
    findArgs.skip = 1;
  }

  const skills = await prisma.skill.findMany(findArgs) as any[];

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
