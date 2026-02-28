import { FastifyInstance } from "fastify";
import { githubCallbackSchema } from "@skills-hub/shared";
import { exchangeGithubCode } from "./auth.service.js";
import { getPublicProfile } from "../user/user.service.js";
import { getEnv } from "../../config/env.js";
import { ValidationError } from "../../common/errors.js";
import { authRateLimit } from "../../config/rate-limits.js";

export async function authRoutes(app: FastifyInstance) {
  // GET /api/v1/auth/github — redirect to GitHub OAuth
  app.get("/github", authRateLimit, async (_request, reply) => {
    const env = getEnv();
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_CALLBACK_URL,
      scope: "read:user user:email",
    });
    reply.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });

  // POST /api/v1/auth/github/callback — exchange code for tokens
  app.post("/github/callback", authRateLimit, async (request, reply) => {
    const parsed = githubCallbackSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { user, accessToken, refreshToken } = await exchangeGithubCode(parsed.data.code);
    const env = getEnv();

    reply.setCookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/v1/auth",
      maxAge: env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60,
    });

    const publicUser = await getPublicProfile(user.username);

    return {
      accessToken,
      expiresIn: 900, // 15 minutes
      user: publicUser,
    };
  });

  // DELETE /api/v1/auth/session — logout
  app.delete("/session", async (_request, reply) => {
    reply.clearCookie("refreshToken", { path: "/api/v1/auth" });
    return { success: true };
  });
}
