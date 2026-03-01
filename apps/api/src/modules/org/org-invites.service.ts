import { prisma } from "../../common/db.js";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from "../../common/errors.js";
import { requireOrgRole } from "./org.auth.js";
import { ORG_LIMITS } from "@skills-hub/shared";
import type { InviteMemberInput } from "@skills-hub/shared";
import type { OrgInviteData } from "@skills-hub/shared";

export async function inviteMember(
  userId: string,
  orgSlug: string,
  input: InviteMemberInput,
): Promise<OrgInviteData> {
  await requireOrgRole(userId, orgSlug, "ADMIN");

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) throw new NotFoundError("Organization");

  const pendingCount = await prisma.orgInvite.count({
    where: { orgId: org.id, status: "PENDING" },
  });
  if (pendingCount >= ORG_LIMITS.MAX_PENDING_INVITES) {
    throw new ValidationError(`Maximum ${ORG_LIMITS.MAX_PENDING_INVITES} pending invites allowed`);
  }

  const memberCount = await prisma.orgMembership.count({ where: { orgId: org.id } });
  if (memberCount >= ORG_LIMITS.MAX_MEMBERS) {
    throw new ValidationError(`Organization is at max capacity (${ORG_LIMITS.MAX_MEMBERS} members)`);
  }

  // username is guaranteed non-empty by inviteMemberSchema (z.string().min(1))
  const user = await prisma.user.findUnique({ where: { username: input.username } });
  if (!user) throw new NotFoundError("User");

  const existing = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: user.id } },
  });
  if (existing) throw new ConflictError("User is already a member of this organization");

  const pendingInvite = await prisma.orgInvite.findFirst({
    where: { orgId: org.id, inviteeUserId: user.id, status: "PENDING" },
  });
  if (pendingInvite) throw new ConflictError("User already has a pending invite");

  const inviteeUserId = user.id;

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
    select: {
      id: true, token: true, inviteeUsername: true, role: true,
      status: true, expiresAt: true, createdAt: true,
      invitedBy: { select: { username: true } },
    },
  });

  return formatInvite(invite);
}

export async function acceptInvite(userId: string, token: string): Promise<void> {
  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    select: { id: true, orgId: true, status: true, expiresAt: true, inviteeUserId: true, role: true },
  });

  if (!invite) throw new NotFoundError("Invite");
  if (invite.status !== "PENDING") throw new ValidationError("Invite is no longer valid");
  if (invite.expiresAt < new Date()) {
    await prisma.orgInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    throw new ValidationError("Invite has expired");
  }

  if (invite.inviteeUserId && invite.inviteeUserId !== userId) {
    throw new ForbiddenError("This invite is not for you");
  }

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
    select: {
      id: true, token: true, inviteeUsername: true, role: true,
      status: true, expiresAt: true, createdAt: true,
      invitedBy: { select: { username: true } },
    },
    orderBy: { createdAt: "desc" },
    take: ORG_LIMITS.MAX_PENDING_INVITES,
  });

  return invites.map(formatInvite);
}

function generateInviteToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
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
