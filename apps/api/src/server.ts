import { buildApp } from "./app.js";
import { getEnv } from "./config/env.js";
import { connectDb, disconnectDb } from "./common/db.js";
import { initSentry } from "./common/sentry.js";
import { isQueueAvailable, createWorker, closeQueues, SANDBOX_QUEUE, AGENT_QUEUE } from "./common/queue.js";
import { startSweeper, stopSweeper } from "./common/sweeper.js";
import { processSandboxJob } from "./modules/sandbox/sandbox.worker.js";
import { processAgentJob } from "./modules/agent/agent.worker.js";
import type { Worker } from "bullmq";

const env = getEnv();

// Initialize Sentry (no-op if SENTRY_DSN is not set)
initSentry();

const app = await buildApp({
  logger: true,
});

// Workers
const workers: Worker[] = [];

// Start
async function start() {
  try {
    await connectDb();

    // Start job queue workers if Redis is available
    if (isQueueAvailable()) {
      const sandboxWorker = createWorker(SANDBOX_QUEUE, processSandboxJob, { concurrency: 5 });
      sandboxWorker.on("error", (err) => app.log.error({ queue: SANDBOX_QUEUE, err }, "Worker error"));
      sandboxWorker.on("failed", (job, err) => app.log.error({ queue: SANDBOX_QUEUE, jobId: job?.id, err }, "Job failed"));
      workers.push(sandboxWorker);

      const agentWorker = createWorker(AGENT_QUEUE, processAgentJob, { concurrency: 5 });
      agentWorker.on("error", (err) => app.log.error({ queue: AGENT_QUEUE, err }, "Worker error"));
      agentWorker.on("failed", (job, err) => app.log.error({ queue: AGENT_QUEUE, jobId: job?.id, err }, "Job failed"));
      workers.push(agentWorker);

      app.log.info("Job queue workers started (sandbox + agent)");
    }

    // Start stale record sweeper (runs regardless of Redis availability)
    startSweeper(app.log);

    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Server running on http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    await disconnectDb();
    process.exit(1);
  }
}

// Graceful shutdown
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    app.log.info(`Received ${signal}, shutting down...`);
    stopSweeper();
    await Promise.all(workers.map((w) => w.close()));
    await closeQueues();
    await app.close();
    await disconnectDb();
    process.exit(0);
  });
}

start();
