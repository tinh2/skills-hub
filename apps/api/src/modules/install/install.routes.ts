import { FastifyInstance } from "fastify";
import { recordInstallSchema } from "@skills-hub/shared";
import { optionalAuth } from "../../common/auth.js";
import { ValidationError } from "../../common/errors.js";
import * as installService from "./install.service.js";

export async function installRoutes(app: FastifyInstance) {
  // POST /api/v1/skills/:slug/install — record an installation
  app.post<{ Params: { slug: string } }>("/:slug/install", async (request) => {
    const user = await optionalAuth(request);
    const parsed = recordInstallSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    await installService.recordInstall(request.params.slug, parsed.data, user?.userId ?? null);
    return { success: true };
  });
}
