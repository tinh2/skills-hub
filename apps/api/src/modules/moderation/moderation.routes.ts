import { FastifyInstance } from "fastify";
import { resolveReportSchema } from "@skills-hub-ai/shared";
import { listPendingReports, resolveReport } from "../report/report.service.js";
import { listFlaggedSkills, approveSkill, rejectSkill } from "./moderation.service.js";
import { requireAuth } from "../../common/auth.js";
import { ValidationError, ForbiddenError } from "../../common/errors.js";
import { writeRateLimit } from "../../config/rate-limits.js";
import { prisma } from "../../common/db.js";

async function requireAdmin(request: any): Promise<string> {
  const { userId } = await requireAuth(request);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) throw new ForbiddenError("Admin access required");
  return userId;
}

export async function moderationRoutes(app: FastifyInstance) {
  // GET /api/v1/admin/reports — list pending reports
  app.get("/reports", async (request) => {
    await requireAdmin(request);
    const query = request.query as { cursor?: string; limit?: string };
    const limit = Math.min(Number(query.limit) || 50, 100);
    return listPendingReports(limit, query.cursor);
  });

  // POST /api/v1/admin/reports/:id/resolve — resolve a report
  app.post<{ Params: { id: string } }>(
    "/reports/:id/resolve",
    writeRateLimit,
    async (request) => {
      const adminId = await requireAdmin(request);
      const parsed = resolveReportSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);

      await resolveReport(adminId, request.params.id, parsed.data.action, parsed.data.note);
      return { success: true };
    },
  );

  // GET /api/v1/admin/moderation/queue — list skills pending review
  app.get("/moderation/queue", async (request) => {
    await requireAdmin(request);
    const query = request.query as { cursor?: string; limit?: string };
    const limit = Math.min(Number(query.limit) || 50, 100);
    return listFlaggedSkills(limit, query.cursor);
  });

  // POST /api/v1/admin/moderation/:slug/approve — approve a skill for publishing
  app.post<{ Params: { slug: string } }>(
    "/moderation/:slug/approve",
    writeRateLimit,
    async (request) => {
      const adminId = await requireAdmin(request);
      await approveSkill(adminId, request.params.slug);
      return { success: true };
    },
  );

  // POST /api/v1/admin/moderation/:slug/reject — reject a skill
  app.post<{ Params: { slug: string } }>(
    "/moderation/:slug/reject",
    writeRateLimit,
    async (request) => {
      const adminId = await requireAdmin(request);
      const body = request.body as { reason?: string };
      await rejectSkill(adminId, request.params.slug, body?.reason);
      return { success: true };
    },
  );
}
