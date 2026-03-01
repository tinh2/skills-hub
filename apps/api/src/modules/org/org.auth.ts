import { prisma } from "../../common/db.js";
import { ForbiddenError } from "../../common/errors.js";
import type { OrgRole } from "@prisma/client";

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  MEMBER: 0,
  PUBLISHER: 1,
  ADMIN: 2,
};

export async function requireOrgRole(
  userId: string,
  orgSlug: string,
  minRole: OrgRole,
) {
  const membership = await prisma.orgMembership.findFirst({
    where: {
      userId,
      org: { slug: orgSlug },
    },
    include: { org: { select: { id: true, slug: true } } },
  });

  if (!membership) {
    throw new ForbiddenError("You are not a member of this organization");
  }

  if (ROLE_HIERARCHY[membership.role] < ROLE_HIERARCHY[minRole]) {
    throw new ForbiddenError(`Requires ${minRole} role or higher`);
  }

  return membership;
}

export async function requireOrgMember(userId: string, orgSlug: string) {
  return requireOrgRole(userId, orgSlug, "MEMBER");
}

export async function isOrgMember(userId: string, orgId: string): Promise<boolean> {
  const membership = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  return !!membership;
}
