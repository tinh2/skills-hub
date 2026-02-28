import { FastifyInstance } from "fastify";
import { skillQuerySchema } from "@skills-hub/shared";
import { ValidationError } from "../../common/errors.js";
import * as searchService from "./search.service.js";

export async function searchRoutes(app: FastifyInstance) {
  // GET /api/v1/search?q=&category=&platform=&minScore=&sort=&cursor=&limit=
  app.get("/", async (request) => {
    const parsed = skillQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return searchService.searchSkills(parsed.data);
  });

  // GET /api/v1/search/suggestions?q=
  app.get<{ Querystring: { q?: string } }>("/suggestions", async (request) => {
    const q = request.query.q?.trim();
    if (!q || q.length < 2) return { skills: [], tags: [] };
    return searchService.getSearchSuggestions(q);
  });
}
