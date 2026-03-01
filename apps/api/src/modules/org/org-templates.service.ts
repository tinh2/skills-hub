import { prisma } from "../../common/db.js";
import {
  NotFoundError,
  ValidationError,
} from "../../common/errors.js";
import { requireOrgRole } from "./org.auth.js";
import { ORG_LIMITS } from "@skills-hub/shared";
import type { OrgSkillTemplateSummary } from "@skills-hub/shared";

export async function createTemplate(
  userId: string,
  orgSlug: string,
  input: { name: string; description?: string; categorySlug?: string; platforms?: string[]; instructions?: string },
): Promise<OrgSkillTemplateSummary> {
  await requireOrgRole(userId, orgSlug, "PUBLISHER");

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) throw new NotFoundError("Organization");

  const templateCount = await prisma.orgSkillTemplate.count({ where: { orgId: org.id } });
  if (templateCount >= ORG_LIMITS.MAX_TEMPLATES) {
    throw new ValidationError(`Maximum ${ORG_LIMITS.MAX_TEMPLATES} templates allowed`);
  }

  const template = await prisma.orgSkillTemplate.create({
    data: {
      orgId: org.id,
      name: input.name,
      description: input.description,
      categorySlug: input.categorySlug,
      platforms: (input.platforms ?? []) as any,
      instructions: input.instructions,
    },
  });

  return formatTemplate(template);
}

export async function listTemplates(
  orgSlug: string,
  requesterId: string,
): Promise<OrgSkillTemplateSummary[]> {
  await requireOrgRole(requesterId, orgSlug, "MEMBER");

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) throw new NotFoundError("Organization");

  const templates = await prisma.orgSkillTemplate.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
    take: ORG_LIMITS.MAX_TEMPLATES,
    select: {
      id: true,
      name: true,
      description: true,
      categorySlug: true,
      platforms: true,
      createdAt: true,
    },
  });

  return templates.map(formatTemplate);
}

export async function getTemplate(
  orgSlug: string,
  templateId: string,
  requesterId: string,
): Promise<OrgSkillTemplateSummary> {
  await requireOrgRole(requesterId, orgSlug, "MEMBER");

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) throw new NotFoundError("Organization");

  const template = await prisma.orgSkillTemplate.findFirst({
    where: { id: templateId, orgId: org.id },
  });
  if (!template) throw new NotFoundError("Template");

  return { ...formatTemplate(template), instructions: template.instructions };
}

export async function updateTemplate(
  userId: string,
  orgSlug: string,
  templateId: string,
  input: { name?: string; description?: string; categorySlug?: string; platforms?: string[]; instructions?: string },
): Promise<OrgSkillTemplateSummary> {
  await requireOrgRole(userId, orgSlug, "PUBLISHER");

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) throw new NotFoundError("Organization");

  const template = await prisma.orgSkillTemplate.findFirst({
    where: { id: templateId, orgId: org.id },
  });
  if (!template) throw new NotFoundError("Template");

  const updated = await prisma.orgSkillTemplate.update({
    where: { id: templateId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.categorySlug !== undefined && { categorySlug: input.categorySlug }),
      ...(input.platforms !== undefined && { platforms: input.platforms as any }),
      ...(input.instructions !== undefined && { instructions: input.instructions }),
    },
  });

  return formatTemplate(updated);
}

export async function deleteTemplate(
  userId: string,
  orgSlug: string,
  templateId: string,
): Promise<void> {
  await requireOrgRole(userId, orgSlug, "ADMIN");

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) throw new NotFoundError("Organization");

  const template = await prisma.orgSkillTemplate.findFirst({
    where: { id: templateId, orgId: org.id },
  });
  if (!template) throw new NotFoundError("Template");

  await prisma.orgSkillTemplate.delete({ where: { id: templateId } });
}

function formatTemplate(template: any): OrgSkillTemplateSummary {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    categorySlug: template.categorySlug,
    platforms: template.platforms,
    createdAt: template.createdAt.toISOString(),
  };
}
