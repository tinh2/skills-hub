import { FastifyInstance } from "fastify";
import { createSkillSchema, updateSkillSchema, skillQuerySchema } from "@skills-hub/shared";
import { requireAuth, optionalAuth } from "../../common/auth.js";
import { ValidationError } from "../../common/errors.js";
import * as skillService from "./skill.service.js";

export async function skillRoutes(app: FastifyInstance) {
  // GET /api/v1/skills — list/search skills
  app.get("/", async (request) => {
    const parsed = skillQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return skillService.listSkills(parsed.data);
  });

  // GET /api/v1/skills/:slug — skill detail
  app.get<{ Params: { slug: string } }>("/:slug", async (request) => {
    return skillService.getSkillBySlug(request.params.slug);
  });

  // POST /api/v1/skills — create skill
  app.post("/", async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = createSkillSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return skillService.createSkill(userId, parsed.data);
  });

  // PATCH /api/v1/skills/:slug — update skill metadata
  app.patch<{ Params: { slug: string } }>("/:slug", async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = updateSkillSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return skillService.updateSkill(userId, request.params.slug, parsed.data);
  });

  // POST /api/v1/skills/:slug/publish — publish draft skill
  app.post<{ Params: { slug: string } }>("/:slug/publish", async (request) => {
    const { userId } = await requireAuth(request);
    return skillService.publishSkill(userId, request.params.slug);
  });

  // DELETE /api/v1/skills/:slug — archive skill
  app.delete<{ Params: { slug: string } }>("/:slug", async (request) => {
    const { userId } = await requireAuth(request);
    await skillService.archiveSkill(userId, request.params.slug);
    return { success: true };
  });
}
