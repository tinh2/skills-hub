import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  agent: {
    count: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  skill: {
    findUnique: vi.fn(),
  },
  skillVersion: {
    findFirst: vi.fn(),
  },
  agentExecution: {
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../../common/db.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("../../common/errors.js", () => ({
  NotFoundError: class NotFoundError extends Error {
    statusCode: number;
    code: string;
    constructor(resource: string) {
      super(`${resource} not found`);
      this.statusCode = 404;
      this.code = `${resource.toUpperCase()}_NOT_FOUND`;
    }
  },
  ForbiddenError: class ForbiddenError extends Error {
    statusCode = 403;
    code = "FORBIDDEN";
    constructor(msg: string) { super(msg); }
  },
  ValidationError: class ValidationError extends Error {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    constructor(msg: string) { super(msg); }
  },
  ConflictError: class ConflictError extends Error {
    statusCode = 409;
    code = "CONFLICT";
    constructor(msg: string) { super(msg); }
  },
}));

vi.mock("./openfang.client.js", () => ({
  getOpenFangClient: vi.fn().mockReturnValue({
    checkHealth: vi.fn().mockResolvedValue(false),
    spawnHand: vi.fn(),
    pauseHand: vi.fn().mockResolvedValue({ success: true }),
    resumeHand: vi.fn().mockResolvedValue({ success: true }),
    killHand: vi.fn().mockResolvedValue({ success: true }),
    executeHand: vi.fn(),
  }),
}));

vi.mock("@skills-hub/skill-parser/openfang", () => ({
  translateToHand: vi.fn().mockReturnValue({ hand: {}, instructions: {}, model: {}, limits: {}, metadata: {} }),
  serializeHandToml: vi.fn().mockReturnValue("[hand]\nname = \"test\""),
}));

vi.mock("../org/org.auth.js", () => ({
  isOrgMember: vi.fn().mockResolvedValue(false),
}));

import { createAgent, listAgents, getAgent, updateAgent, pauseAgent, resumeAgent, deleteAgent, executeAgent } from "./agent.service.js";

const NOW = new Date("2026-02-28T12:00:00Z");

function makeAgentRow(overrides: Record<string, any> = {}) {
  return {
    id: "agent-1",
    name: "My Agent",
    ownerId: "user-1",
    skill: { slug: "test-skill", name: "Test Skill" },
    status: "STOPPED",
    triggerType: "MANUAL",
    channelType: null,
    modelProvider: "anthropic",
    modelId: "claude-sonnet-4-5-20250514",
    executionCount: 0,
    lastExecutedAt: null,
    lastError: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("createAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an agent for a published skill", async () => {
    mockPrisma.agent.count.mockResolvedValue(0);
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "s1", status: "PUBLISHED", visibility: "PUBLIC", authorId: "user-1", orgId: null, name: "Test", description: "A test skill" });
    mockPrisma.agent.create.mockResolvedValue({ id: "agent-new" });
    mockPrisma.agent.findUniqueOrThrow.mockResolvedValue(makeAgentRow({ id: "agent-new" }));

    const result = await createAgent("user-1", {
      name: "My Agent",
      skillSlug: "test-skill",
      triggerType: "MANUAL",
      modelProvider: "anthropic",
      modelId: "claude-sonnet-4-5-20250514",
    });

    expect(result.id).toBe("agent-new");
    expect(result.name).toBe("My Agent");
    expect(result.status).toBe("STOPPED"); // OpenFang not connected
    expect(mockPrisma.agent.create).toHaveBeenCalled();
  });

  it("rejects if agent limit exceeded", async () => {
    mockPrisma.agent.count.mockResolvedValue(3);
    await expect(
      createAgent("user-1", {
        name: "Agent",
        skillSlug: "test",
        triggerType: "MANUAL",
        modelProvider: "anthropic",
        modelId: "claude-sonnet-4-5-20250514",
      }),
    ).rejects.toThrow("limit");
  });

  it("rejects if skill not found", async () => {
    mockPrisma.agent.count.mockResolvedValue(0);
    mockPrisma.skill.findUnique.mockResolvedValueOnce(null);
    await expect(
      createAgent("user-1", {
        name: "Agent",
        skillSlug: "nonexistent",
        triggerType: "MANUAL",
        modelProvider: "anthropic",
        modelId: "claude-sonnet-4-5-20250514",
      }),
    ).rejects.toThrow("not found");
  });

  it("rejects if skill is not published", async () => {
    mockPrisma.agent.count.mockResolvedValue(0);
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "s1", status: "DRAFT", visibility: "PUBLIC", authorId: "user-1", orgId: null, name: "Test", description: "A test skill" });
    await expect(
      createAgent("user-1", {
        name: "Agent",
        skillSlug: "draft-skill",
        triggerType: "MANUAL",
        modelProvider: "anthropic",
        modelId: "claude-sonnet-4-5-20250514",
      }),
    ).rejects.toThrow("published");
  });
});

