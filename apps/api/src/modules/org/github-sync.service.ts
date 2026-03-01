import { prisma } from "../../common/db.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../../common/errors.js";
import { requireOrgRole } from "./org.auth.js";
import type { SyncGithubOrgInput } from "@skills-hub/shared";

interface GithubOrgMember {
  id: number;
  login: string;
}

export async function connectGithubOrg(
  userId: string,
  orgSlug: string,
  input: SyncGithubOrgInput,
): Promise<{ connected: boolean; membersAdded: number }> {
  await requireOrgRole(userId, orgSlug, "ADMIN");

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) throw new NotFoundError("Organization");

  // Fetch GitHub user token to verify admin access
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.githubAccessToken) {
    throw new ValidationError("GitHub access token not available. Please re-login with GitHub.");
  }

  // Verify user has admin access to the GitHub org
  const membershipRes = await fetch(
    `https://api.github.com/orgs/${input.githubOrgSlug}/memberships/${user.username}`,
    {
      headers: {
        Authorization: `Bearer ${user.githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (!membershipRes.ok) {
    throw new ForbiddenError("You must be an admin of the GitHub organization");
  }

  const membership = (await membershipRes.json()) as { role: string };
  if (membership.role !== "admin") {
    throw new ForbiddenError("You must be an admin of the GitHub organization");
  }

  // Get GitHub org details for the org ID
  const orgRes = await fetch(`https://api.github.com/orgs/${input.githubOrgSlug}`, {
    headers: {
      Authorization: `Bearer ${user.githubAccessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!orgRes.ok) {
    throw new NotFoundError("GitHub organization");
  }

  const githubOrgData = (await orgRes.json()) as { id: number; login: string };

  await prisma.organization.update({
    where: { slug: orgSlug },
    data: {
      githubOrgId: githubOrgData.id,
      githubOrg: githubOrgData.login,
    },
  });

  // Trigger initial sync
  const result = await doSync(org.id, input.githubOrgSlug, user.githubAccessToken, input.defaultRole);

  return { connected: true, membersAdded: result.added };
}

export async function syncGithubOrgMembers(
  userId: string,
  orgSlug: string,
): Promise<{ synced: number; added: number }> {
  await requireOrgRole(userId, orgSlug, "ADMIN");

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) throw new NotFoundError("Organization");
  if (!org.githubOrg) throw new ValidationError("No GitHub org connected");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.githubAccessToken) {
    throw new ValidationError("GitHub access token not available. Please re-login with GitHub.");
  }

  return doSync(org.id, org.githubOrg, user.githubAccessToken, "MEMBER");
}

export async function disconnectGithubOrg(userId: string, orgSlug: string): Promise<void> {
  await requireOrgRole(userId, orgSlug, "ADMIN");

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) throw new NotFoundError("Organization");

  await prisma.organization.update({
    where: { slug: orgSlug },
    data: { githubOrgId: null, githubOrg: null },
  });
}

export async function autoJoinGithubOrgs(userId: string, githubToken: string): Promise<void> {
  // Find orgs that have a GitHub org connected
  const connectedOrgs = await prisma.organization.findMany({
    where: { githubOrgId: { not: null } },
    select: { id: true, githubOrg: true },
  });

  if (connectedOrgs.length === 0) return;

  // Check which GitHub orgs the user belongs to
  const userOrgsRes = await fetch("https://api.github.com/user/orgs?per_page=100", {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!userOrgsRes.ok) return;

  const userOrgs = (await userOrgsRes.json()) as { login: string }[];
  const userOrgSlugs = new Set(userOrgs.map((o) => o.login.toLowerCase()));

  for (const org of connectedOrgs) {
    if (!org.githubOrg || !userOrgSlugs.has(org.githubOrg.toLowerCase())) continue;

    // Check if already a member
    const existing = await prisma.orgMembership.findUnique({
      where: { orgId_userId: { orgId: org.id, userId } },
    });
    if (existing) continue;

    await prisma.orgMembership.create({
      data: {
        orgId: org.id,
        userId,
        role: "MEMBER",
      },
    });
  }
}

async function doSync(
  orgId: string,
  githubOrgSlug: string,
  githubToken: string,
  defaultRole: string,
): Promise<{ synced: number; added: number }> {
  // Fetch all GitHub org members (paginated)
  const members: GithubOrgMember[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/orgs/${githubOrgSlug}/members?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
        },
      },
    );

    if (!res.ok) break;

    const pageMembers = (await res.json()) as GithubOrgMember[];
    if (pageMembers.length === 0) break;

    members.push(...pageMembers);
    page++;

    if (pageMembers.length < 100) break;
  }

  // Match by githubId in our User table
  const githubIds = members.map((m) => m.id);
  const matchedUsers = await prisma.user.findMany({
    where: { githubId: { in: githubIds } },
    select: { id: true, githubId: true },
  });

  let added = 0;
  for (const user of matchedUsers) {
    const existing = await prisma.orgMembership.findUnique({
      where: { orgId_userId: { orgId, userId: user.id } },
    });

    if (!existing) {
      await prisma.orgMembership.create({
        data: { orgId, userId: user.id, role: defaultRole as any },
      });
      added++;
    }
  }

  return { synced: members.length, added };
}
