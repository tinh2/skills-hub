import { prisma } from "./db.js";
import { SANDBOX_LIMITS } from "@skills-hub-ai/shared";

// How long before a RUNNING/PENDING record is considered stuck
const SANDBOX_STALE_MS = SANDBOX_LIMITS.PRO_TIMEOUT_MS * 2; // 4 minutes
const AGENT_STALE_MS = 10 * 60 * 1000; // 10 minutes

// Sweep interval
const SWEEP_INTERVAL_MS = 2 * 60 * 1000; // every 2 minutes

let intervalId: ReturnType<typeof setInterval> | null = null;

export async function sweepStaleRecords(): Promise<{
  sandbox: number;
  agent: number;
  expiredTokens: number;
  expiredInvites: number;
}> {
  const sandboxCutoff = new Date(Date.now() - SANDBOX_STALE_MS);
  const agentCutoff = new Date(Date.now() - AGENT_STALE_MS);
  const now = new Date();

  const [sandboxResult, agentResult, tokenResult, inviteResult] = await Promise.all([
    prisma.sandboxRun.updateMany({
      where: {
        status: { in: ["PENDING", "RUNNING"] },
        createdAt: { lt: sandboxCutoff },
      },
      data: {
        status: "TIMEOUT",
        errorMessage: "Swept: record stuck in PENDING/RUNNING state",
      },
    }),
    prisma.agentExecution.updateMany({
      where: {
        status: "RUNNING",
        createdAt: { lt: agentCutoff },
      },
      data: {
        status: "TIMEOUT",
        errorMessage: "Swept: execution stuck in RUNNING state",
      },
    }),
    // Delete expired refresh tokens
    prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: now } },
    }),
    // Mark expired pending invites as EXPIRED
    prisma.orgInvite.updateMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    }),
  ]);

  return {
    sandbox: sandboxResult.count,
    agent: agentResult.count,
    expiredTokens: tokenResult.count,
    expiredInvites: inviteResult.count,
  };
}

export function startSweeper(logger?: { info: (msg: string) => void }): void {
  if (intervalId) return; // already running

  intervalId = setInterval(async () => {
    try {
      const result = await sweepStaleRecords();
      const total = result.sandbox + result.agent + result.expiredTokens + result.expiredInvites;
      if (total > 0) {
        const parts: string[] = [];
        if (result.sandbox > 0) parts.push(`${result.sandbox} sandbox runs`);
        if (result.agent > 0) parts.push(`${result.agent} agent executions`);
        if (result.expiredTokens > 0) parts.push(`${result.expiredTokens} expired tokens`);
        if (result.expiredInvites > 0) parts.push(`${result.expiredInvites} expired invites`);
        logger?.info(`[sweeper] Cleaned up ${parts.join(", ")}`);
      }
    } catch (err) {
      // Non-critical — log and continue
      console.warn("[sweeper] Error during sweep:", err instanceof Error ? err.message : err);
    }
  }, SWEEP_INTERVAL_MS);

  // Don't block process exit
  if (intervalId && typeof intervalId === "object" && "unref" in intervalId) {
    intervalId.unref();
  }

  logger?.info("[sweeper] Started stale record sweeper (every 2 min)");
}

export function stopSweeper(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
