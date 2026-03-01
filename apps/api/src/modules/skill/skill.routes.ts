import { FastifyInstance } from "fastify";
import { createSkillSchema, updateSkillSchema, skillQuerySchema, compositionSchema } from "@skills-hub/shared";
import { requireAuth, optionalAuth } from "../../common/auth.js";
import { ValidationError } from "../../common/errors.js";
import { writeRateLimit } from "../../config/rate-limits.js";
import * as skillService from "./skill.service.js";
import { validateSkillBySlug } from "./skill.validation.js";

export async function skillRoutes(app: FastifyInstance) {
  // GET /api/v1/skills — list/search skills
  app.get("/", async (request) => {
    const parsed = skillQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    const auth = await optionalAuth(request);
    return skillService.listSkills(parsed.data, auth?.userId);
  });

  // GET /api/v1/skills/:slug — skill detail
  app.get<{ Params: { slug: string } }>("/:slug", async (request) => {
    const auth = await optionalAuth(request);
    return skillService.getSkillBySlug(request.params.slug, auth?.userId);
  });

  // POST /api/v1/skills — create skill
  app.post("/", writeRateLimit, async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = createSkillSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return skillService.createSkill(userId, parsed.data);
  });

  // PATCH /api/v1/skills/:slug — update skill metadata
  app.patch<{ Params: { slug: string } }>("/:slug", writeRateLimit, async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = updateSkillSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return skillService.updateSkill(userId, request.params.slug, parsed.data);
  });

  // POST /api/v1/skills/:slug/publish — publish draft skill
  app.post<{ Params: { slug: string } }>("/:slug/publish", writeRateLimit, async (request) => {
    const { userId } = await requireAuth(request);
    return skillService.publishSkill(userId, request.params.slug);
  });

  // DELETE /api/v1/skills/:slug — archive skill
  app.delete<{ Params: { slug: string } }>("/:slug", writeRateLimit, async (request) => {
    const { userId } = await requireAuth(request);
    await skillService.archiveSkill(userId, request.params.slug);
    return { success: true };
  });

  // PUT /api/v1/skills/:slug/composition — set composition
  app.put<{ Params: { slug: string } }>("/:slug/composition", writeRateLimit, async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = compositionSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return skillService.setComposition(userId, request.params.slug, parsed.data);
  });

  // GET /api/v1/skills/:slug/validate — run validation pipeline
  app.get<{ Params: { slug: string } }>("/:slug/validate", async (request) => {
    const auth = await optionalAuth(request);
    return validateSkillBySlug(request.params.slug, auth?.userId);
  });

  // DELETE /api/v1/skills/:slug/composition — remove composition
  app.delete<{ Params: { slug: string } }>("/:slug/composition", writeRateLimit, async (request) => {
    const { userId } = await requireAuth(request);
    await skillService.removeComposition(userId, request.params.slug);
    return { success: true };
  });
}
