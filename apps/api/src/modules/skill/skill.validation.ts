import { prisma } from "../../common/db.js";
import { NotFoundError, ForbiddenError } from "../../common/errors.js";
import { validateSkill } from "../validation/validation.service.js";
import { isOrgMember } from "../org/org.auth.js";
import type { ValidationReport } from "@skills-hub/shared";

export async function validateSkillBySlug(
  slug: string,
  userId?: string,
): Promise<ValidationReport> {
  const skill = await prisma.skill.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      description: true,
      visibility: true,
      authorId: true,
      orgId: true,
      platforms: true,
      category: { select: { slug: true } },
      versions: {
        where: { isLatest: true },
        take: 1,
        select: { version: true, instructions: true },
      },
    },
  });

  if (!skill) throw new NotFoundError("Skill");

  // Enforce visibility for non-public skills
  if (skill.visibility === "PRIVATE" && skill.authorId !== userId) {
    throw new NotFoundError("Skill");
  }
  if (skill.visibility === "ORG" && skill.orgId) {
    if (!userId) throw new NotFoundError("Skill");
    const member = await isOrgMember(userId, skill.orgId);
    if (!member) throw new NotFoundError("Skill");
  }
  if (skill.visibility === "UNLISTED" && skill.authorId !== userId) {
    throw new ForbiddenError("Only the author can validate unlisted skills");
  }

  const version = skill.versions[0];

  return validateSkill({
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    categorySlug: skill.category.slug,
    platforms: skill.platforms,
    instructions: version?.instructions ?? "",
    version: version?.version ?? "0.0.0",
  });
}
