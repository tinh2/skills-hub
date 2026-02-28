import { prisma } from "../../common/db.js";
import { createAccessToken, createRefreshToken } from "../../common/auth.js";
import { getEnv } from "../../config/env.js";
import { AppError } from "../../common/errors.js";

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

  return { user, accessToken, refreshToken };
}
