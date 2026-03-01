import { FastifyInstance } from "fastify";
import {
  createOrgSchema,
  updateOrgSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  orgQuerySchema,
  orgSkillQuerySchema,
  syncGithubOrgSchema,
  createTemplateSchema,
  updateTemplateSchema,
  createSkillFromTemplateSchema,
} from "@skills-hub/shared";
import { requireAuth, optionalAuth } from "../../common/auth.js";
import { ValidationError } from "../../common/errors.js";
import { writeRateLimit } from "../../config/rate-limits.js";
import * as orgService from "./org.service.js";

export async function orgRoutes(app: FastifyInstance) {
  // POST /api/v1/orgs — create org
  app.post("/", writeRateLimit, async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = createOrgSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return orgService.createOrg(userId, parsed.data);
  });

  // GET /api/v1/orgs — list user's orgs
  app.get("/", async (request) => {
    const { userId } = await requireAuth(request);
    return orgService.listUserOrgs(userId);
  });

  // GET /api/v1/orgs/:slug — get org detail
  app.get<{ Params: { slug: string } }>("/:slug", async (request) => {
    const auth = await optionalAuth(request);
    return orgService.getOrg(request.params.slug, auth?.userId);
  });

  // PATCH /api/v1/orgs/:slug — update org (admin)
  app.patch<{ Params: { slug: string } }>("/:slug", writeRateLimit, async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = updateOrgSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return orgService.updateOrg(userId, request.params.slug, parsed.data);
  });

  // DELETE /api/v1/orgs/:slug — delete org (admin)
  app.delete<{ Params: { slug: string } }>("/:slug", async (request) => {
    const { userId } = await requireAuth(request);
    await orgService.deleteOrg(userId, request.params.slug);
    return { success: true };
  });

  // GET /api/v1/orgs/:slug/members — list members
  app.get<{ Params: { slug: string } }>("/:slug/members", async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = orgQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return orgService.listMembers(request.params.slug, userId, parsed.data);
  });

  // PATCH /api/v1/orgs/:slug/members/:userId — update member role (admin)
  app.patch<{ Params: { slug: string; userId: string } }>(
    "/:slug/members/:userId",
    writeRateLimit,
    async (request) => {
      const { userId } = await requireAuth(request);
      const parsed = updateMemberRoleSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
      return orgService.updateMemberRole(
        userId,
        request.params.slug,
        request.params.userId,
        parsed.data.role,
      );
    },
  );

  // DELETE /api/v1/orgs/:slug/members/:userId — remove member (admin or self)
  app.delete<{ Params: { slug: string; userId: string } }>(
    "/:slug/members/:userId",
    async (request) => {
      const { userId } = await requireAuth(request);
      await orgService.removeMember(userId, request.params.slug, request.params.userId);
      return { success: true };
    },
  );

  // POST /api/v1/orgs/:slug/invites — create invite (admin)
  app.post<{ Params: { slug: string } }>(
    "/:slug/invites",
    writeRateLimit,
    async (request) => {
      const { userId } = await requireAuth(request);
      const parsed = inviteMemberSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
      return orgService.inviteMember(userId, request.params.slug, parsed.data);
    },
  );

  // GET /api/v1/orgs/:slug/invites — list invites (admin)
  app.get<{ Params: { slug: string } }>("/:slug/invites", async (request) => {
    const { userId } = await requireAuth(request);
    return orgService.listInvites(request.params.slug, userId);
  });

  // DELETE /api/v1/orgs/:slug/invites/:inviteId — revoke invite (admin)
  app.delete<{ Params: { slug: string; inviteId: string } }>(
    "/:slug/invites/:inviteId",
    async (request) => {
      const { userId } = await requireAuth(request);
      await orgService.revokeInvite(userId, request.params.slug, request.params.inviteId);
      return { success: true };
    },
  );

  // GET /api/v1/orgs/:slug/skills — list org skills (member+)
  app.get<{ Params: { slug: string } }>("/:slug/skills", async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = orgSkillQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);

    // Import skill service lazily to avoid circular dependency
    const { listSkills } = await import("../skill/skill.service.js");
    return listSkills(
      { ...parsed.data, visibility: "ORG" as any, org: request.params.slug },
      userId,
    );
  });

  // --- Templates ---

  // GET /api/v1/orgs/:slug/templates — list (member+)
  app.get<{ Params: { slug: string } }>("/:slug/templates", async (request) => {
    const { userId } = await requireAuth(request);
    return orgService.listTemplates(request.params.slug, userId);
  });

  // POST /api/v1/orgs/:slug/templates — create (publisher+)
  app.post<{ Params: { slug: string } }>(
    "/:slug/templates",
    writeRateLimit,
    async (request) => {
      const { userId } = await requireAuth(request);
      const parsed = createTemplateSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
      return orgService.createTemplate(userId, request.params.slug, parsed.data);
    },
  );

  // GET /api/v1/orgs/:slug/templates/:id — detail
  app.get<{ Params: { slug: string; id: string } }>(
    "/:slug/templates/:id",
    async (request) => {
      const { userId } = await requireAuth(request);
      return orgService.getTemplate(request.params.slug, request.params.id, userId);
    },
  );

  // PATCH /api/v1/orgs/:slug/templates/:id — update (publisher+)
  app.patch<{ Params: { slug: string; id: string } }>(
    "/:slug/templates/:id",
    writeRateLimit,
    async (request) => {
      const { userId } = await requireAuth(request);
      const parsed = updateTemplateSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
      return orgService.updateTemplate(
        userId,
        request.params.slug,
        request.params.id,
        parsed.data,
      );
    },
  );

  // DELETE /api/v1/orgs/:slug/templates/:id — delete (admin)
  app.delete<{ Params: { slug: string; id: string } }>(
    "/:slug/templates/:id",
    async (request) => {
      const { userId } = await requireAuth(request);
      await orgService.deleteTemplate(userId, request.params.slug, request.params.id);
      return { success: true };
    },
  );

  // POST /api/v1/orgs/:slug/templates/:id/create-skill — create from template (publisher+)
  app.post<{ Params: { slug: string; id: string } }>(
    "/:slug/templates/:id/create-skill",
    writeRateLimit,
    async (request) => {
      const { userId } = await requireAuth(request);
      const parsed = createSkillFromTemplateSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
      const body = parsed.data;

      const template = await orgService.getTemplate(
        request.params.slug,
        request.params.id,
        userId,
      );

      const { createSkill } = await import("../skill/skill.service.js");
      return createSkill(userId, {
        name: body.name ?? template.name,
        description: body.description ?? template.description ?? "",
        categorySlug: body.categorySlug ?? template.categorySlug ?? "productivity",
        platforms: (body.platforms ?? template.platforms ?? ["CLAUDE_CODE"]) as ("CLAUDE_CODE" | "CURSOR" | "CODEX_CLI" | "OTHER")[],
        instructions: body.instructions ?? template.instructions ?? "",
        visibility: "ORG",
        version: body.version ?? "1.0.0",
        orgSlug: request.params.slug,
      });
    },
  );

  // --- GitHub Sync ---

  // POST /api/v1/orgs/:slug/github — connect GitHub org (admin)
  app.post<{ Params: { slug: string } }>(
    "/:slug/github",
    writeRateLimit,
    async (request) => {
      const { userId } = await requireAuth(request);
      const parsed = syncGithubOrgSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
      const { connectGithubOrg } = await import("./github-sync.service.js");
      return connectGithubOrg(userId, request.params.slug, parsed.data);
    },
  );

  // DELETE /api/v1/orgs/:slug/github — disconnect GitHub org (admin)
  app.delete<{ Params: { slug: string } }>("/:slug/github", async (request) => {
    const { userId } = await requireAuth(request);
    const { disconnectGithubOrg } = await import("./github-sync.service.js");
    await disconnectGithubOrg(userId, request.params.slug);
    return { success: true };
  });

  // POST /api/v1/orgs/:slug/github/sync — manual sync trigger (admin)
  app.post<{ Params: { slug: string } }>(
    "/:slug/github/sync",
    writeRateLimit,
    async (request) => {
      const { userId } = await requireAuth(request);
      const { syncGithubOrgMembers } = await import("./github-sync.service.js");
      return syncGithubOrgMembers(userId, request.params.slug);
    },
  );

  // --- Analytics ---

  // GET /api/v1/orgs/:slug/analytics — org analytics (member+)
  app.get<{ Params: { slug: string } }>("/:slug/analytics", async (request) => {
    const { userId } = await requireAuth(request);
    const { getOrgAnalytics } = await import("./org-analytics.service.js");
    return getOrgAnalytics(userId, request.params.slug);
  });
}
