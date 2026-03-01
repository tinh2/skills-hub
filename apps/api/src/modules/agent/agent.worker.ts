import type { Job } from "bullmq";
import { prisma } from "../../common/db.js";
import { getOpenFangClient } from "./openfang.client.js";

export interface AgentJobData {
  executionId: string;
  agentId: string;
  openfangHandId: string | null;
  input: string | null;
}

export async function processAgentJob(job: Job<AgentJobData>): Promise<void> {
  const { executionId, agentId, openfangHandId, input } = job.data;
  const startTime = Date.now();

  let output: string;
  let tokenCount = 0;
  let status: "COMPLETED" | "FAILED" | "TIMEOUT" = "COMPLETED";
  let errorMessage: string | null = null;

  try {
    if (openfangHandId) {
      const client = getOpenFangClient();
      const result = await client.executeHand({
        handId: openfangHandId,
        input: input ?? "",
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
      output = `[Agent Execution Preview]\n\nAgent is configured but OpenFang runtime is not connected.\nInput: ${(input ?? "").slice(0, 200)}\n\nConnect an OpenFang runtime to enable real execution.`;
      tokenCount = Math.ceil((input?.length ?? 0) / 4);
    }
  } catch (err) {
    status = "FAILED";
    output = "";
    errorMessage = err instanceof Error
      ? (err.message.length <= 200 ? err.message : "Execution failed")
      : "Execution failed";
  }

  const durationMs = Date.now() - startTime;

  await prisma.agentExecution.update({
    where: { id: executionId },
    data: { status, output, durationMs, tokenCount, errorMessage },
  });

  await prisma.agent.update({
    where: { id: agentId },
    data: {
      executionCount: { increment: 1 },
      lastExecutedAt: new Date(),
      ...(errorMessage && { lastError: errorMessage }),
    },
  });
}
