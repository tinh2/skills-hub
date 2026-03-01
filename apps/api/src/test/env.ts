// This file runs before any imports via vitest setupFiles.
// It sets DATABASE_URL so that the PrismaClient in db.ts
// connects to the test database instead of the dev database.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/skillshub_test?schema=public";
