import type { Job } from "bullmq";
import { prisma } from "../../common/db.js";
import { SANDBOX_LIMITS } from "@skills-hub/shared";
import { captureException } from "../../common/sentry.js";

export interface SandboxJobData {
  runId: string;
  skillId: string;
  input: string;
}

export async function processSandboxJob(job: Job<SandboxJobData>): Promise<void> {
  const { runId, skillId, input } = job.data;
  const startTime = Date.now();

  await prisma.sandboxRun.update({
    where: { id: runId },
    data: { status: "RUNNING" },
  });

  try {
    const version = await prisma.skillVersion.findFirst({
      where: { skillId, isLatest: true },
      select: { instructions: true },
    });

    if (!version) {
      await prisma.sandboxRun.update({
        where: { id: runId },
        data: {
          status: "FAILED",
          errorMessage: "No published version found",
          durationMs: Date.now() - startTime,
        },
      });
      return;
    }

    // TODO: In production, this calls the OpenFang runtime or Claude API
    const output = generateSandboxPreview(version.instructions, input);
    const durationMs = Date.now() - startTime;

    await prisma.sandboxRun.update({
      where: { id: runId },
      data: {
        status: "COMPLETED",
        output,
        durationMs,
        tokenCount: Math.ceil((version.instructions.length + input.length + output.length) / 4),
      },
    });
  } catch (error) {
    captureException(error instanceof Error ? error : new Error("Sandbox execution failed"), {
      extra: { runId, skillId, inputLength: input.length },
    });
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error
      ? (error.message.length <= 200 ? error.message : "Execution failed")
      : "Execution failed";

    await prisma.sandboxRun.update({
      where: { id: runId },
      data: {
        status: durationMs > SANDBOX_LIMITS.FREE_TIMEOUT_MS ? "TIMEOUT" : "FAILED",
        errorMessage,
        durationMs,
      },
    });
  }
}

function generateSandboxPreview(instructions: string, input: string): string {
  const instructionLines = instructions.split("\n").length;
  const hasPhases = /(?:phase|step|stage)\s*\d/i.test(instructions);
  const hasIO = /(?:input|output|returns?|produces?)/i.test(instructions);
  const hasExamples = /(?:example|e\.g\.|```)/i.test(instructions);

  return [
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
  ].join("\n");
}
