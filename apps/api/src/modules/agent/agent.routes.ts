import { FastifyInstance } from "fastify";
import { createAgentSchema, updateAgentSchema, agentQuerySchema, executeAgentSchema } from "@skills-hub/shared";
import { requireAuth } from "../../common/auth.js";
import { ValidationError } from "../../common/errors.js";
import { agentRateLimit } from "../../config/rate-limits.js";
import * as agentService from "./agent.service.js";

export async function agentRoutes(app: FastifyInstance) {
  // POST /api/v1/agents — create agent (deploy skill)
  app.post("/", agentRateLimit, async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = createAgentSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return agentService.createAgent(userId, parsed.data);
  });

  // GET /api/v1/agents — list user's agents
  app.get("/", async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = agentQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return agentService.listAgents(userId, parsed.data);
  });

  // GET /api/v1/agents/:agentId — agent detail
  app.get<{ Params: { agentId: string } }>("/:agentId", async (request) => {
    const { userId } = await requireAuth(request);
    return agentService.getAgent(userId, request.params.agentId);
  });

  // PATCH /api/v1/agents/:agentId — update agent config
  app.patch<{ Params: { agentId: string } }>("/:agentId", async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = updateAgentSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return agentService.updateAgent(userId, request.params.agentId, parsed.data);
  });

  // POST /api/v1/agents/:agentId/pause — pause agent
  app.post<{ Params: { agentId: string } }>("/:agentId/pause", async (request) => {
    const { userId } = await requireAuth(request);
    return agentService.pauseAgent(userId, request.params.agentId);
  });

  // POST /api/v1/agents/:agentId/resume — resume agent
  app.post<{ Params: { agentId: string } }>("/:agentId/resume", async (request) => {
    const { userId } = await requireAuth(request);
    return agentService.resumeAgent(userId, request.params.agentId);
  });

  // POST /api/v1/agents/:agentId/execute — execute agent manually
  app.post<{ Params: { agentId: string } }>("/:agentId/execute", agentRateLimit, async (request) => {
    const { userId } = await requireAuth(request);
    const parsed = executeAgentSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
    return agentService.executeAgent(userId, request.params.agentId, parsed.data);
  });

  // GET /api/v1/agents/:agentId/executions/:executionId — poll execution status
  app.get<{ Params: { agentId: string; executionId: string } }>(
    "/:agentId/executions/:executionId",
    async (request) => {
      const { userId } = await requireAuth(request);
      return agentService.getExecution(userId, request.params.agentId, request.params.executionId);
    },
  );

  // DELETE /api/v1/agents/:agentId — delete agent
  app.delete<{ Params: { agentId: string } }>("/:agentId", async (request) => {
    const { userId } = await requireAuth(request);
    await agentService.deleteAgent(userId, request.params.agentId);
    return { success: true };
  });
}
