import { prisma } from "../../common/db.js";
import { hashApiKey } from "../../common/auth.js";
import { NotFoundError, ValidationError } from "../../common/errors.js";
import type { PublicUser, PrivateUser, ApiKeyResponse, ApiKeyCreatedResponse } from "@skills-hub/shared";

const MAX_API_KEYS_PER_USER = 10;

export async function getPublicProfile(username: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      githubUrl: true,
      createdAt: true,
      _count: { select: { skills: { where: { status: "PUBLISHED" } } } },
    },
  });

  if (!user) throw new NotFoundError("User");

  const installSum = await prisma.skill.aggregate({
    where: { authorId: user.id, status: "PUBLISHED" },
    _sum: { installCount: true },
  });

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    githubUrl: user.githubUrl,
    createdAt: user.createdAt.toISOString(),
    skillCount: user._count.skills,
    totalInstalls: installSum._sum.installCount ?? 0,
  };
}

export async function getPrivateProfile(userId: string): Promise<PrivateUser> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      githubUrl: true,
      email: true,
      createdAt: true,
      _count: { select: { skills: { where: { status: "PUBLISHED" } } } },
    },
  });

  const installSum = await prisma.skill.aggregate({
    where: { authorId: userId, status: "PUBLISHED" },
    _sum: { installCount: true },
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
    totalInstalls: installSum._sum.installCount ?? 0,
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
  const existingCount = await prisma.apiKey.count({ where: { userId } });
  if (existingCount >= MAX_API_KEYS_PER_USER) {
    throw new ValidationError(`Maximum ${MAX_API_KEYS_PER_USER} API keys per user`);
  }

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
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
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
  const key = await prisma.apiKey.findUnique({
    where: { id: keyId },
    select: { id: true, userId: true },
  });
  if (!key || key.userId !== userId) throw new NotFoundError("API key");
  await prisma.apiKey.delete({ where: { id: keyId } });
}
