import { Queue, Worker, type ConnectionOptions, type Processor } from "bullmq";
import { getEnv } from "../config/env.js";

let connection: ConnectionOptions | undefined;

function getConnection(): ConnectionOptions {
  if (!connection) {
    const env = getEnv();
    if (!env.REDIS_URL) {
      throw new Error("REDIS_URL is required for job queue");
    }
    connection = { url: env.REDIS_URL };
  }
  return connection;
}

export function isQueueAvailable(): boolean {
  // Check process.env directly to avoid getEnv() validation exit in tests
  return !!process.env.REDIS_URL;
}

const queues = new Map<string, Queue>();

export function getQueue(name: string): Queue {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection: getConnection() });
    queues.set(name, queue);
  }
  return queue;
}

export function createWorker<T>(
  name: string,
  processor: Processor<T>,
  opts: { concurrency?: number } = {},
): Worker<T> {
  return new Worker(name, processor, {
    connection: getConnection(),
    concurrency: opts.concurrency ?? 5,
  });
}

export async function closeQueues(): Promise<void> {
  const closing = Array.from(queues.values()).map((q) => q.close());
  await Promise.all(closing);
  queues.clear();
}

// Queue names
export const SANDBOX_QUEUE = "sandbox-execution";
export const AGENT_QUEUE = "agent-execution";
