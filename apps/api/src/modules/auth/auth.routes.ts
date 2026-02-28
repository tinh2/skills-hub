import { FastifyInstance } from "fastify";
import { githubCallbackSchema } from "@skills-hub/shared";
import { exchangeGithubCode, refreshAccessToken, revokeRefreshToken } from "./auth.service.js";
import { getPublicProfile } from "../user/user.service.js";
import { getEnv } from "../../config/env.js";
import { ValidationError, UnauthorizedError } from "../../common/errors.js";
import { authRateLimit } from "../../config/rate-limits.js";

export async function authRoutes(app: FastifyInstance) {
  const env = getEnv();

  const cookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/v1/auth",
    maxAge: env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60,
  };

  // GET /api/v1/auth/github — redirect to GitHub OAuth
  app.get("/github", authRateLimit, async (_request, reply) => {
    const state = crypto.randomUUID().replace(/-/g, "");
    reply.setCookie("oauth_state", state, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/v1/auth",
      maxAge: 300, // 5 minutes
    });

    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_CALLBACK_URL,
      scope: "read:user user:email",
      state,
    });
    reply.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });

  // POST /api/v1/auth/github/callback — exchange code for tokens
  app.post("/github/callback", authRateLimit, async (request, reply) => {
    const parsed = githubCallbackSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    // Validate CSRF state
    const cookieState = (request.cookies as Record<string, string>).oauth_state;
    if (!cookieState || cookieState !== parsed.data.state) {
      throw new ValidationError("Invalid or missing OAuth state parameter");
    }
    reply.clearCookie("oauth_state", { path: "/api/v1/auth" });

    const { user, accessToken, refreshToken } = await exchangeGithubCode(parsed.data.code);

    reply.setCookie("refreshToken", refreshToken, cookieOptions);

    const publicUser = await getPublicProfile(user.username);

    return {
      accessToken,
      expiresIn: 900, // 15 minutes
      user: publicUser,
    };
  });

  // POST /api/v1/auth/refresh — exchange refresh token for new access token
  app.post("/refresh", async (request, reply) => {
    const rawToken = (request.cookies as Record<string, string>).refreshToken;
    if (!rawToken) {
      throw new UnauthorizedError("No refresh token");
    }

    const result = await refreshAccessToken(rawToken);

    reply.setCookie("refreshToken", result.refreshToken, cookieOptions);

    return {
      accessToken: result.accessToken,
      expiresIn: 900,
    };
  });

  // DELETE /api/v1/auth/session — logout
  app.delete("/session", async (request, reply) => {
    const rawToken = (request.cookies as Record<string, string>).refreshToken;
    if (rawToken) {
      await revokeRefreshToken(rawToken);
    }
    reply.clearCookie("refreshToken", { path: "/api/v1/auth" });
    return { success: true };
  });
}
