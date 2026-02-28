import { Prisma } from "@prisma/client";
import { prisma } from "../../common/db.js";
import { uniqueSlug } from "../../common/slug.js";
import { NotFoundError, ConflictError, ForbiddenError } from "../../common/errors.js";
import { computeQualityScore } from "../validation/validation.service.js";
import type { CreateSkillInput, UpdateSkillInput, SkillQuery, SkillSummary, SkillDetail } from "@skills-hub/shared";

const skillSummarySelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  category: { select: { name: true, slug: true } },
  author: { select: { username: true, avatarUrl: true } },
  status: true,
  platforms: true,
  qualityScore: true,
  installCount: true,
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
} satisfies Prisma.SkillSelect;

function formatSkillSummary(row: any): SkillSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    author: row.author,
    status: row.status,
    platforms: row.platforms,
    qualityScore: row.qualityScore,
    installCount: row.installCount,
    avgRating: row.avgRating,
    reviewCount: row.reviewCount,
    latestVersion: row.versions[0]?.version ?? "0.0.0",
    tags: row.tags.map((t: any) => t.tag.name),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createSkill(authorId: string, input: CreateSkillInput): Promise<SkillSummary> {
  const category = await prisma.category.findUnique({ where: { slug: input.categorySlug } });
  if (!category) throw new NotFoundError("Category");

  const slug = await uniqueSlug(input.name);
  const qualityScore = computeQualityScore(input);

  const skill = await prisma.$transaction(async (tx) => {
    const skill = await tx.skill.create({
      data: {
        slug,
        name: input.name,
        description: input.description,
        categoryId: category.id,
        authorId,
        platforms: input.platforms as any,
        qualityScore,
        githubRepoUrl: input.githubRepoUrl,
      },
      include: skillSummarySelect,
    });

    await tx.skillVersion.create({
      data: {
        skillId: skill.id,
        version: input.version,
        instructions: input.instructions,
        qualityScore,
        isLatest: true,
      },
    });

    if (input.tags?.length) {
      for (const tagName of input.tags) {
        const tag = await tx.tag.upsert({
          where: { name: tagName.toLowerCase() },
          create: { name: tagName.toLowerCase() },
          update: {},
        });
        await tx.skillTag.create({ data: { skillId: skill.id, tagId: tag.id } });
      }
    }

    return skill;
  });

  // Re-fetch to get full relations including tags
  const full = await prisma.skill.findUniqueOrThrow({
    where: { id: skill.id },
    include: skillSummarySelect,
  });

  return formatSkillSummary(full);
}

export async function getSkillBySlug(slug: string): Promise<SkillDetail> {
  const skill = await prisma.skill.findUnique({
    where: { slug },
    include: {
      ...skillSummarySelect,
      versions: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          version: true,
          changelog: true,
          qualityScore: true,
          createdAt: true,
        },
      },
    },
  });

  if (!skill) throw new NotFoundError("Skill");

  const latestVersion = await prisma.skillVersion.findFirst({
    where: { skillId: skill.id, isLatest: true },
    select: { instructions: true, version: true },
  });

  return {
    ...formatSkillSummary({ ...skill, versions: [{ version: latestVersion?.version ?? "0.0.0" }] }),
    instructions: latestVersion?.instructions ?? "",
    githubRepoUrl: skill.githubRepoUrl,
    versions: skill.versions.map((v) => ({
      id: v.id,
      version: v.version,
      changelog: v.changelog,
      qualityScore: v.qualityScore,
      createdAt: v.createdAt.toISOString(),
    })),
  };
}

export async function listSkills(query: SkillQuery) {
  const where: Prisma.SkillWhereInput = { status: "PUBLISHED" };

  if (query.category) {
    where.category = { slug: query.category };
  }
  if (query.platform) {
    where.platforms = { has: query.platform as any };
  }
  if (query.minScore !== undefined) {
    where.qualityScore = { gte: query.minScore };
  }

  // Full-text search using PostgreSQL
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
      { tags: { some: { tag: { name: { contains: query.q.toLowerCase(), mode: "insensitive" } } } } },
    ];
  }

  const orderBy: Prisma.SkillOrderByWithRelationInput = (() => {
    switch (query.sort) {
      case "most_installed": return { installCount: "desc" as const };
      case "highest_rated": return { avgRating: "desc" as const };
      case "recently_updated": return { updatedAt: "desc" as const };
      default: return { createdAt: "desc" as const };
    }
  })();

  // Cursor-based pagination
  const findArgs: Prisma.SkillFindManyArgs = {
    where,
    orderBy,
    take: query.limit + 1,
    include: skillSummarySelect,
  };

  if (query.cursor) {
    findArgs.cursor = { id: query.cursor };
    findArgs.skip = 1;
  }

  const skills = await prisma.skill.findMany(findArgs) as any[];

  const hasMore = skills.length > query.limit;
  const data = skills.slice(0, query.limit);

  return {
    data: data.map(formatSkillSummary),
    cursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
  };
}

export async function updateSkill(
  userId: string,
  slug: string,
  input: UpdateSkillInput,
): Promise<SkillSummary> {
  const skill = await prisma.skill.findUnique({ where: { slug } });
  if (!skill) throw new NotFoundError("Skill");
  if (skill.authorId !== userId) throw new ForbiddenError("You can only edit your own skills");

  const updateData: Prisma.SkillUpdateInput = {};
  if (input.name) updateData.name = input.name;
  if (input.description) updateData.description = input.description;
  if (input.platforms) updateData.platforms = input.platforms as any;
  if (input.githubRepoUrl !== undefined) updateData.githubRepoUrl = input.githubRepoUrl;

  if (input.categorySlug) {
    const category = await prisma.category.findUnique({ where: { slug: input.categorySlug } });
    if (!category) throw new NotFoundError("Category");
    updateData.category = { connect: { id: category.id } };
  }

  await prisma.$transaction(async (tx) => {
    await tx.skill.update({ where: { slug }, data: updateData });

    if (input.tags) {
      await tx.skillTag.deleteMany({ where: { skillId: skill.id } });
      for (const tagName of input.tags) {
        const tag = await tx.tag.upsert({
          where: { name: tagName.toLowerCase() },
          create: { name: tagName.toLowerCase() },
          update: {},
        });
        await tx.skillTag.create({ data: { skillId: skill.id, tagId: tag.id } });
      }
    }
  });

  const updated = await prisma.skill.findUniqueOrThrow({
    where: { slug },
    include: skillSummarySelect,
  });

  return formatSkillSummary(updated);
}

export async function publishSkill(userId: string, slug: string): Promise<SkillSummary> {
  const skill = await prisma.skill.findUnique({ where: { slug } });
  if (!skill) throw new NotFoundError("Skill");
  if (skill.authorId !== userId) throw new ForbiddenError("You can only publish your own skills");
  if (skill.status === "PUBLISHED") throw new ConflictError("Skill is already published");

  const updated = await prisma.skill.update({
    where: { slug },
    data: { status: "PUBLISHED" },
    include: skillSummarySelect,
  });

  return formatSkillSummary(updated);
}

export async function archiveSkill(userId: string, slug: string): Promise<void> {
  const skill = await prisma.skill.findUnique({ where: { slug } });
  if (!skill) throw new NotFoundError("Skill");
  if (skill.authorId !== userId) throw new ForbiddenError("You can only archive your own skills");

  await prisma.skill.update({
    where: { slug },
    data: { status: "ARCHIVED" },
  });
}
