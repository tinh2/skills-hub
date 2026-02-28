import { FastifyInstance } from "fastify";
import {
  createReviewSchema,
  updateReviewSchema,
  reviewVoteSchema,
  reviewResponseSchema,
} from "@skills-hub/shared";
import { requireAuth, optionalAuth } from "../../common/auth.js";
import { ValidationError } from "../../common/errors.js";
import * as reviewService from "./review.service.js";

export async function reviewRoutes(app: FastifyInstance) {
  // GET /api/v1/skills/:slug/reviews
  app.get<{ Params: { slug: string } }>("/:slug/reviews", async (request) => {
    const user = await optionalAuth(request);
    return reviewService.listReviews(request.params.slug, user?.userId ?? null);
  });

  // GET /api/v1/skills/:slug/reviews/stats
  app.get<{ Params: { slug: string } }>("/:slug/reviews/stats", async (request) => {
    return reviewService.getReviewStats(request.params.slug);
  });

  // POST /api/v1/skills/:slug/reviews
  app.post<{ Params: { slug: string } }>("/:slug/reviews", async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = createReviewSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return reviewService.createReview(userId, request.params.slug, parsed.data);
  });

  // PATCH /api/v1/reviews/:id
  app.patch<{ Params: { id: string } }>("/reviews/:id", async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = updateReviewSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    await reviewService.updateReview(userId, request.params.id, parsed.data);
    return { success: true };
  });

  // DELETE /api/v1/reviews/:id
  app.delete<{ Params: { id: string } }>("/reviews/:id", async (request) => {
    const { userId } = await requireAuth(request);
    await reviewService.deleteReview(userId, request.params.id);
    return { success: true };
  });

  // POST /api/v1/reviews/:id/vote
  app.post<{ Params: { id: string } }>("/reviews/:id/vote", async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = reviewVoteSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    await reviewService.voteReview(userId, request.params.id, parsed.data.helpful);
    return { success: true };
  });

  // POST /api/v1/reviews/:id/response
  app.post<{ Params: { id: string } }>("/reviews/:id/response", async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = reviewResponseSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    await reviewService.respondToReview(userId, request.params.id, parsed.data.body);
    return { success: true };
  });
}
