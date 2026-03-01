import { Prisma } from "@prisma/client";
import { prisma } from "../../common/db.js";
import { uniqueSlug } from "../../common/slug.js";
import { NotFoundError, ConflictError, ForbiddenError, ValidationError } from "../../common/errors.js";
import { computeQualityScore, validateSkill } from "../validation/validation.service.js";
import { requireOrgRole, isOrgMember } from "../org/org.auth.js";
import { QUALITY_SCORE } from "@skills-hub/shared";
import { batchHasUserLiked, hasUserLiked } from "../like/like.service.js";
import { skillSummarySelect, formatSkillSummary } from "./skill-summary.js";
import type { CreateSkillInput, UpdateSkillInput, SkillQuery, SkillSummary, SkillDetail, CompositionInput } from "@skills-hub/shared";

export async function createSkill(authorId: string, input: CreateSkillInput): Promise<SkillSummary> {
  const category = await prisma.category.findUnique({ where: { slug: input.categorySlug } });
  if (!category) throw new NotFoundError("Category");

  // Org-scoped skill: validate membership and resolve orgId
  let orgId: string | undefined;
  if (input.orgSlug) {
    const membership = await requireOrgRole(authorId, input.orgSlug, "PUBLISHER");
    orgId = membership.org.id;
  }

  const slug = await uniqueSlug(input.name);
  const qualityScore = computeQualityScore(input);

  const visibility = input.orgSlug && !input.visibility ? "ORG" : (input.visibility ?? "PUBLIC");

  const skill = await prisma.$transaction(async (tx) => {
    const skill = await tx.skill.create({
      data: {
        slug,
        name: input.name,
        description: input.description,
        categoryId: category.id,
        authorId,
        orgId,
        visibility: visibility as any,
        platforms: input.platforms as any,
        qualityScore,
        githubRepoUrl: input.githubRepoUrl,
      },
      select: skillSummarySelect,
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

  const full = await prisma.skill.findUniqueOrThrow({
    where: { id: skill.id },
    select: skillSummarySelect,
  });

  return formatSkillSummary(full);
}

export async function getSkillBySlug(slug: string, requesterId?: string | null): Promise<SkillDetail> {
  const skill = await prisma.skill.findUnique({
    where: { slug },
    select: {
      ...skillSummarySelect,
      authorId: true,
      orgId: true,
      githubRepoUrl: true,
      versions: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          version: true,
          changelog: true,
          qualityScore: true,
          createdAt: true,
        },
      },
      compositionOf: {
        select: {
          description: true,
          children: {
            orderBy: { sortOrder: "asc" },
            select: {
              sortOrder: true,
              isParallel: true,
              childSkill: {
                select: { slug: true, name: true, qualityScore: true },
              },
            },
          },
        },
      },
      media: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          type: true,
          url: true,
          caption: true,
          sortOrder: true,
        },
      },
    },
  });

  if (!skill) throw new NotFoundError("Skill");

  // Visibility check: private skills only visible to their author
  if (skill.visibility === "PRIVATE" && skill.authorId !== requesterId) {
    throw new NotFoundError("Skill");
  }

  // ORG visibility: only visible to org members
  if (skill.visibility === "ORG" && skill.orgId) {
    if (!requesterId) throw new NotFoundError("Skill");
    const member = await isOrgMember(requesterId, skill.orgId);
    if (!member) throw new NotFoundError("Skill");
  }

  const latestVersion = await prisma.skillVersion.findFirst({
    where: { skillId: skill.id, isLatest: true },
    select: { instructions: true, version: true },
  });

  const composition = skill.compositionOf
    ? {
        description: skill.compositionOf.description,
        children: skill.compositionOf.children.map((c: any) => ({
          skill: {
            slug: c.childSkill.slug,
            name: c.childSkill.name,
            qualityScore: c.childSkill.qualityScore,
          },
          sortOrder: c.sortOrder,
          isParallel: c.isParallel,
        })),
      }
    : null;

  // Check if requester has liked this skill
  const userLiked = requesterId ? await hasUserLiked(requesterId, skill.id) : false;

  return {
    ...formatSkillSummary({ ...skill, versions: [{ version: latestVersion?.version ?? "0.0.0" }] }, userLiked),
    instructions: latestVersion?.instructions ?? "",
    githubRepoUrl: skill.githubRepoUrl,
    versions: skill.versions.map((v) => ({
      id: v.id,
      version: v.version,
      changelog: v.changelog,
      qualityScore: v.qualityScore,
      createdAt: v.createdAt.toISOString(),
    })),
    composition,
    media: skill.media.map((m) => ({
      id: m.id,
      type: m.type,
      url: m.url,
      caption: m.caption,
      sortOrder: m.sortOrder,
    })),
  };
}

