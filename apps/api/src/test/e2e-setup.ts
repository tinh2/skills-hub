import { beforeAll, afterAll, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { createAccessToken } from "../common/auth.js";
import { prisma as testPrisma } from "../common/db.js";

export { testPrisma };
export { createTestUser, createTestSkill, cleanDb, seedCategories } from "./setup.js";

let _app: FastifyInstance | null = null;

export function setupE2ETest() {
  beforeAll(async () => {
    await testPrisma.$connect();

    // Seed categories
    const { seedCategories } = await import("./setup.js");
    await seedCategories();

    // Build and ready the Fastify app
    _app = await buildApp();
    await _app.ready();
  });

  afterEach(async () => {
    const { cleanDb } = await import("./setup.js");
    await cleanDb();
  });

  afterAll(async () => {
    if (_app) await _app.close();
    await testPrisma.$disconnect();
  });
}

export function getApp(): FastifyInstance {
  if (!_app) throw new Error("Call setupE2ETest() before getApp()");
  return _app;
}

export async function authHeaders(userId: string, username: string): Promise<Record<string, string>> {
  const token = await createAccessToken(userId, username);
  return { authorization: `Bearer ${token}` };
}
