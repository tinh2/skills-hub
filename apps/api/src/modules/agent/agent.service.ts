import { Prisma } from "@prisma/client";
import { prisma } from "../../common/db.js";
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from "../../common/errors.js";
import { AGENT_LIMITS } from "@skills-hub/shared";
import type {
  CreateAgentInput,
  UpdateAgentInput,
  AgentQuery,
  ExecuteAgentInput,
  AgentSummary,
  AgentDetail,
  AgentExecutionSummary,
} from "@skills-hub/shared";
import { getOpenFangClient } from "./openfang.client.js";
import { translateToHand, serializeHandToml } from "@skills-hub/skill-parser/openfang";

function toJsonInput(value: Record<string, unknown> | undefined | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!value || Object.keys(value).length === 0) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

// --- Agent CRUD ---

export async function createAgent(
  userId: string,
  input: CreateAgentInput,
): Promise<AgentSummary> {
  // Check agent limit
  const agentCount = await prisma.agent.count({
    where: { ownerId: userId, status: { not: "STOPPED" } },
  });

  // TODO: check user tier for pro limits
  if (agentCount >= AGENT_LIMITS.FREE_MAX_AGENTS) {
    throw new ForbiddenError(
      `Agent limit reached (${AGENT_LIMITS.FREE_MAX_AGENTS} agents). Upgrade to Pro for ${AGENT_LIMITS.PRO_MAX_AGENTS} agents.`,
    );
  }

  // Resolve skill
  const skill = await prisma.skill.findUnique({
    where: { slug: input.skillSlug },
    select: { id: true, status: true, name: true },
  });
  if (!skill) throw new NotFoundError("Skill");
  if (skill.status !== "PUBLISHED") throw new ValidationError("Can only deploy published skills");

  // Spawn in OpenFang (if available)
  let openfangHandId: string | null = null;
  try {
    const client = getOpenFangClient();
    const healthy = await client.checkHealth();

    if (healthy) {
      // Get latest instructions for HAND.toml translation
      const version = await prisma.skillVersion.findFirst({
        where: { skillId: skill.id, isLatest: true },
        select: { instructions: true, version: true },
      });

      if (version) {
        const handConfig = translateToHand(
          {
            name: skill.name,
            description: input.name,
            version: version.version,
            category: undefined,
            platforms: [],
            instructions: version.instructions,
            raw: "",
          },
          {
            modelProvider: input.modelProvider,
            modelId: input.modelId,
            sourceUrl: `https://skills-hub.ai/skills/${input.skillSlug}`,
          },
        );

        const handToml = serializeHandToml(handConfig);
        const response = await client.spawnHand({
          handToml,
          agentName: input.name,
          triggerType: input.triggerType,
          triggerConfig: input.triggerConfig as Record<string, unknown>,
          channelType: input.channelType,
          channelConfig: input.channelConfig as Record<string, unknown>,
        });

        if (response.status === "spawned") {
          openfangHandId = response.handId;
        }
      }
    }
  } catch {
    // OpenFang not available — agent created but not running
  }

  const agent = await prisma.agent.create({
    data: {
      name: input.name,
      skillId: skill.id,
      ownerId: userId,
      status: openfangHandId ? "RUNNING" : "STOPPED",
      triggerType: input.triggerType as any,
      triggerConfig: toJsonInput(input.triggerConfig),
      channelType: input.channelType,
      channelConfig: toJsonInput(input.channelConfig),
      modelProvider: input.modelProvider,
      modelId: input.modelId,
      openfangHandId,
    },
  });

  const created = await prisma.agent.findUniqueOrThrow({
    where: { id: agent.id },
    select: agentSummarySelect,
  });

  return formatAgentSummary(created);
}

export async function listAgents(
  userId: string,
  query: AgentQuery,
): Promise<{ data: AgentSummary[]; cursor: string | null; hasMore: boolean }> {
  const where: Prisma.AgentWhereInput = { ownerId: userId };
  if (query.status) where.status = query.status;

  const args = {
    where,
    orderBy: { createdAt: "desc" as const },
    take: query.limit + 1,
    select: agentSummarySelect,
    ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
  };

  const agents = await prisma.agent.findMany(args);
  const hasMore = agents.length > query.limit;
  const data = agents.slice(0, query.limit);

  return {
    data: data.map(formatAgentSummary),
    cursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
  };
}

export async function getAgent(userId: string, agentId: string): Promise<AgentDetail> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      ...agentSummarySelect,
      triggerConfig: true,
      channelConfig: true,
      openfangHandId: true,
      executions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: executionSelect,
      },
    },
  });

  if (!agent) throw new NotFoundError("Agent");
  if (agent.ownerId !== userId) throw new ForbiddenError("You can only view your own agents");

  return formatAgentDetail(agent);
}

