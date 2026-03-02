import { prisma } from "../../common/db.js";
import { NotFoundError, ForbiddenError, ConflictError } from "../../common/errors.js";
import { computeQualityScore } from "../validation/validation.service.js";
import { compareSemver } from "@skills-hub-ai/skill-parser";
import { isOrgMember } from "../org/org.auth.js";
import { requireOrgRole } from "../org/org.auth.js";
import type { VersionSummary, VersionDetail, VersionDiff } from "@skills-hub-ai/shared";

/** Enforce visibility rules — private/org skills only visible to authorized users */
async function checkSkillVisibility(skill: any, requesterId?: string | null): Promise<void> {
  if (skill.visibility === "PRIVATE" && skill.authorId !== requesterId) {
    throw new NotFoundError("Skill");
  }
  if (skill.visibility === "ORG" && skill.orgId) {
    if (!requesterId) throw new NotFoundError("Skill");
    const member = await isOrgMember(requesterId, skill.orgId);
    if (!member) throw new NotFoundError("Skill");
  }
}

export async function listVersions(slug: string, requesterId?: string | null): Promise<VersionSummary[]> {
  const skill = await prisma.skill.findUnique({ where: { slug }, select: { id: true, visibility: true, authorId: true, orgId: true } });
  if (!skill) throw new NotFoundError("Skill");
  await checkSkillVisibility(skill, requesterId);

  const versions = await prisma.skillVersion.findMany({
    where: { skillId: skill.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, version: true, changelog: true, qualityScore: true, createdAt: true },
  });

  return versions.map((v) => ({
    id: v.id,
    version: v.version,
    changelog: v.changelog,
    qualityScore: v.qualityScore,
    createdAt: v.createdAt.toISOString(),
  }));
}

export async function getVersion(slug: string, version: string, requesterId?: string | null): Promise<VersionDetail> {
  const skill = await prisma.skill.findUnique({ where: { slug }, select: { id: true, visibility: true, authorId: true, orgId: true } });
  if (!skill) throw new NotFoundError("Skill");
  await checkSkillVisibility(skill, requesterId);

  const ver = await prisma.skillVersion.findUnique({
    where: { skillId_version: { skillId: skill.id, version } },
  });
  if (!ver) throw new NotFoundError("Version");

  return {
    id: ver.id,
    version: ver.version,
    instructions: ver.instructions,
    changelog: ver.changelog,
    qualityScore: ver.qualityScore,
    createdAt: ver.createdAt.toISOString(),
  };
}

export async function createVersion(
  userId: string,
  slug: string,
  input: { version: string; instructions: string; changelog?: string },
): Promise<VersionSummary> {
  const skill = await prisma.skill.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      description: true,
      authorId: true,
      categoryId: true,
      platforms: true,
      org: { select: { slug: true } },
    },
  });
  if (!skill) throw new NotFoundError("Skill");

  // Allow author OR org PUBLISHER+ to create versions
  if (skill.authorId !== userId) {
    if (skill.org) {
      await requireOrgRole(userId, skill.org.slug, "PUBLISHER");
    } else {
      throw new ForbiddenError("You can only create versions for your own skills");
    }
  }

  // Fetch actual category slug for quality scoring
  const category = await prisma.category.findUnique({ where: { id: skill.categoryId } });
  const qualityScore = computeQualityScore({
    name: skill.name,
    description: skill.description,
    categorySlug: category?.slug ?? "other",
    platforms: skill.platforms as any,
    instructions: input.instructions,
    version: input.version,
  });

  // All version checks and creation inside a single transaction to prevent
  // race conditions (concurrent requests creating versions simultaneously)
  const version = await prisma.$transaction(async (tx) => {
    // Check version doesn't already exist
    const existing = await tx.skillVersion.findUnique({
      where: { skillId_version: { skillId: skill.id, version: input.version } },
    });
    if (existing) throw new ConflictError(`Version ${input.version} already exists`);

    // Verify new version is higher than current latest
    const latest = await tx.skillVersion.findFirst({
      where: { skillId: skill.id, isLatest: true },
    });
    if (latest && compareSemver(input.version, latest.version) <= 0) {
      throw new ConflictError(`Version ${input.version} must be higher than current ${latest.version}`);
    }

    // Mark all existing versions as not latest
    await tx.skillVersion.updateMany({
      where: { skillId: skill.id, isLatest: true },
      data: { isLatest: false },
    });

    // Create new version
    const ver = await tx.skillVersion.create({
      data: {
        skillId: skill.id,
        version: input.version,
        instructions: input.instructions,
        changelog: input.changelog,
        qualityScore,
        isLatest: true,
      },
    });

    // Update skill quality score
    await tx.skill.update({
      where: { id: skill.id },
      data: { qualityScore },
    });

    return ver;
  });

  return {
    id: version.id,
    version: version.version,
    changelog: version.changelog,
    qualityScore: version.qualityScore,
    createdAt: version.createdAt.toISOString(),
  };
}

export async function getVersionDiff(
  slug: string,
  fromVersion: string,
  toVersion: string,
  requesterId?: string | null,
): Promise<VersionDiff> {
  const skill = await prisma.skill.findUnique({ where: { slug }, select: { id: true, visibility: true, authorId: true, orgId: true } });
  if (!skill) throw new NotFoundError("Skill");
  await checkSkillVisibility(skill, requesterId);

  const [from, to] = await Promise.all([
    prisma.skillVersion.findUnique({
      where: { skillId_version: { skillId: skill.id, version: fromVersion } },
    }),
    prisma.skillVersion.findUnique({
      where: { skillId_version: { skillId: skill.id, version: toVersion } },
    }),
  ]);

  if (!from) throw new NotFoundError(`Version ${fromVersion}`);
  if (!to) throw new NotFoundError(`Version ${toVersion}`);

  // Simple line-by-line diff
  const fromLines = from.instructions.split("\n");
  const toLines = to.instructions.split("\n");
  const diffLines: string[] = [];

  const maxLen = Math.max(fromLines.length, toLines.length);
  for (let i = 0; i < maxLen; i++) {
    const a = fromLines[i];
    const b = toLines[i];
    if (a === undefined) {
      diffLines.push(`+ ${b}`);
    } else if (b === undefined) {
      diffLines.push(`- ${a}`);
    } else if (a !== b) {
      diffLines.push(`- ${a}`);
      diffLines.push(`+ ${b}`);
    } else {
      diffLines.push(`  ${a}`);
    }
  }

  return {
    fromVersion,
    toVersion,
    diff: diffLines.join("\n"),
  };
}