export async function listSkills(query: SkillQuery, requesterId?: string | null) {
  const where: Prisma.SkillWhereInput = {};

  // Status filter: non-PUBLISHED statuses require author ownership
  if (query.status === "DRAFT" || query.status === "ARCHIVED" || query.status === "PENDING_REVIEW") {
    if (!requesterId) throw new ForbiddenError("Authentication required");
    where.status = query.status;
    where.authorId = requesterId;
  } else {
    where.status = "PUBLISHED";
  }

  // Visibility: public browse only shows PUBLIC skills
  // If a specific visibility is requested (e.g., user viewing their own private skills),
  // we add the author filter to enforce ownership
  if (query.visibility === "PRIVATE") {
    if (!requesterId) throw new ForbiddenError("Authentication required to view private skills");
    where.visibility = "PRIVATE";
    where.authorId = requesterId;
  } else if (query.visibility === "UNLISTED") {
    if (!requesterId) throw new ForbiddenError("Authentication required to list unlisted skills");
    where.visibility = "UNLISTED";
    where.authorId = requesterId;
  } else if (query.visibility === "ORG") {
    if (!requesterId) throw new ForbiddenError("Authentication required to view org skills");
    if (!query.org) throw new ValidationError("org parameter required for ORG visibility");
    const org = await prisma.organization.findUnique({ where: { slug: query.org } });
    if (!org) throw new NotFoundError("Organization");
    const member = await isOrgMember(requesterId, org.id);
    if (!member) throw new ForbiddenError("Not a member of this organization");
    where.orgId = org.id;
    where.visibility = "ORG";
  } else {
    where.visibility = "PUBLIC";
  }

  if (query.author) {
    where.author = { username: query.author };
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
    // Use tsvector (GIN indexed) for published public skills; ILIKE fallback for others
    const canUseTsvector = where.status === "PUBLISHED" && where.visibility === "PUBLIC";
    let tsvectorIds: string[] | null = null;

    if (canUseTsvector) {
      const tsQuery = searchTerm
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
        .filter(Boolean)
        .join(" & ");

      if (tsQuery) {
        const tsvectorResults = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Skill"
          WHERE "searchVector" @@ to_tsquery('english', ${tsQuery + ":*"})
            AND status = 'PUBLISHED' AND visibility = 'PUBLIC'
          ORDER BY ts_rank("searchVector", to_tsquery('english', ${tsQuery + ":*"})) DESC
          LIMIT 200`;
        tsvectorIds = tsvectorResults.map((r) => r.id);
      }

      where.OR = [
        ...(tsvectorIds && tsvectorIds.length > 0 ? [{ id: { in: tsvectorIds } }] : []),
        { tags: { some: { tag: { name: { contains: searchTerm.toLowerCase(), mode: "insensitive" as const } } } } },
      ];
    } else {
      where.OR = [
        { name: { contains: searchTerm, mode: "insensitive" as const } },
        { description: { contains: searchTerm, mode: "insensitive" as const } },
        { tags: { some: { tag: { name: { contains: searchTerm.toLowerCase(), mode: "insensitive" as const } } } } },
      ];
    }
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
    select: skillSummarySelect,
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
    data: data.map((s: any) => formatSkillSummary(s, likedSet.has(s.id))),
    cursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
  };
}

export async function updateSkill(
  userId: string,
  slug: string,
  input: UpdateSkillInput,
): Promise<SkillSummary> {
  const skill = await prisma.skill.findUnique({
    where: { slug },
    select: { id: true, authorId: true, org: { select: { slug: true } } },
  });
  if (!skill) throw new NotFoundError("Skill");

  // Allow author OR org PUBLISHER+ to edit
  if (skill.authorId !== userId) {
    if (skill.org) {
      await requireOrgRole(userId, skill.org.slug, "PUBLISHER");
    } else {
      throw new ForbiddenError("You can only edit your own skills");
    }
  }

  const updateData: Prisma.SkillUpdateInput = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.platforms !== undefined) updateData.platforms = input.platforms as any;
  if (input.visibility !== undefined) updateData.visibility = input.visibility as any;
  if (input.githubRepoUrl !== undefined) updateData.githubRepoUrl = input.githubRepoUrl;

  if (input.categorySlug !== undefined) {
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
    select: skillSummarySelect,
  });

  return formatSkillSummary(updated);
}

export async function publishSkill(userId: string, slug: string): Promise<SkillSummary> {
  const skill = await prisma.skill.findUnique({
    where: { slug },
    select: {
      id: true,
      authorId: true,
      status: true,
      qualityScore: true,
      name: true,
      description: true,
      platforms: true,
      org: { select: { slug: true } },
      category: { select: { slug: true } },
      versions: {
        where: { isLatest: true },
        take: 1,
        select: { version: true, instructions: true },
      },
    },
  });
  if (!skill) throw new NotFoundError("Skill");

  // Allow author OR org PUBLISHER+ to publish
  if (skill.authorId !== userId) {
    if (skill.org) {
      await requireOrgRole(userId, skill.org.slug, "PUBLISHER");
    } else {
      throw new ForbiddenError("You can only publish your own skills");
    }
  }
  if (skill.status === "PUBLISHED") throw new ConflictError("Skill is already published");

  // Run validation pipeline for actionable feedback
  const version = skill.versions[0];
  const report = validateSkill({
    slug,
    name: skill.name,
    description: skill.description,
    categorySlug: skill.category.slug,
    platforms: skill.platforms,
    instructions: version?.instructions ?? "",
    version: version?.version ?? "0.0.0",
  });

  if (!report.publishable) {
    const failedChecks = [
      ...report.checks.schema,
      ...report.checks.content,
      ...report.checks.structure,
    ].filter((c) => !c.passed && c.severity === "error");
    const reasons = failedChecks.map((c) => c.message).join("; ");
    throw new ValidationError(
      `Cannot publish (score: ${report.qualityScore}): ${reasons || `Quality score must be at least ${QUALITY_SCORE.THRESHOLDS.MIN_PUBLISH_SCORE}`}`,
    );
  }

  const updated = await prisma.skill.update({
    where: { slug },
    data: { status: "PUBLISHED" },
    select: skillSummarySelect,
  });

  return formatSkillSummary(updated);
}

export async function archiveSkill(userId: string, slug: string): Promise<void> {
  const skill = await prisma.skill.findUnique({
    where: { slug },
    select: { id: true, authorId: true, org: { select: { slug: true } } },
  });
  if (!skill) throw new NotFoundError("Skill");

  // Allow author OR org PUBLISHER+ to archive
  if (skill.authorId !== userId) {
    if (skill.org) {
      await requireOrgRole(userId, skill.org.slug, "PUBLISHER");
    } else {
      throw new ForbiddenError("You can only archive your own skills");
    }
  }

  await prisma.skill.update({
    where: { slug },
    data: { status: "ARCHIVED" },
  });
}

// --- Composition ---

export async function setComposition(
  userId: string,
  slug: string,
  input: CompositionInput,
): Promise<SkillDetail> {
  const skill = await prisma.skill.findUnique({
    where: { slug },
    select: { id: true, authorId: true, org: { select: { slug: true } } },
  });
  if (!skill) throw new NotFoundError("Skill");
  // Allow author OR org PUBLISHER+ to manage composition
  if (skill.authorId !== userId) {
    if (skill.org) {
      await requireOrgRole(userId, skill.org.slug, "PUBLISHER");
    } else {
      throw new ForbiddenError("You can only edit your own skills");
    }
  }

  // Resolve child skill slugs to IDs
  const childSlugs = input.children.map((c) => c.skillSlug);
  const childSkills = await prisma.skill.findMany({
    where: { slug: { in: childSlugs }, status: "PUBLISHED" },
    select: { id: true, slug: true },
  });

  const slugToId = new Map(childSkills.map((s) => [s.slug, s.id]));
  for (const child of input.children) {
    if (!slugToId.has(child.skillSlug)) {
      throw new NotFoundError(`Child skill "${child.skillSlug}"`);
    }
  }

  // Prevent self-reference
  if (childSlugs.includes(slug)) {
    throw new ConflictError("A composition cannot include itself");
  }

  // Prevent transitive cycles (A→B→A, A→B→C→A, etc.)
  const childIds = [...slugToId.values()];
  if (childIds.length > 0) {
    const descendantCompositions = await prisma.compositionSkill.findMany({
      where: {
        composition: { skillId: { in: childIds } },
      },
      select: {
        composition: { select: { skillId: true } },
        childSkillId: true,
      },
    });
    // Check if any child (direct or transitive) points back to the parent
    const visited = new Set<string>();
    const queue = descendantCompositions.map((d) => d.childSkillId);
    while (queue.length > 0) {
      const id = queue.pop()!;
      if (id === skill.id) {
        throw new ConflictError("Circular composition detected — a child skill already includes this skill");
      }
      if (visited.has(id)) continue;
      visited.add(id);
      // Look for further descendants
      const further = await prisma.compositionSkill.findMany({
        where: { composition: { skillId: id } },
        select: { childSkillId: true },
      });
      for (const f of further) queue.push(f.childSkillId);
    }
  }

  await prisma.$transaction(async (tx) => {
    // Upsert composition
    const composition = await tx.composition.upsert({
      where: { skillId: skill.id },
      create: { skillId: skill.id, description: input.description },
      update: { description: input.description },
    });

    // Replace children
    await tx.compositionSkill.deleteMany({ where: { compositionId: composition.id } });
    for (const child of input.children) {
      await tx.compositionSkill.create({
        data: {
          compositionId: composition.id,
          childSkillId: slugToId.get(child.skillSlug)!,
          sortOrder: child.sortOrder,
          isParallel: child.isParallel,
        },
      });
    }
  });

  return getSkillBySlug(slug, userId);
}

export async function removeComposition(userId: string, slug: string): Promise<void> {
  const skill = await prisma.skill.findUnique({
    where: { slug },
    select: { id: true, authorId: true, org: { select: { slug: true } } },
  });
  if (!skill) throw new NotFoundError("Skill");
  // Allow author OR org PUBLISHER+ to remove composition
  if (skill.authorId !== userId) {
    if (skill.org) {
      await requireOrgRole(userId, skill.org.slug, "PUBLISHER");
    } else {
      throw new ForbiddenError("You can only edit your own skills");
    }
  }

  await prisma.composition.deleteMany({ where: { skillId: skill.id } });
}
