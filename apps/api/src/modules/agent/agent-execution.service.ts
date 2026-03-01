import { Prisma } from "@prisma/client";
import { prisma } from "../../common/db.js";
import { NotFoundError, ForbiddenError, ConflictError } from "../../common/errors.js";
import { AGENT_LIMITS } from "@skills-hub/shared";
import type { ExecuteAgentInput, AgentExecutionSummary } from "@skills-hub/shared";
import { getOpenFangClient } from "./openfang.client.js";
import { isQueueAvailable, getQueue, AGENT_QUEUE } from "../../common/queue.js";
import type { AgentJobData } from "./agent.worker.js";

// --- Selects & Types ---

export const executionSelect = {
  id: true,
  status: true,
  input: true,
  output: true,
  durationMs: true,
  tokenCount: true,
  errorMessage: true,
  triggeredBy: true,
  createdAt: true,
} satisfies Prisma.AgentExecutionSelect;

export type ExecutionRow = Prisma.AgentExecutionGetPayload<{ select: typeof executionSelect }>;

// --- Formatters ---

export function formatExecution(row: ExecutionRow): AgentExecutionSummary {
  return {
    id: row.id,
    status: row.status,
    input: row.input,
    output: row.output,
    durationMs: row.durationMs,
    tokenCount: row.tokenCount,
    errorMessage: row.errorMessage,
    triggeredBy: row.triggeredBy,
    createdAt: row.createdAt.toISOString(),
  };
}

// --- Execution Functions ---

export async function executeAgent(
  userId: string,
  agentId: string,
  input: ExecuteAgentInput,
): Promise<AgentExecutionSummary> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { ownerId: true, status: true, openfangHandId: true, skillId: true },
  });
  if (!agent) throw new NotFoundError("Agent");
  if (agent.ownerId !== userId) throw new ForbiddenError("You can only execute your own agents");
  if (agent.status !== "RUNNING") {
    throw new ConflictError("Agent must be running to execute");
  }

  // Check monthly execution limit
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const executionsThisMonth = await prisma.agentExecution.count({
    where: {
      agent: { ownerId: userId },
      createdAt: { gte: monthStart },
    },
  });

  // TODO: check user tier for pro limits
  if (executionsThisMonth >= AGENT_LIMITS.FREE_EXECUTIONS_PER_MONTH) {
    throw new ForbiddenError(
      `Monthly execution limit reached (${AGENT_LIMITS.FREE_EXECUTIONS_PER_MONTH} executions/month). Upgrade to Pro for ${AGENT_LIMITS.PRO_EXECUTIONS_PER_MONTH} executions/month.`,
    );
  }

  const execution = await prisma.agentExecution.create({
    data: {
      agentId,
      status: "RUNNING",
      input: input.input,
      triggeredBy: "manual",
    },
    select: executionSelect,
  });

  // Dispatch to job queue if Redis is available, otherwise execute inline
  if (isQueueAvailable()) {
    try {
      const queue = getQueue(AGENT_QUEUE);
      const jobData: AgentJobData = {
        executionId: execution.id,
        agentId,
        openfangHandId: agent.openfangHandId,
        input: input.input ?? null,
      };
      await queue.add("execute", jobData, {
        attempts: 2,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      });
      return formatExecution(execution);
    } catch {
      // Redis unavailable at runtime — fall through to inline execution
    }
  }

  // Inline fallback (no Redis or queue.add failed)
  const startTime = Date.now();
  let output = "";
  let tokenCount = 0;
  let status: "COMPLETED" | "FAILED" | "TIMEOUT" = "COMPLETED";
  let errorMessage: string | null = null;

  try {
    if (agent.openfangHandId) {
      const client = getOpenFangClient();
      const result = await client.executeHand({
        handId: agent.openfangHandId,
        input: input.input ?? "",
      });
      output = result.output;
      tokenCount = result.tokenCount;
      if (result.status === "failed") {
        status = "FAILED";
        errorMessage = result.error ?? "Execution failed";
      } else if (result.status === "timeout") {
        status = "TIMEOUT";
        errorMessage = "Execution timed out";
      }
    } else {
      output = `[Agent Execution Preview]\n\nAgent is configured but OpenFang runtime is not connected.\nInput: ${(input.input ?? "").slice(0, 200)}\n\nConnect an OpenFang runtime to enable real execution.`;
      tokenCount = Math.ceil((input.input?.length ?? 0) / 4);
    }
  } catch (err) {
    status = "FAILED";
    output = "";
    errorMessage = err instanceof Error
      ? (err.message.length <= 200 ? err.message : "Execution failed")
      : "Execution failed";
  }

  const durationMs = Date.now() - startTime;

  const updated = await prisma.agentExecution.update({
    where: { id: execution.id },
    data: { status, output, durationMs, tokenCount, errorMessage },
    select: executionSelect,
  });

  // Update agent stats
  await prisma.agent.update({
    where: { id: agentId },
    data: {
      executionCount: { increment: 1 },
      lastExecutedAt: new Date(),
      ...(errorMessage && { lastError: errorMessage }),
    },
  });

  return formatExecution(updated);
}

export async function getExecution(
  userId: string,
  agentId: string,
  executionId: string,
): Promise<AgentExecutionSummary> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { ownerId: true },
  });
  if (!agent) throw new NotFoundError("Agent");
  if (agent.ownerId !== userId) throw new ForbiddenError("You can only view your own agent executions");

  const execution = await prisma.agentExecution.findUnique({
    where: { id: executionId },
    select: executionSelect,
  });
  if (!execution) throw new NotFoundError("Execution");

  return formatExecution(execution);
}
