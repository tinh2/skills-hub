import { FastifyInstance } from "fastify";
import { requireAuth } from "../../common/auth.js";
import { writeRateLimit } from "../../config/rate-limits.js";
import * as likeService from "./like.service.js";

export async function likeRoutes(app: FastifyInstance) {
  // POST /api/v1/skills/:slug/like — toggle like
  app.post<{ Params: { slug: string } }>(
    "/:slug/like",
    writeRateLimit,
    async (request) => {
      const { userId } = await requireAuth(request);
      return likeService.toggleLike(userId, request.params.slug);
    },
  );
}
