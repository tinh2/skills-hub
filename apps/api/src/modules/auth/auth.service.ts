import { prisma } from "../../common/db.js";
import { createAccessToken, createRefreshToken, hashToken } from "../../common/auth.js";
import { getEnv } from "../../config/env.js";
import { AppError, UnauthorizedError } from "../../common/errors.js";

interface GithubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  email: string | null;
}

interface GithubTokenResponse {
  access_token: string;
  token_type: string;
}

const MAX_REFRESH_TOKENS_PER_USER = 5;

export async function exchangeGithubCode(code: string) {
  const env = getEnv();

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  if (!tokenRes.ok) {
    throw new AppError(502, "GITHUB_AUTH_FAILED", "Failed to exchange GitHub code for token");
  }

  const tokenData = (await tokenRes.json()) as GithubTokenResponse;
  if (!tokenData.access_token) {
    throw new AppError(502, "GITHUB_AUTH_FAILED", "GitHub OAuth: no access token in response");
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!userRes.ok) {
    throw new AppError(502, "GITHUB_API_FAILED", "Failed to fetch GitHub user profile");
  }

  const githubUser = (await userRes.json()) as GithubUser;

  // Upsert user — username is set once at first login, never changed
  const user = await prisma.user.upsert({
    where: { githubId: githubUser.id },
    update: {
      avatarUrl: githubUser.avatar_url,
      email: githubUser.email,
    },
    create: {
      githubId: githubUser.id,
      username: githubUser.login,
      displayName: githubUser.name,
      avatarUrl: githubUser.avatar_url,
      githubUrl: githubUser.html_url,
      email: githubUser.email,
    },
  });

  const accessToken = await createAccessToken(user.id, user.username);
  const refreshToken = await createRefreshToken();

  // Persist hashed refresh token in DB
  const tokenHash = await hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { tokenHash, userId: user.id, expiresAt },
  });

  // Clean up old tokens — keep only the most recent ones per user
  const tokens = await prisma.refreshToken.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (tokens.length > MAX_REFRESH_TOKENS_PER_USER) {
    const idsToDelete = tokens.slice(MAX_REFRESH_TOKENS_PER_USER).map((t) => t.id);
    await prisma.refreshToken.deleteMany({ where: { id: { in: idsToDelete } } });
  }

  return { user, accessToken, refreshToken };
}

export async function refreshAccessToken(rawToken: string) {
  const env = getEnv();
  const tokenHash = await hashToken(rawToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, username: true } } },
  });

  if (!stored) {
    throw new UnauthorizedError("Invalid refresh token");
  }

  if (stored.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    throw new UnauthorizedError("Refresh token expired");
  }

  // Rotate: delete old token, issue new one
  const newRawToken = await createRefreshToken();
  const newTokenHash = await hashToken(newRawToken);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { id: stored.id } }),
    prisma.refreshToken.create({
      data: { tokenHash: newTokenHash, userId: stored.userId, expiresAt },
    }),
  ]);

  const accessToken = await createAccessToken(stored.user.id, stored.user.username);

  return { accessToken, refreshToken: newRawToken };
}

export async function revokeRefreshToken(rawToken: string) {
  const tokenHash = await hashToken(rawToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}
