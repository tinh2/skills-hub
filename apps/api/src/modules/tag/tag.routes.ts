import { FastifyInstance } from "fastify";
import { searchTags } from "./tag.service.js";

export async function tagRoutes(app: FastifyInstance) {
  // GET /api/v1/tags?q= — list/search tags for autocomplete
  app.get<{ Querystring: { q?: string; limit?: string } }>("/", async (request) => {
    const { q, limit } = request.query;
    return searchTags(q, limit ? Number(limit) : undefined);
  });
}
