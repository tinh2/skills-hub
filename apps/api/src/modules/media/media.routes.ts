import { FastifyInstance } from "fastify";
import { addMediaSchema, reorderMediaSchema } from "@skills-hub-ai/shared";
import { requireAuth } from "../../common/auth.js";
import { ValidationError } from "../../common/errors.js";
import { writeRateLimit } from "../../config/rate-limits.js";
import * as mediaService from "./media.service.js";

export async function mediaRoutes(app: FastifyInstance) {
  // POST /api/v1/skills/:slug/media — add media
  app.post<{ Params: { slug: string } }>(
    "/:slug/media",
    writeRateLimit,
    async (request) => {
      const { userId } = await requireAuth(request);
      const parsed = addMediaSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
      return mediaService.addMedia(userId, request.params.slug, parsed.data);
    },
  );

  // DELETE /api/v1/skills/:slug/media/:id — remove media
  app.delete<{ Params: { slug: string; id: string } }>(
    "/:slug/media/:id",
    writeRateLimit,
    async (request) => {
      const { userId } = await requireAuth(request);
      await mediaService.removeMedia(userId, request.params.slug, request.params.id);
      return { success: true };
    },
  );

  // PUT /api/v1/skills/:slug/media/reorder — reorder media
  app.put<{ Params: { slug: string } }>(
    "/:slug/media/reorder",
    writeRateLimit,
    async (request) => {
      const { userId } = await requireAuth(request);
      const parsed = reorderMediaSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
      await mediaService.reorderMedia(userId, request.params.slug, parsed.data);
      return { success: true };
    },
  );
}