describe("listAgents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated agent list", async () => {
    mockPrisma.agent.findMany.mockResolvedValue([
      makeAgentRow({ id: "a1" }),
      makeAgentRow({ id: "a2" }),
    ]);

    const result = await listAgents("user-1", { limit: 20 });
    expect(result.data).toHaveLength(2);
    expect(result.hasMore).toBe(false);
    expect(result.cursor).toBeNull();
  });

  it("indicates hasMore when results exceed limit", async () => {
    mockPrisma.agent.findMany.mockResolvedValue([
      makeAgentRow({ id: "a1" }),
      makeAgentRow({ id: "a2" }),
      makeAgentRow({ id: "a3" }),
    ]);

    const result = await listAgents("user-1", { limit: 2 });
    expect(result.data).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.cursor).toBe("a2");
  });
});

describe("getAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns agent detail with executions", async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({
      ...makeAgentRow(),
      triggerConfig: null,
      channelConfig: null,
      openfangHandId: null,
      executions: [],
    });

    const result = await getAgent("user-1", "agent-1");
    expect(result.id).toBe("agent-1");
    expect(result.recentExecutions).toEqual([]);
  });

  it("rejects if agent not found", async () => {
    mockPrisma.agent.findUnique.mockResolvedValue(null);
    await expect(getAgent("user-1", "nonexistent")).rejects.toThrow("not found");
  });

  it("rejects if not the owner", async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({
      ...makeAgentRow({ ownerId: "other-user" }),
      triggerConfig: null,
      channelConfig: null,
      openfangHandId: null,
      executions: [],
    });
    await expect(getAgent("user-1", "agent-1")).rejects.toThrow("own");
  });
});

describe("pauseAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pauses a running agent", async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({
      ownerId: "user-1",
      status: "RUNNING",
      openfangHandId: null,
    });
    mockPrisma.agent.update.mockResolvedValue({});
    mockPrisma.agent.findUniqueOrThrow.mockResolvedValue(
      makeAgentRow({ status: "PAUSED" }),
    );

    const result = await pauseAgent("user-1", "agent-1");
    expect(result.status).toBe("PAUSED");
  });

  it("rejects if agent is not running", async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({
      ownerId: "user-1",
      status: "STOPPED",
      openfangHandId: null,
    });
    await expect(pauseAgent("user-1", "agent-1")).rejects.toThrow("not running");
  });
});

describe("resumeAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resumes a paused agent", async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({
      ownerId: "user-1",
      status: "PAUSED",
      openfangHandId: null,
    });
    mockPrisma.agent.update.mockResolvedValue({});
    mockPrisma.agent.findUniqueOrThrow.mockResolvedValue(
      makeAgentRow({ status: "RUNNING" }),
    );

    const result = await resumeAgent("user-1", "agent-1");
    expect(result.status).toBe("RUNNING");
  });

  it("rejects if agent is not paused", async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({
      ownerId: "user-1",
      status: "RUNNING",
      openfangHandId: null,
    });
    await expect(resumeAgent("user-1", "agent-1")).rejects.toThrow("not paused");
  });
});

describe("deleteAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes an agent owned by the user", async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({
      ownerId: "user-1",
      openfangHandId: null,
    });
    mockPrisma.agent.delete.mockResolvedValue({});

    await deleteAgent("user-1", "agent-1");
    expect(mockPrisma.agent.delete).toHaveBeenCalledWith({ where: { id: "agent-1" } });
  });

  it("rejects if not the owner", async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({
      ownerId: "other-user",
      openfangHandId: null,
    });
    await expect(deleteAgent("user-1", "agent-1")).rejects.toThrow("own");
  });

  it("rejects if agent not found", async () => {
    mockPrisma.agent.findUnique.mockResolvedValue(null);
    await expect(deleteAgent("user-1", "nonexistent")).rejects.toThrow("not found");
  });
});

