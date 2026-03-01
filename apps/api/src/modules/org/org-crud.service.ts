import { prisma } from "../../common/db.js";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../../common/errors.js";
import { requireOrgRole } from "./org.auth.js";
import type {
  CreateOrgInput,
  UpdateOrgInput,
} from "@skills-hub/shared";
import type {
  OrgDetail,
  UserOrgMembership,
} from "@skills-hub/shared";

export async function createOrg(userId: string, input: CreateOrgInput): Promise<OrgDetail> {
  const existing = await prisma.organization.findUnique({ where: { slug: input.slug } });
  if (existing) throw new ConflictError("Organization slug already taken");

  const org = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        slug: input.slug,
        name: input.name,
        description: input.description,
      },
    });

    await tx.orgMembership.create({
      data: {
        orgId: org.id,
        userId,
        role: "ADMIN",
      },
    });

    return org;
  });

  return formatOrgDetail(org, 1, 0, 0, "ADMIN");
}

export async function getOrg(slug: string, requesterId?: string | null): Promise<OrgDetail> {
  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      _count: { select: { memberships: true, skills: true } },
    },
  });

  if (!org) throw new NotFoundError("Organization");

  let currentUserRole: string | null = null;
  let totalInstalls = 0;

  if (requesterId) {
    const membership = await prisma.orgMembership.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: requesterId } },
    });
    currentUserRole = membership?.role ?? null;
  }

  const installAgg = await prisma.skill.aggregate({
    where: { orgId: org.id },
    _sum: { installCount: true },
  });
  totalInstalls = installAgg._sum.installCount ?? 0;

  return formatOrgDetail(
    org,
    org._count.memberships,
    org._count.skills,
    totalInstalls,
    currentUserRole as any,
  );
}

export async function listUserOrgs(userId: string): Promise<UserOrgMembership[]> {
  const memberships = await prisma.orgMembership.findMany({
    where: { userId },
    include: {
      org: { select: { slug: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return memberships.map((m) => ({
    org: m.org,
    role: m.role,
    joinedAt: m.createdAt.toISOString(),
  }));
}

export async function updateOrg(
  userId: string,
  slug: string,
  input: UpdateOrgInput,
): Promise<OrgDetail> {
  await requireOrgRole(userId, slug, "ADMIN");

  await prisma.organization.update({
    where: { slug },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
    },
  });

  return getOrg(slug, userId);
}

export async function deleteOrg(userId: string, slug: string): Promise<void> {
  await requireOrgRole(userId, slug, "ADMIN");

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) throw new NotFoundError("Organization");

  await prisma.$transaction(async (tx) => {
    await tx.skill.updateMany({
      where: { orgId: org.id },
      data: { visibility: "PRIVATE", orgId: null },
    });

    await tx.organization.delete({ where: { id: org.id } });
  });
}

export function formatOrgDetail(
  org: any,
  memberCount: number,
  skillCount: number,
  totalInstalls: number,
  currentUserRole: string | null,
): OrgDetail {
  return {
    id: org.id,
    slug: org.slug,
    name: org.name,
    description: org.description,
    avatarUrl: org.avatarUrl,
    githubOrg: org.githubOrg,
    memberCount,
    skillCount,
    totalInstalls,
    currentUserRole: currentUserRole as any,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}
