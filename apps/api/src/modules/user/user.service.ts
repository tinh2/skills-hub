import { prisma } from "../../common/db.js";
import { hashApiKey } from "../../common/auth.js";
import { NotFoundError } from "../../common/errors.js";
import type { PublicUser, PrivateUser, ApiKeyResponse, ApiKeyCreatedResponse } from "@skills-hub/shared";

export async function getPublicProfile(username: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      _count: { select: { skills: { where: { status: "PUBLISHED" } } } },
      skills: {
        where: { status: "PUBLISHED" },
        select: { installCount: true },
      },
    },
  });

  if (!user) throw new NotFoundError("User");

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    githubUrl: user.githubUrl,
    createdAt: user.createdAt.toISOString(),
    skillCount: user._count.skills,
    totalInstalls: user.skills.reduce((sum, s) => sum + s.installCount, 0),
  };
}

export async function getPrivateProfile(userId: string): Promise<PrivateUser> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      _count: { select: { skills: { where: { status: "PUBLISHED" } } } },
      skills: {
        where: { status: "PUBLISHED" },
        select: { installCount: true },
      },
    },
  });

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    githubUrl: user.githubUrl,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    skillCount: user._count.skills,
    totalInstalls: user.skills.reduce((sum, s) => sum + s.installCount, 0),
  };
}

export async function updateProfile(
  userId: string,
  data: { displayName?: string; bio?: string },
): Promise<PrivateUser> {
  await prisma.user.update({ where: { id: userId }, data });
  return getPrivateProfile(userId);
}

export async function createApiKey(
  userId: string,
  name: string,
  expiresInDays?: number,
): Promise<ApiKeyCreatedResponse> {
  const rawKey = `sh_${crypto.randomUUID().replace(/-/g, "")}`;
  const keyHash = await hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 10) + "...";

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const apiKey = await prisma.apiKey.create({
    data: { userId, name, keyHash, keyPrefix, expiresAt },
  });

  return {
    id: apiKey.id,
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    key: rawKey,
    lastUsedAt: null,
    expiresAt: apiKey.expiresAt?.toISOString() ?? null,
    createdAt: apiKey.createdAt.toISOString(),
  };
}

export async function listApiKeys(userId: string): Promise<ApiKeyResponse[]> {
  const keys = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return keys.map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    expiresAt: k.expiresAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  }));
}

export async function deleteApiKey(userId: string, keyId: string): Promise<void> {
  const key = await prisma.apiKey.findUnique({ where: { id: keyId } });
  if (!key || key.userId !== userId) throw new NotFoundError("API key");
  await prisma.apiKey.delete({ where: { id: keyId } });
}
