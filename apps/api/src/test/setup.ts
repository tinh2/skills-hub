import { beforeAll, afterAll, afterEach } from "vitest";
// Use the same PrismaClient as the service layer to ensure consistent
// pool config, middleware, and connection. env.ts (setupFiles) has already
// set DATABASE_URL to the test database before any imports.
import { prisma as testPrisma } from "../common/db.js";

export { testPrisma };

// Tables to truncate between tests — single TRUNCATE with CASCADE handles FK order.
// Update this list when adding new Prisma models.
const TABLES = [
  "SkillMedia",
  "CompositionSkill",
  "Composition",
  "ReviewResponse",
  "ReviewVote",
  "Review",
  "Install",
  "SkillLike",
  "SkillTag",
  "SkillVersion",
  "Skill",
  "Tag",
  "ApiKey",
  "RefreshToken",
  "OrgSkillTemplate",
  "OrgInvite",
  "OrgMembership",
  "Organization",
  "User",
  // Do NOT truncate Category — seeded once in beforeAll
] as const;

export async function cleanDb() {
  const tableList = TABLES.map((t) => `"${t}"`).join(", ");
  await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} CASCADE`);
}

export async function seedCategories() {
  const CATEGORIES = [
    { name: "Build", slug: "build", description: "Project scaffolding", sortOrder: 0 },
    { name: "Test", slug: "test", description: "Unit and E2E tests", sortOrder: 1 },
    { name: "QA", slug: "qa", description: "Quality assurance", sortOrder: 2 },
    { name: "Review", slug: "review", description: "Code review", sortOrder: 3 },
    { name: "Deploy", slug: "deploy", description: "Infrastructure", sortOrder: 4 },
    { name: "Docs", slug: "docs", description: "Documentation", sortOrder: 5 },
  ];

  for (const cat of CATEGORIES) {
    await testPrisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
  }
}

// IMPORTANT: This counter is safe ONLY because vitest.integration.config.ts
// uses singleFork: true. If tests are ever parallelized, switch to UUIDs.
let counter = 0;

export async function createTestUser(overrides: Partial<{
  username: string;
  githubId: number;
  displayName: string;
}> = {}) {
  counter++;
  return testPrisma.user.create({
    data: {
      githubId: overrides.githubId ?? 100000 + counter,
      username: overrides.username ?? `testuser-${counter}`,
      displayName: overrides.displayName ?? `Test User ${counter}`,
      avatarUrl: "https://avatars.githubusercontent.com/u/1",
      githubUrl: `https://github.com/testuser-${counter}`,
    },
  });
}

export async function createTestSkill(
  authorId: string,
  categorySlug: string,
  overrides: Partial<{
    name: string;
    slug: string;
    description: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    visibility: "PUBLIC" | "PRIVATE" | "UNLISTED" | "ORG";
    platforms: string[];
    likeCount: number;
    installCount: number;
    qualityScore: number;
  }> = {},
) {
  counter++;
  const category = await testPrisma.category.findUniqueOrThrow({ where: { slug: categorySlug } });
  const name = overrides.name ?? `Test Skill ${counter}`;
  const slug = overrides.slug ?? `test-skill-${counter}`;

  const skill = await testPrisma.skill.create({
    data: {
      slug,
      name,
      description: overrides.description ?? `Description for ${name}`,
      categoryId: category.id,
      authorId,
      status: (overrides.status ?? "PUBLISHED") as any,
      visibility: (overrides.visibility ?? "PUBLIC") as any,
      platforms: (overrides.platforms ?? ["CLAUDE_CODE"]) as any,
      likeCount: overrides.likeCount ?? 0,
      installCount: overrides.installCount ?? 0,
      qualityScore: overrides.qualityScore ?? 75,
    },
  });

  // Create initial version
  await testPrisma.skillVersion.create({
    data: {
      skillId: skill.id,
      version: "1.0.0",
      instructions: `Instructions for ${name}`,
      qualityScore: overrides.qualityScore ?? 75,
      isLatest: true,
    },
  });

  return skill;
}

export function setupIntegrationTest() {
  beforeAll(async () => {
    await testPrisma.$connect();
    await seedCategories();
  });

  afterEach(async () => {
    await cleanDb();
    counter = 0;
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });
}
