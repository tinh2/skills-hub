import { Prisma } from "@prisma/client";
import type { SkillSummary } from "@skills-hub/shared";

export const skillSummarySelect = {
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
  tags: { select: { tag: { select: { name: true } } } },
  versions: {
    where: { isLatest: true },
    select: { version: true },
    take: 1,
  },
  compositionOf: { select: { id: true } },
  org: { select: { slug: true, name: true } },
} satisfies Prisma.SkillSelect;

export function formatSkillSummary(row: any, userLiked = false): SkillSummary {
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
    userLiked,
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
