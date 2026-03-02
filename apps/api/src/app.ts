import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { getEnv } from "./config/env.js";
import { AppError } from "./common/errors.js";
import { captureException } from "./common/sentry.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { userRoutes } from "./modules/user/user.routes.js";
import { skillRoutes } from "./modules/skill/skill.routes.js";
import { versionRoutes } from "./modules/version/version.routes.js";
import { reviewRoutes } from "./modules/review/review.routes.js";
import { searchRoutes } from "./modules/search/search.routes.js";
import { categoryRoutes } from "./modules/category/category.routes.js";
import { tagRoutes } from "./modules/tag/tag.routes.js";
import { installRoutes } from "./modules/install/install.routes.js";
import { likeRoutes } from "./modules/like/like.routes.js";
import { mediaRoutes } from "./modules/media/media.routes.js";
import { orgRoutes } from "./modules/org/org.routes.js";
import { inviteRoutes } from "./modules/org/invite.routes.js";
import { sandboxRoutes } from "./modules/sandbox/sandbox.routes.js";
import { agentRoutes } from "./modules/agent/agent.routes.js";
import { reportRoutes } from "./modules/report/report.routes.js";
import { moderationRoutes } from "./modules/moderation/moderation.routes.js";

export async function buildApp(opts?: { logger?: boolean }) {
  const env = getEnv();

  const app = Fastify({
    logger: opts?.logger ?? false,
    bodyLimit: 8 * 1024 * 1024,
  });

  // Plugins
  await app.register(cors, {
    origin: [env.FRONTEND_URL],
    credentials: true,
  });

  await app.register(cookie);

  await app.register(rateLimit, {
    max: 300,
    timeWindow: "1 minute",
  });

  // Error handler
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
      return;
    }

    const err = error as Error & { code?: string };
    if (err.name === "ZodError") {
      reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: err.message },
      });
      return;
    }

    if (err.name === "NotFoundError" || err.code === "P2025") {
      reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Resource not found" },
      });
      return;
    }

    if (err.code === "P2002") {
      reply.status(409).send({
        error: { code: "CONFLICT", message: "Resource already exists" },
      });
      return;
    }

    captureException(error);
    if (opts?.logger) app.log.error(error);
    reply.status(500).send({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  });

  // Routes — all under /api/v1
  await app.register(
    async (api) => {
      await api.register(authRoutes, { prefix: "/auth" });
      await api.register(userRoutes, { prefix: "/users" });
      await api.register(skillRoutes, { prefix: "/skills" });
      await api.register(versionRoutes, { prefix: "/skills" });
      await api.register(reviewRoutes, { prefix: "/skills" });
      await api.register(installRoutes, { prefix: "/skills" });
      await api.register(likeRoutes, { prefix: "/skills" });
      await api.register(mediaRoutes, { prefix: "/skills" });
      await api.register(searchRoutes, { prefix: "/search" });
      await api.register(categoryRoutes, { prefix: "/categories" });
      await api.register(tagRoutes, { prefix: "/tags" });
      await api.register(orgRoutes, { prefix: "/orgs" });
      await api.register(inviteRoutes, { prefix: "/invites" });
      await api.register(sandboxRoutes, { prefix: "/skills" });
      await api.register(agentRoutes, { prefix: "/agents" });
      await api.register(reportRoutes);
      await api.register(moderationRoutes, { prefix: "/admin" });
    },
    { prefix: "/api/v1" },
  );

  // Health check
  app.get("/health", async () => ({ status: "ok" }));

  return app;
}
