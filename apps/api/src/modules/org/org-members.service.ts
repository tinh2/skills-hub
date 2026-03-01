import { prisma } from "../../common/db.js";
import {
  NotFoundError,
  ValidationError,
} from "../../common/errors.js";
import { requireOrgRole } from "./org.auth.js";
import type { OrgQuery } from "@skills-hub/shared";
import type { OrgMember } from "@skills-hub/shared";

export async function listMembers(
  slug: string,
  requesterId: string,
  query: OrgQuery,
): Promise<{ data: OrgMember[]; cursor: string | null; hasMore: boolean }> {
  await requireOrgRole(requesterId, slug, "MEMBER");

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) throw new NotFoundError("Organization");

  const where: any = { orgId: org.id };
  if (query.q) {
    where.user = { username: { contains: query.q, mode: "insensitive" } };
  }

  const findArgs: any = {
    where,
    take: query.limit + 1,
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  };

  if (query.cursor) {
    findArgs.cursor = { id: query.cursor };
    findArgs.skip = 1;
  }

  const memberships = await prisma.orgMembership.findMany(findArgs);
  const hasMore = memberships.length > query.limit;
  const data = memberships.slice(0, query.limit);

  return {
    data: data.map((m: any) => ({
      user: m.user,
      role: m.role,
      joinedAt: m.createdAt.toISOString(),
    })),
    cursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
  };
}

export async function removeMember(
  userId: string,
  orgSlug: string,
  targetUserId: string,
): Promise<void> {
  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) throw new NotFoundError("Organization");

  if (userId !== targetUserId) {
    await requireOrgRole(userId, orgSlug, "ADMIN");
  }

  const targetMembership = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: targetUserId } },
  });
  if (!targetMembership) throw new NotFoundError("Member");

  if (targetMembership.role === "ADMIN") {
    const adminCount = await prisma.orgMembership.count({
      where: { orgId: org.id, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      throw new ValidationError("Cannot remove the last admin. Transfer ownership first.");
    }
  }

  await prisma.orgMembership.delete({
    where: { orgId_userId: { orgId: org.id, userId: targetUserId } },
  });
}

export async function updateMemberRole(
  userId: string,
  orgSlug: string,
  targetUserId: string,
  role: string,
): Promise<OrgMember> {
  await requireOrgRole(userId, orgSlug, "ADMIN");

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) throw new NotFoundError("Organization");

  const targetMembership = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: targetUserId } },
    include: { user: { select: { id: true, username: true, avatarUrl: true } } },
  });
  if (!targetMembership) throw new NotFoundError("Member");

  if (targetMembership.role === "ADMIN" && role !== "ADMIN") {
    const adminCount = await prisma.orgMembership.count({
      where: { orgId: org.id, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      throw new ValidationError("Cannot demote the last admin. Promote another admin first.");
    }
  }

  const updated = await prisma.orgMembership.update({
    where: { orgId_userId: { orgId: org.id, userId: targetUserId } },
    data: { role: role as any },
    include: { user: { select: { id: true, username: true, avatarUrl: true } } },
  });

  return {
    user: updated.user,
    role: updated.role,
    joinedAt: updated.createdAt.toISOString(),
  };
}
