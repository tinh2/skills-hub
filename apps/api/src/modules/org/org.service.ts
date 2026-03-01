import { prisma } from "../../common/db.js";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from "../../common/errors.js";
import { requireOrgRole, isOrgMember } from "./org.auth.js";
import { ORG_LIMITS } from "@skills-hub/shared";
import type {
  CreateOrgInput,
  UpdateOrgInput,
  InviteMemberInput,
  OrgQuery,
} from "@skills-hub/shared";
import type {
  OrgSummary,
  OrgDetail,
  OrgMember,
  OrgInviteData,
  OrgSkillTemplateSummary,
  UserOrgMembership,
} from "@skills-hub/shared";

// --- Org CRUD ---

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
    // Archive org skills to PRIVATE
    await tx.skill.updateMany({
      where: { orgId: org.id },
      data: { visibility: "PRIVATE", orgId: null },
    });

    await tx.organization.delete({ where: { id: org.id } });
  });
}

// --- Members ---

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

  // Self-leave or admin removing others
  if (userId !== targetUserId) {
    await requireOrgRole(userId, orgSlug, "ADMIN");
  }

  const targetMembership = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: targetUserId } },
  });
  if (!targetMembership) throw new NotFoundError("Member");

  // Prevent removing the last admin
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

  // Prevent demoting the last admin
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

// --- Invites ---

export async function inviteMember(
  userId: string,
  orgSlug: string,
  input: InviteMemberInput,
): Promise<OrgInviteData> {
  await requireOrgRole(userId, orgSlug, "ADMIN");

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) throw new NotFoundError("Organization");

  // Check pending invite limit
  const pendingCount = await prisma.orgInvite.count({
    where: { orgId: org.id, status: "PENDING" },
  });
  if (pendingCount >= ORG_LIMITS.MAX_PENDING_INVITES) {
    throw new ValidationError(`Maximum ${ORG_LIMITS.MAX_PENDING_INVITES} pending invites allowed`);
  }

  // Check member limit
  const memberCount = await prisma.orgMembership.count({ where: { orgId: org.id } });
  if (memberCount >= ORG_LIMITS.MAX_MEMBERS) {
    throw new ValidationError(`Organization is at max capacity (${ORG_LIMITS.MAX_MEMBERS} members)`);
  }

  // Look up invitee
  let inviteeUserId: string | undefined;
  if (input.username) {
    const user = await prisma.user.findUnique({ where: { username: input.username } });
    if (!user) throw new NotFoundError("User");

    // Check if already a member
    const existing = await prisma.orgMembership.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: user.id } },
    });
    if (existing) throw new ConflictError("User is already a member of this organization");

    // Check for duplicate pending invite
    const pendingInvite = await prisma.orgInvite.findFirst({
      where: { orgId: org.id, inviteeUserId: user.id, status: "PENDING" },
    });
    if (pendingInvite) throw new ConflictError("User already has a pending invite");

    inviteeUserId = user.id;
  }

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + ORG_LIMITS.INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const invite = await prisma.orgInvite.create({
    data: {
      orgId: org.id,
      invitedByUserId: userId,
      inviteeUsername: input.username,
      inviteeUserId,
      role: (input.role ?? "MEMBER") as any,
      token,
      expiresAt,
    },
    include: {
      invitedBy: { select: { username: true } },
    },
  });

  return formatInvite(invite);
}

export async function acceptInvite(userId: string, token: string): Promise<void> {
  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    include: { org: true },
  });

  if (!invite) throw new NotFoundError("Invite");
  if (invite.status !== "PENDING") throw new ValidationError("Invite is no longer valid");
  if (invite.expiresAt < new Date()) {
    await prisma.orgInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    throw new ValidationError("Invite has expired");
  }

  // If invite is targeted to a specific user, verify
  if (invite.inviteeUserId && invite.inviteeUserId !== userId) {
    throw new ForbiddenError("This invite is not for you");
  }

  // Check if already a member
  const existing = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: invite.orgId, userId } },
  });
  if (existing) {
    await prisma.orgInvite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.orgMembership.create({
      data: {
        orgId: invite.orgId,
        userId,
        role: invite.role,
      },
    });

    await tx.orgInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", inviteeUserId: userId },
    });
  });
}

export async function declineInvite(userId: string, token: string): Promise<void> {
  const invite = await prisma.orgInvite.findUnique({ where: { token } });

  if (!invite) throw new NotFoundError("Invite");
  if (invite.status !== "PENDING") throw new ValidationError("Invite is no longer valid");

  if (invite.inviteeUserId && invite.inviteeUserId !== userId) {
    throw new ForbiddenError("This invite is not for you");
  }

  await prisma.orgInvite.update({
    where: { id: invite.id },
    data: { status: "DECLINED", inviteeUserId: userId },
  });
}

export async function revokeInvite(
  userId: string,
  orgSlug: string,
  inviteId: string,
): Promise<void> {
  await requireOrgRole(userId, orgSlug, "ADMIN");

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) throw new NotFoundError("Organization");

  const invite = await prisma.orgInvite.findFirst({
    where: { id: inviteId, orgId: org.id, status: "PENDING" },
  });
  if (!invite) throw new NotFoundError("Invite");

  await prisma.orgInvite.delete({ where: { id: invite.id } });
}

export async function listInvites(
  orgSlug: string,
  requesterId: string,
): Promise<OrgInviteData[]> {
  await requireOrgRole(requesterId, orgSlug, "ADMIN");

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) throw new NotFoundError("Organization");

  const invites = await prisma.orgInvite.findMany({
    where: { orgId: org.id, status: "PENDING" },
    include: { invitedBy: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });

  return invites.map(formatInvite);
}

// --- Skill Templates ---

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
  });

  return templates.map(formatTemplate);
}

export async function getTemplate(
  orgSlug: string,
  templateId: string,
  requesterId: string,
): Promise<OrgSkillTemplateSummary & { instructions: string | null }> {
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

// --- Helpers ---

function generateInviteToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function formatOrgDetail(
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

function formatInvite(invite: any): OrgInviteData {
  return {
    id: invite.id,
    token: invite.token,
    inviteeUsername: invite.inviteeUsername,
    role: invite.role,
    status: invite.status,
    invitedBy: invite.invitedBy.username,
    expiresAt: invite.expiresAt.toISOString(),
    createdAt: invite.createdAt.toISOString(),
  };
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
