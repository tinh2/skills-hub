import { Prisma } from "@prisma/client";
import { prisma } from "../../common/db.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../../common/errors.js";
import { isOrgMember } from "../org/org.auth.js";
import { SANDBOX_LIMITS } from "@skills-hub/shared";
import type { RunSandboxInput, CreateTestCaseInput, UpdateTestCaseInput, SandboxRunSummary, TestCaseData } from "@skills-hub/shared";
import { createHash } from "crypto";

function hashInput(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

async function resolveAndCheckVisibility(
  skillSlug: string,
  requesterId: string | null,
): Promise<{ id: string; status: string; authorId: string }> {
  const skill = await prisma.skill.findUnique({
    where: { slug: skillSlug },
    select: { id: true, status: true, visibility: true, authorId: true, orgId: true },
  });
  if (!skill) throw new NotFoundError("Skill");

  if (skill.visibility === "PRIVATE" && skill.authorId !== requesterId) {
    throw new NotFoundError("Skill");
  }
  if (skill.visibility === "ORG" && skill.orgId) {
    if (!requesterId) throw new NotFoundError("Skill");
    const member = await isOrgMember(requesterId, skill.orgId);
    if (!member) throw new NotFoundError("Skill");
  }

  return skill;
}

// --- Sandbox Runs ---

export async function runSandbox(
  userId: string,
  skillSlug: string,
  input: RunSandboxInput,
): Promise<SandboxRunSummary> {
  const skill = await resolveAndCheckVisibility(skillSlug, userId);
  if (skill.status !== "PUBLISHED") throw new ValidationError("Can only sandbox published skills");

  // Rate limit: check daily runs
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const runsToday = await prisma.sandboxRun.count({
    where: {
      userId,
      createdAt: { gte: todayStart },
    },
  });

  // TODO: check user tier for pro limits
  if (runsToday >= SANDBOX_LIMITS.FREE_RUNS_PER_DAY) {
    throw new ForbiddenError(
      `Daily sandbox limit reached (${SANDBOX_LIMITS.FREE_RUNS_PER_DAY} runs/day). Upgrade to Pro for ${SANDBOX_LIMITS.PRO_RUNS_PER_DAY} runs/day.`,
    );
  }

  // Check cache: same skill + same input hash = return cached result
  const inputHash = hashInput(`${skill.id}:${input.input}`);
  const cached = await prisma.sandboxRun.findFirst({
    where: {
      inputHash,
      status: "COMPLETED",
      createdAt: { gte: new Date(Date.now() - SANDBOX_LIMITS.CACHE_TTL_SECONDS * 1000) },
    },
    select: sandboxRunSelect,
  });

  if (cached) {
    return formatSandboxRun(cached);
  }

  // Validate test case if provided
  if (input.testCaseId) {
    const testCase = await prisma.testCase.findUnique({
      where: { id: input.testCaseId },
      select: { skillId: true },
    });
    if (!testCase || testCase.skillId !== skill.id) {
      throw new NotFoundError("TestCase");
    }
  }

  // Create the sandbox run in PENDING state
  const run = await prisma.sandboxRun.create({
    data: {
      skillId: skill.id,
      userId,
      testCaseId: input.testCaseId,
      input: input.input,
      inputHash,
      status: "PENDING",
    },
    select: sandboxRunSelect,
  });

  // Execute asynchronously — in production this would dispatch to a worker queue.
  // For the prototype, we simulate execution inline.
  const result = await executeSandbox(run.id, skill.id, input.input);

  return formatSandboxRun(result);
}

async function executeSandbox(
  runId: string,
  skillId: string,
  input: string,
): Promise<SandboxRunRow> {
  const startTime = Date.now();

  // Mark as running
  await prisma.sandboxRun.update({
    where: { id: runId },
    data: { status: "RUNNING" },
  });

  try {
    // Fetch skill instructions
    const version = await prisma.skillVersion.findFirst({
      where: { skillId, isLatest: true },
      select: { instructions: true },
    });

    if (!version) {
      return await prisma.sandboxRun.update({
        where: { id: runId },
        data: {
          status: "FAILED",
          errorMessage: "No published version found",
          durationMs: Date.now() - startTime,
        },
        select: sandboxRunSelect,
      });
    }

    // TODO: In production, this calls the OpenFang runtime or Claude API
    // For now, we return a structured preview of what the execution would do
    const output = generateSandboxPreview(version.instructions, input);
    const durationMs = Date.now() - startTime;

    return await prisma.sandboxRun.update({
      where: { id: runId },
      data: {
        status: "COMPLETED",
        output,
        durationMs,
        tokenCount: Math.ceil((version.instructions.length + input.length + output.length) / 4),
      },
      select: sandboxRunSelect,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error
      ? (error.message.length <= 200 ? error.message : "Execution failed")
      : "Execution failed";

    return await prisma.sandboxRun.update({
      where: { id: runId },
      data: {
        status: durationMs > SANDBOX_LIMITS.FREE_TIMEOUT_MS ? "TIMEOUT" : "FAILED",
        errorMessage,
        durationMs,
      },
      select: sandboxRunSelect,
    });
  }
}

function generateSandboxPreview(instructions: string, input: string): string {
  const instructionLines = instructions.split("\n").length;
  const hasPhases = /(?:phase|step|stage)\s*\d/i.test(instructions);
  const hasIO = /(?:input|output|returns?|produces?)/i.test(instructions);
  const hasExamples = /(?:example|e\.g\.|```)/i.test(instructions);

  const parts = [
    `[Sandbox Preview — Production execution requires OpenFang runtime]`,
    ``,
    `Skill analysis:`,
    `  Instructions: ${instructionLines} lines`,
    `  Structured phases: ${hasPhases ? "yes" : "no"}`,
    `  I/O specification: ${hasIO ? "yes" : "no"}`,
    `  Examples included: ${hasExamples ? "yes" : "no"}`,
    ``,
    `Input received: ${input.length} chars`,
    `  Preview: ${input.slice(0, 200)}${input.length > 200 ? "..." : ""}`,
    ``,
    `Execution would:`,
    `  1. Load skill instructions into LLM context`,
    `  2. Pass user input as the task`,
    `  3. Execute in isolated sandbox (no filesystem, no network)`,
    `  4. Return structured output`,
    ``,
    `Status: Ready for execution when OpenFang runtime is connected.`,
  ];

  return parts.join("\n");
}

export async function getSandboxRuns(
  skillSlug: string,
  userId?: string | null,
  limit = 20,
  cursor?: string,
): Promise<{ data: SandboxRunSummary[]; cursor: string | null; hasMore: boolean }> {
  const skill = await resolveAndCheckVisibility(skillSlug, userId ?? null);

  const where: Prisma.SandboxRunWhereInput = {
    skillId: skill.id,
    status: "COMPLETED",
  };

  // If userId is provided, show all their runs; otherwise only completed public runs
  if (userId) {
    where.userId = userId;
    delete where.status; // Show all statuses for own runs
  }

  const findArgs: Prisma.SandboxRunFindManyArgs = {
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    select: sandboxRunSelect,
  };

  if (cursor) {
    findArgs.cursor = { id: cursor };
    findArgs.skip = 1;
  }

  const runs = (await prisma.sandboxRun.findMany(findArgs)) as SandboxRunRow[];
  const hasMore = runs.length > limit;
  const data = runs.slice(0, limit);

  return {
    data: data.map(formatSandboxRun),
    cursor: hasMore ? data[data.length - 1].id : null,
    hasMore,
  };
}

// --- Test Cases ---

export async function createTestCase(
  userId: string,
  skillSlug: string,
  input: CreateTestCaseInput,
): Promise<TestCaseData> {
  const skill = await prisma.skill.findUnique({
    where: { slug: skillSlug },
    select: { id: true, authorId: true },
  });
  if (!skill) throw new NotFoundError("Skill");
  if (skill.authorId !== userId) throw new ForbiddenError("Only the skill author can manage test cases");

  const count = await prisma.testCase.count({ where: { skillId: skill.id } });
  if (count >= SANDBOX_LIMITS.MAX_TEST_CASES_PER_SKILL) {
    throw new ValidationError(
      `Maximum ${SANDBOX_LIMITS.MAX_TEST_CASES_PER_SKILL} test cases per skill`,
    );
  }

  const testCase = await prisma.testCase.create({
    data: {
      skillId: skill.id,
      label: input.label,
      input: input.input,
      expectedOutput: input.expectedOutput,
      sortOrder: input.sortOrder,
    },
  });

  return formatTestCase(testCase);
}

export async function getTestCases(skillSlug: string): Promise<TestCaseData[]> {
  const skill = await prisma.skill.findUnique({
    where: { slug: skillSlug },
    select: { id: true },
  });
  if (!skill) throw new NotFoundError("Skill");

  const cases = await prisma.testCase.findMany({
    where: { skillId: skill.id },
    orderBy: { sortOrder: "asc" },
  });

  return cases.map(formatTestCase);
}

export async function updateTestCase(
  userId: string,
  testCaseId: string,
  input: UpdateTestCaseInput,
): Promise<TestCaseData> {
  const testCase = await prisma.testCase.findUnique({
    where: { id: testCaseId },
    include: { skill: { select: { authorId: true } } },
  });
  if (!testCase) throw new NotFoundError("TestCase");
  if (testCase.skill.authorId !== userId) {
    throw new ForbiddenError("Only the skill author can manage test cases");
  }

  const updated = await prisma.testCase.update({
    where: { id: testCaseId },
    data: {
      ...(input.label !== undefined && { label: input.label }),
      ...(input.input !== undefined && { input: input.input }),
      ...(input.expectedOutput !== undefined && { expectedOutput: input.expectedOutput }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
    },
  });

  return formatTestCase(updated);
}

export async function deleteTestCase(userId: string, testCaseId: string): Promise<void> {
  const testCase = await prisma.testCase.findUnique({
    where: { id: testCaseId },
    include: { skill: { select: { authorId: true } } },
  });
  if (!testCase) throw new NotFoundError("TestCase");
  if (testCase.skill.authorId !== userId) {
    throw new ForbiddenError("Only the skill author can manage test cases");
  }

  await prisma.testCase.delete({ where: { id: testCaseId } });
}

// --- Selects & Formatters ---

const sandboxRunSelect = {
  id: true,
  skillId: true,
  input: true,
  output: true,
  status: true,
  durationMs: true,
  tokenCount: true,
  errorMessage: true,
  testCaseId: true,
  createdAt: true,
} satisfies Prisma.SandboxRunSelect;

type SandboxRunRow = Prisma.SandboxRunGetPayload<{ select: typeof sandboxRunSelect }>;

function formatSandboxRun(row: SandboxRunRow): SandboxRunSummary {
  return {
    id: row.id,
    skillId: row.skillId,
    input: row.input,
    output: row.output,
    status: row.status,
    durationMs: row.durationMs,
    tokenCount: row.tokenCount,
    errorMessage: row.errorMessage,
    testCaseId: row.testCaseId,
    createdAt: row.createdAt.toISOString(),
  };
}

function formatTestCase(row: {
  id: string;
  label: string;
  input: string;
  expectedOutput: string | null;
  sortOrder: number;
  createdAt: Date;
}): TestCaseData {
  return {
    id: row.id,
    label: row.label,
    input: row.input,
    expectedOutput: row.expectedOutput,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
  };
}