describe("createAgent visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects PRIVATE skill for non-author", async () => {
    mockPrisma.agent.count.mockResolvedValue(0);
    mockPrisma.skill.findUnique.mockResolvedValue({
      id: "s1", status: "PUBLISHED", visibility: "PRIVATE", authorId: "other-user", orgId: null, name: "Secret", description: "Private skill",
    });
    await expect(
      createAgent("user-1", {
        name: "Agent",
        skillSlug: "private-skill",
        triggerType: "MANUAL",
        modelProvider: "anthropic",
        modelId: "claude-sonnet-4-5-20250514",
      }),
    ).rejects.toThrow("not found");
  });

  it("allows PRIVATE skill for the author", async () => {
    mockPrisma.agent.count.mockResolvedValue(0);
    mockPrisma.skill.findUnique.mockResolvedValue({
      id: "s1", status: "PUBLISHED", visibility: "PRIVATE", authorId: "user-1", orgId: null, name: "My Skill", description: "My private skill",
    });
    mockPrisma.agent.create.mockResolvedValue({ id: "agent-new" });
    mockPrisma.agent.findUniqueOrThrow.mockResolvedValue(makeAgentRow({ id: "agent-new" }));

    const result = await createAgent("user-1", {
      name: "Agent",
      skillSlug: "my-private-skill",
      triggerType: "MANUAL",
      modelProvider: "anthropic",
      modelId: "claude-sonnet-4-5-20250514",
    });
    expect(result.id).toBe("agent-new");
  });
});

describe("updateAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates agent config for owner", async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({ ownerId: "user-1" });
    mockPrisma.agent.update.mockResolvedValue({});
    mockPrisma.agent.findUniqueOrThrow.mockResolvedValue(
      makeAgentRow({ name: "Updated Agent" }),
    );

    const result = await updateAgent("user-1", "agent-1", { name: "Updated Agent" });
    expect(result.name).toBe("Updated Agent");
  });

  it("rejects if not the owner", async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({ ownerId: "other-user" });
    await expect(updateAgent("user-1", "agent-1", { name: "New" })).rejects.toThrow("own");
  });

  it("rejects if agent not found", async () => {
    mockPrisma.agent.findUnique.mockResolvedValue(null);
    await expect(updateAgent("user-1", "missing", { name: "New" })).rejects.toThrow("not found");
  });
});

describe("executeAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes an agent and returns result", async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({
      ownerId: "user-1",
      status: "RUNNING",
      openfangHandId: null,
      skillId: "s1",
    });
    mockPrisma.agentExecution.count.mockResolvedValue(0);

    const execRow = {
      id: "exec-1",
      status: "RUNNING",
      input: "test input",
      output: null,
      durationMs: null,
      tokenCount: null,
      errorMessage: null,
      triggeredBy: "manual",
      createdAt: NOW,
    };
    mockPrisma.agentExecution.create.mockResolvedValue(execRow);
    mockPrisma.agentExecution.update.mockResolvedValue({
      ...execRow,
      status: "COMPLETED",
      output: "[Agent Execution Preview]",
      durationMs: 5,
      tokenCount: 3,
    });
    mockPrisma.agent.update.mockResolvedValue({});

    const result = await executeAgent("user-1", "agent-1", { input: "test input" });
    expect(result.status).toBe("COMPLETED");
    expect(result.output).toContain("Agent Execution Preview");
  });

  it("rejects if agent is not running", async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({
      ownerId: "user-1",
      status: "PAUSED",
      openfangHandId: null,
      skillId: "s1",
    });
    await expect(executeAgent("user-1", "agent-1", {})).rejects.toThrow("running");
  });

  it("rejects if not the owner", async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({
      ownerId: "other-user",
      status: "RUNNING",
      openfangHandId: null,
      skillId: "s1",
    });
    await expect(executeAgent("user-1", "agent-1", {})).rejects.toThrow("own");
  });

  it("rejects if monthly execution limit reached", async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({
      ownerId: "user-1",
      status: "RUNNING",
      openfangHandId: null,
      skillId: "s1",
    });
    mockPrisma.agentExecution.count.mockResolvedValue(100);

    await expect(executeAgent("user-1", "agent-1", { input: "test" }))
      .rejects.toThrow("Monthly execution limit");
  });

  it("rejects if agent not found", async () => {
    mockPrisma.agent.findUnique.mockResolvedValue(null);
    await expect(executeAgent("user-1", "missing", {})).rejects.toThrow("not found");
  });
});