export async function updateAgent(
  userId: string,
  agentId: string,
  input: UpdateAgentInput,
): Promise<AgentSummary> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { ownerId: true },
  });
  if (!agent) throw new NotFoundError("Agent");
  if (agent.ownerId !== userId) throw new ForbiddenError("You can only edit your own agents");

  const data: Prisma.AgentUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.triggerType !== undefined) data.triggerType = input.triggerType as any;
  if (input.triggerConfig !== undefined) data.triggerConfig = toJsonInput(input.triggerConfig);
  if (input.channelType !== undefined) data.channelType = input.channelType;
  if (input.channelConfig !== undefined) data.channelConfig = toJsonInput(input.channelConfig);
  if (input.modelProvider !== undefined) data.modelProvider = input.modelProvider;
  if (input.modelId !== undefined) data.modelId = input.modelId;

  await prisma.agent.update({ where: { id: agentId }, data });

  const updated = await prisma.agent.findUniqueOrThrow({
    where: { id: agentId },
    select: agentSummarySelect,
  });

  return formatAgentSummary(updated);
}

export async function pauseAgent(userId: string, agentId: string): Promise<AgentSummary> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { ownerId: true, status: true, openfangHandId: true },
  });
  if (!agent) throw new NotFoundError("Agent");
  if (agent.ownerId !== userId) throw new ForbiddenError("You can only manage your own agents");
  if (agent.status !== "RUNNING") throw new ConflictError("Agent is not running");

  // Pause in OpenFang
  if (agent.openfangHandId) {
    try {
      const client = getOpenFangClient();
      await client.pauseHand(agent.openfangHandId);
    } catch {
      // Log but don't fail — update status anyway
    }
  }

  await prisma.agent.update({ where: { id: agentId }, data: { status: "PAUSED" } });

  const updated = await prisma.agent.findUniqueOrThrow({
    where: { id: agentId },
    select: agentSummarySelect,
  });

  return formatAgentSummary(updated);
}

export async function resumeAgent(userId: string, agentId: string): Promise<AgentSummary> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { ownerId: true, status: true, openfangHandId: true },
  });
  if (!agent) throw new NotFoundError("Agent");
  if (agent.ownerId !== userId) throw new ForbiddenError("You can only manage your own agents");
  if (agent.status !== "PAUSED") throw new ConflictError("Agent is not paused");

  // Resume in OpenFang
  if (agent.openfangHandId) {
    try {
      const client = getOpenFangClient();
      await client.resumeHand(agent.openfangHandId);
    } catch {
      // Log but don't fail
    }
  }

  await prisma.agent.update({ where: { id: agentId }, data: { status: "RUNNING" } });

  const updated = await prisma.agent.findUniqueOrThrow({
    where: { id: agentId },
    select: agentSummarySelect,
  });

  return formatAgentSummary(updated);
}

export async function deleteAgent(userId: string, agentId: string): Promise<void> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { ownerId: true, openfangHandId: true },
  });
  if (!agent) throw new NotFoundError("Agent");
  if (agent.ownerId !== userId) throw new ForbiddenError("You can only manage your own agents");

  // Kill in OpenFang
  if (agent.openfangHandId) {
    try {
      const client = getOpenFangClient();
      await client.killHand(agent.openfangHandId);
    } catch {
      // Log but don't fail — delete agent record anyway
    }
  }

  await prisma.agent.delete({ where: { id: agentId } });
}

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
  if (agent.status !== "RUNNING" && agent.status !== "PAUSED") {
    throw new ConflictError("Agent must be running or paused to execute");
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

  // Execute via OpenFang or simulate
  const startTime = Date.now();
  let output: string;
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
      }
      if (result.status === "timeout") {
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
    errorMessage = err instanceof Error ? err.message : "Unknown error";
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

// --- Selects & Formatters ---

const agentSummarySelect = {
  id: true,
  name: true,
  ownerId: true,
  skill: { select: { slug: true, name: true } },
  status: true,
  triggerType: true,
  channelType: true,
  modelProvider: true,
  modelId: true,
  executionCount: true,
  lastExecutedAt: true,
  lastError: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AgentSelect;

type AgentRow = Prisma.AgentGetPayload<{ select: typeof agentSummarySelect }>;

const executionSelect = {
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

type ExecutionRow = Prisma.AgentExecutionGetPayload<{ select: typeof executionSelect }>;

function formatAgentSummary(row: AgentRow): AgentSummary {
  return {
    id: row.id,
    name: row.name,
    skill: row.skill,
    status: row.status,
    triggerType: row.triggerType,
    channelType: row.channelType,
    modelProvider: row.modelProvider,
    modelId: row.modelId,
    executionCount: row.executionCount,
    lastExecutedAt: row.lastExecutedAt?.toISOString() ?? null,
    lastError: row.lastError,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function formatAgentDetail(row: AgentRow & {
  triggerConfig: Prisma.JsonValue;
  channelConfig: Prisma.JsonValue;
  openfangHandId: string | null;
  executions: ExecutionRow[];
}): AgentDetail {
  return {
    ...formatAgentSummary(row),
    triggerConfig: row.triggerConfig as Record<string, unknown> | null,
    channelConfig: row.channelConfig as Record<string, unknown> | null,
    openfangHandId: row.openfangHandId,
    recentExecutions: row.executions.map(formatExecution),
  };
}

function formatExecution(row: ExecutionRow): AgentExecutionSummary {
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
