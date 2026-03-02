import { FastifyInstance } from "fastify";
import { runSandboxSchema, createTestCaseSchema, updateTestCaseSchema } from "@skills-hub-ai/shared";
import { requireAuth, optionalAuth } from "../../common/auth.js";
import { ValidationError } from "../../common/errors.js";
import { sandboxRateLimit } from "../../config/rate-limits.js";
import * as sandboxService from "./sandbox.service.js";

export async function sandboxRoutes(app: FastifyInstance) {
  // POST /api/v1/skills/:slug/sandbox — run skill in sandbox
  app.post<{ Params: { slug: string } }>(
    "/:slug/sandbox",
    sandboxRateLimit,
    async (request) => {
      const { userId } = await requireAuth(request);
      const parsed = runSandboxSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
      return sandboxService.runSandbox(userId, request.params.slug, parsed.data);
    },
  );

  // GET /api/v1/skills/:slug/sandbox — list sandbox runs
  app.get<{ Params: { slug: string }; Querystring: { cursor?: string; limit?: string } }>(
    "/:slug/sandbox",
    async (request) => {
      const auth = await optionalAuth(request);
      const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 100);
      return sandboxService.getSandboxRuns(
        request.params.slug,
        auth?.userId,
        limit,
        request.query.cursor,
      );
    },
  );

  // GET /api/v1/skills/:slug/sandbox/:runId — poll sandbox run status
  app.get<{ Params: { slug: string; runId: string } }>(
    "/:slug/sandbox/:runId",
    async (request) => {
      const { userId } = await requireAuth(request);
      return sandboxService.getSandboxRunById(request.params.runId, userId);
    },
  );

  // GET /api/v1/skills/:slug/test-cases — list test cases (respects visibility)
  app.get<{ Params: { slug: string } }>("/:slug/test-cases", async (request) => {
    const auth = await optionalAuth(request);
    return sandboxService.getTestCases(request.params.slug, auth?.userId ?? null);
  });

  // POST /api/v1/skills/:slug/test-cases — create test case (author only)
  app.post<{ Params: { slug: string } }>("/:slug/test-cases", sandboxRateLimit, async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = createTestCaseSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return sandboxService.createTestCase(userId, request.params.slug, parsed.data);
  });

  // PATCH /api/v1/skills/:slug/test-cases/:testCaseId — update test case (author only)
  app.patch<{ Params: { slug: string; testCaseId: string } }>(
    "/:slug/test-cases/:testCaseId",
    sandboxRateLimit,
    async (request) => {
      const { userId } = await requireAuth(request);
      const parsed = updateTestCaseSchema.safeParse(request.body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
      return sandboxService.updateTestCase(userId, request.params.testCaseId, parsed.data);
    },
  );

  // DELETE /api/v1/skills/:slug/test-cases/:testCaseId — delete test case (author only)
  app.delete<{ Params: { slug: string; testCaseId: string } }>(
    "/:slug/test-cases/:testCaseId",
    sandboxRateLimit,
    async (request) => {
      const { userId } = await requireAuth(request);
      await sandboxService.deleteTestCase(userId, request.params.testCaseId);
      return { success: true };
    },
  );
}
