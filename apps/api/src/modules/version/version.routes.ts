import { FastifyInstance } from "fastify";
import { createVersionSchema } from "@skills-hub/shared";
import { requireAuth, optionalAuth } from "../../common/auth.js";
import { ValidationError } from "../../common/errors.js";
import { writeRateLimit } from "../../config/rate-limits.js";
import * as versionService from "./version.service.js";

export async function versionRoutes(app: FastifyInstance) {
  // GET /api/v1/skills/:slug/versions
  app.get<{ Params: { slug: string } }>("/:slug/versions", async (request) => {
    const user = await optionalAuth(request);
    return versionService.listVersions(request.params.slug, user?.userId ?? null);
  });

  // GET /api/v1/skills/:slug/versions/:version
  app.get<{ Params: { slug: string; version: string } }>(
    "/:slug/versions/:version",
    async (request) => {
      const user = await optionalAuth(request);
      return versionService.getVersion(request.params.slug, request.params.version, user?.userId ?? null);
    },
  );

  // POST /api/v1/skills/:slug/versions
  app.post<{ Params: { slug: string } }>("/:slug/versions", writeRateLimit, async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = createVersionSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return versionService.createVersion(userId, request.params.slug, parsed.data);
  });

  // GET /api/v1/skills/:slug/versions/:from/diff/:to
  app.get<{ Params: { slug: string; from: string; to: string } }>(
    "/:slug/versions/:from/diff/:to",
    async (request) => {
      const user = await optionalAuth(request);
      return versionService.getVersionDiff(
        request.params.slug,
        request.params.from,
        request.params.to,
        user?.userId ?? null,
      );
    },
  );
}
