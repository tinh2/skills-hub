import { FastifyInstance } from "fastify";
import { z } from "zod";
import { searchTags } from "./tag.service.js";
import { ValidationError } from "../../common/errors.js";

const tagSearchSchema = z.object({
  q: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export async function tagRoutes(app: FastifyInstance) {
  // GET /api/v1/tags?q= — list/search tags for autocomplete
  app.get<{ Querystring: { q?: string; limit?: string } }>("/", async (request) => {
    const parsed = tagSearchSchema.safeParse(request.query);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return searchTags(parsed.data.q, parsed.data.limit);
  });
}
