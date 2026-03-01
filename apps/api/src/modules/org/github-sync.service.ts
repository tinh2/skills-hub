import { prisma } from "../../common/db.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../../common/errors.js";
import { fetchWithTimeout } from "../../common/fetch.js";
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
  const membershipRes = await fetchWithTimeout(
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
  const orgRes = await fetchWithTimeout(`https://api.github.com/orgs/${input.githubOrgSlug}`, {
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
  const userOrgsRes = await fetchWithTimeout("https://api.github.com/user/orgs?per_page=100", {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!userOrgsRes.ok) return;

  const userOrgs = (await userOrgsRes.json()) as { login: string }[];
  const userOrgSlugs = new Set(userOrgs.map((o) => o.login.toLowerCase()));

  // Filter to orgs the user belongs to on GitHub
  const matchingOrgs = connectedOrgs.filter(
    (org) => org.githubOrg && userOrgSlugs.has(org.githubOrg.toLowerCase()),
  );

  if (matchingOrgs.length === 0) return;

  const matchingOrgIds = matchingOrgs.map((o) => o.id);

  // Batch check existing memberships (single query instead of N)
  const existingMemberships = await prisma.orgMembership.findMany({
    where: { userId, orgId: { in: matchingOrgIds } },
    select: { orgId: true },
  });
  const existingOrgIds = new Set(existingMemberships.map((m) => m.orgId));

  // Create missing memberships
  const toCreate = matchingOrgs
    .filter((org) => !existingOrgIds.has(org.id))
    .map((org) => ({ orgId: org.id, userId, role: "MEMBER" as const }));

  if (toCreate.length > 0) {
    await prisma.orgMembership.createMany({ data: toCreate, skipDuplicates: true });
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
    const res = await fetchWithTimeout(
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

  // Batch check existing memberships
  const matchedUserIds = matchedUsers.map((u) => u.id);
  const existingMembers = await prisma.orgMembership.findMany({
    where: { orgId, userId: { in: matchedUserIds } },
    select: { userId: true },
  });
  const existingUserIds = new Set(existingMembers.map((m) => m.userId));

  const toCreate = matchedUsers
    .filter((u) => !existingUserIds.has(u.id))
    .map((u) => ({ orgId, userId: u.id, role: defaultRole as any }));

  if (toCreate.length > 0) {
    await prisma.orgMembership.createMany({ data: toCreate, skipDuplicates: true });
  }

  return { synced: members.length, added: toCreate.length };
}
