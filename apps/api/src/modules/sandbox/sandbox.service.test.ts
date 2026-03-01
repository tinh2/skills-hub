import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  skill: {
    findUnique: vi.fn(),
  },
  skillVersion: {
    findFirst: vi.fn(),
  },
  sandboxRun: {
    count: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  testCase: {
    count: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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
}));

import { runSandbox, getTestCases, createTestCase, deleteTestCase } from "./sandbox.service.js";

const NOW = new Date("2026-02-28T12:00:00Z");

describe("runSandbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects if skill not found", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(null);
    await expect(runSandbox("user-1", "nonexistent", { input: "test" }))
      .rejects.toThrow("not found");
  });

  it("rejects if skill is not published", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "s1", status: "DRAFT" });
    await expect(runSandbox("user-1", "test-skill", { input: "test" }))
      .rejects.toThrow("published");
  });

  it("rejects if daily limit exceeded", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "s1", status: "PUBLISHED" });
    mockPrisma.sandboxRun.count.mockResolvedValue(5);
    await expect(runSandbox("user-1", "test-skill", { input: "test" }))
      .rejects.toThrow("limit");
  });

  it("returns cached result if input hash matches", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "s1", status: "PUBLISHED" });
    mockPrisma.sandboxRun.count.mockResolvedValue(0);
    mockPrisma.sandboxRun.findFirst.mockResolvedValue({
      id: "run-cached",
      skillId: "s1",
      input: "test",
      output: "cached output",
      status: "COMPLETED",
      durationMs: 100,
      tokenCount: 50,
      errorMessage: null,
      testCaseId: null,
      createdAt: NOW,
    });

    const result = await runSandbox("user-1", "test-skill", { input: "test" });
    expect(result.id).toBe("run-cached");
    expect(result.output).toBe("cached output");
    // Should NOT have created a new run
    expect(mockPrisma.sandboxRun.create).not.toHaveBeenCalled();
  });

  it("creates and executes a sandbox run", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "s1", status: "PUBLISHED" });
    mockPrisma.sandboxRun.count.mockResolvedValue(0);
    mockPrisma.sandboxRun.findFirst.mockResolvedValue(null); // no cache

    const createdRun = {
      id: "run-new",
      skillId: "s1",
      input: "test input",
      output: null,
      status: "PENDING",
      durationMs: null,
      tokenCount: null,
      errorMessage: null,
      testCaseId: null,
      createdAt: NOW,
    };
    mockPrisma.sandboxRun.create.mockResolvedValue(createdRun);

    // Mark as running
    mockPrisma.sandboxRun.update.mockResolvedValueOnce({ ...createdRun, status: "RUNNING" });

    // Fetch instructions
    mockPrisma.skillVersion.findFirst.mockResolvedValue({
      instructions: "You are a code reviewer. Do things.",
    });

    // Final update with completed result
    mockPrisma.sandboxRun.update.mockResolvedValueOnce({
      ...createdRun,
      status: "COMPLETED",
      output: "[Sandbox Preview",
      durationMs: 5,
      tokenCount: 25,
    });

    const result = await runSandbox("user-1", "test-skill", { input: "test input" });
    expect(result.status).toBe("COMPLETED");
    expect(result.output).toContain("[Sandbox Preview");
    expect(mockPrisma.sandboxRun.create).toHaveBeenCalled();
  });
});

describe("getTestCases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns test cases for a skill", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "s1" });
    mockPrisma.testCase.findMany.mockResolvedValue([
      {
        id: "tc-1",
        label: "Basic test",
        input: "Hello",
        expectedOutput: "World",
        sortOrder: 0,
        createdAt: NOW,
      },
    ]);

    const cases = await getTestCases("test-skill");
    expect(cases).toHaveLength(1);
    expect(cases[0].label).toBe("Basic test");
    expect(cases[0].createdAt).toBe(NOW.toISOString());
  });

  it("rejects if skill not found", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(null);
    await expect(getTestCases("nonexistent")).rejects.toThrow("not found");
  });
});

describe("createTestCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a test case for skill author", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "s1", authorId: "user-1" });
    mockPrisma.testCase.count.mockResolvedValue(0);
    mockPrisma.testCase.create.mockResolvedValue({
      id: "tc-new",
      label: "New test",
      input: "test input",
      expectedOutput: null,
      sortOrder: 0,
      createdAt: NOW,
    });

    const result = await createTestCase("user-1", "test-skill", {
      label: "New test",
      input: "test input",
      sortOrder: 0,
    });

    expect(result.id).toBe("tc-new");
    expect(result.label).toBe("New test");
  });

  it("rejects if not the skill author", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "s1", authorId: "other-user" });
    await expect(
      createTestCase("user-1", "test-skill", { label: "Test", input: "test", sortOrder: 0 }),
    ).rejects.toThrow("author");
  });

  it("rejects if test case limit reached", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "s1", authorId: "user-1" });
    mockPrisma.testCase.count.mockResolvedValue(10);
    await expect(
      createTestCase("user-1", "test-skill", { label: "Test", input: "test", sortOrder: 0 }),
    ).rejects.toThrow("Maximum");
  });
});

describe("deleteTestCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a test case for skill author", async () => {
    mockPrisma.testCase.findUnique.mockResolvedValue({
      id: "tc-1",
      skill: { authorId: "user-1" },
    });
    mockPrisma.testCase.delete.mockResolvedValue({});

    await deleteTestCase("user-1", "tc-1");
    expect(mockPrisma.testCase.delete).toHaveBeenCalledWith({ where: { id: "tc-1" } });
  });

  it("rejects if not the skill author", async () => {
    mockPrisma.testCase.findUnique.mockResolvedValue({
      id: "tc-1",
      skill: { authorId: "other-user" },
    });
    await expect(deleteTestCase("user-1", "tc-1")).rejects.toThrow("author");
  });

  it("rejects if test case not found", async () => {
    mockPrisma.testCase.findUnique.mockResolvedValue(null);
    await expect(deleteTestCase("user-1", "tc-nonexistent")).rejects.toThrow("not found");
  });
});
