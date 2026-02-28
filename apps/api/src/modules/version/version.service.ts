import { prisma } from "../../common/db.js";
import { NotFoundError, ForbiddenError, ConflictError } from "../../common/errors.js";
import { computeQualityScore } from "../validation/validation.service.js";
import { compareSemver } from "@skills-hub/skill-parser";
import type { VersionSummary, VersionDetail, VersionDiff } from "@skills-hub/shared";

export async function listVersions(slug: string): Promise<VersionSummary[]> {
  const skill = await prisma.skill.findUnique({ where: { slug } });
  if (!skill) throw new NotFoundError("Skill");

  const versions = await prisma.skillVersion.findMany({
    where: { skillId: skill.id },
    orderBy: { createdAt: "desc" },
  });

  return versions.map((v) => ({
    id: v.id,
    version: v.version,
    changelog: v.changelog,
    qualityScore: v.qualityScore,
    createdAt: v.createdAt.toISOString(),
  }));
}

export async function getVersion(slug: string, version: string): Promise<VersionDetail> {
  const skill = await prisma.skill.findUnique({ where: { slug } });
  if (!skill) throw new NotFoundError("Skill");

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
  const skill = await prisma.skill.findUnique({ where: { slug } });
  if (!skill) throw new NotFoundError("Skill");
  if (skill.authorId !== userId) throw new ForbiddenError("You can only create versions for your own skills");

  // Check version doesn't already exist
  const existing = await prisma.skillVersion.findUnique({
    where: { skillId_version: { skillId: skill.id, version: input.version } },
  });
  if (existing) throw new ConflictError(`Version ${input.version} already exists`);

  // Verify new version is higher than current latest
  const latest = await prisma.skillVersion.findFirst({
    where: { skillId: skill.id, isLatest: true },
  });
  if (latest && compareSemver(input.version, latest.version) <= 0) {
    throw new ConflictError(`Version ${input.version} must be higher than current ${latest.version}`);
  }

  const qualityScore = computeQualityScore({
    name: skill.name,
    description: skill.description,
    categorySlug: "build", // category already validated
    platforms: skill.platforms as any,
    instructions: input.instructions,
    version: input.version,
  });

  const version = await prisma.$transaction(async (tx) => {
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
): Promise<VersionDiff> {
  const skill = await prisma.skill.findUnique({ where: { slug } });
  if (!skill) throw new NotFoundError("Skill");

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
