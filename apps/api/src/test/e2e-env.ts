// This file runs before any imports via vitest setupFiles.
// Sets DATABASE_URL to the test database and provides required env vars
// so getEnv() succeeds when building the Fastify app.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/skillshub_test?schema=public";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "e2e-test-jwt-secret-that-is-at-least-32-characters-long";
process.env.GITHUB_CLIENT_ID = "test-github-client-id";
process.env.GITHUB_CLIENT_SECRET = "test-github-client-secret";
process.env.GITHUB_CALLBACK_URL = "http://localhost:3001/auth/callback";
process.env.FRONTEND_URL = "http://localhost:3001";
process.env.API_URL = "http://localhost:3000";
