import { FastifyInstance } from "fastify";
import { createReportSchema } from "@skills-hub-ai/shared";
import { createReport } from "./report.service.js";
import { requireAuth } from "../../common/auth.js";
import { ValidationError } from "../../common/errors.js";
import { writeRateLimit } from "../../config/rate-limits.js";

export async function reportRoutes(app: FastifyInstance) {
  // POST /api/v1/skills/:slug/report — report a skill
  app.post<{ Params: { slug: string } }>(
    "/skills/:slug/report",
    writeRateLimit,
    async (request) => {
      const { userId } = await requireAuth(request);
      const parsed = createReportSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);

      return createReport(userId, request.params.slug, parsed.data);
    },
  );
}
