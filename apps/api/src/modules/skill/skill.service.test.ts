import { describe, it, expect, vi, beforeEach } from "vitest";

const mockTx = {
  skill: {
    create: vi.fn(),
    update: vi.fn(),
  },
  skillVersion: { create: vi.fn() },
  tag: { upsert: vi.fn() },
  skillTag: { create: vi.fn() },
};

const mockPrisma = vi.hoisted(() => ({
  skill: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  category: {
    findUnique: vi.fn(),
  },
  skillVersion: {
    findFirst: vi.fn(),
  },
  skillLike: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../../common/db.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("../../common/errors.js", () => ({
  NotFoundError: class NotFoundError extends Error {
    statusCode: number;
    code: string;
    constructor(resource: string) {
      super(`${resource} not found`);
      this.statusCode = 404;
      this.code = `${resource.toUpperCase()}_NOT_FOUND`;
    }
  },
  ConflictError: class ConflictError extends Error {
    statusCode = 409;
    code = "CONFLICT";
    constructor(msg: string) { super(msg); }
  },
  ForbiddenError: class ForbiddenError extends Error {
    statusCode = 403;
    code = "FORBIDDEN";
    constructor(msg: string) { super(msg); }
  },
  ValidationError: class ValidationError extends Error {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    constructor(msg: string) { super(msg); }
  },
}));

vi.mock("../../common/slug.js", () => ({
  uniqueSlug: vi.fn().mockResolvedValue("test-skill"),
}));

vi.mock("../validation/validation.service.js", async () => {
  const actual = await vi.importActual<typeof import("../validation/validation.service.js")>("../validation/validation.service.js");
  return {
    ...actual,
    computeQualityScore: vi.fn().mockReturnValue(75),
  };
});

vi.mock("../org/org.auth.js", () => ({
  requireOrgRole: vi.fn(),
  isOrgMember: vi.fn(),
}));

vi.mock("../like/like.service.js", () => ({
  hasUserLiked: vi.fn().mockResolvedValue(false),
  batchHasUserLiked: vi.fn().mockResolvedValue(new Set()),
}));

import { createSkill, listSkills, getSkillBySlug, publishSkill } from "./skill.service.js";

const NOW = new Date("2026-01-15T00:00:00Z");

function makeSkillRow(overrides: Record<string, any> = {}) {
  return {
    id: "skill-1",
    slug: "test-skill",
    name: "Test Skill",
    description: "A test skill",
    category: { name: "Build", slug: "build" },
    author: { username: "testuser", avatarUrl: null },
    status: "DRAFT",
    visibility: "PUBLIC",
    platforms: ["CLAUDE_CODE"],
    qualityScore: 75,
    installCount: 0,
    likeCount: 0,
    avgRating: null,
    reviewCount: 0,
    createdAt: NOW,
    updatedAt: NOW,
    tags: [],
    versions: [{ version: "1.0.0", instructions: "x".repeat(600) + "\n## Step 1\nProcess input and generate output.\nHandle errors with retry.\nIMPORTANT: validate first.\nExample:\n```typescript\ncode\n```\nOutput format: JSON" }],
    compositionOf: null,
    org: null,
    authorId: "user-1",
    ...overrides,
  };
}

describe("skill.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSkill", () => {
    it("creates a skill with all required fields", async () => {
      const input = {
        name: "Test Skill",
        description: "A test skill",
        categorySlug: "build",
        platforms: ["CLAUDE_CODE"] as any,
        instructions: "Do the thing step by step",
        visibility: "PUBLIC" as const,
        version: "1.0.0",
      };

      mockPrisma.category.findUnique.mockResolvedValue({ id: "cat-1", slug: "build" });

      // $transaction receives a callback; invoke it with mockTx
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const createdSkill = makeSkillRow({ id: "skill-new" });
        mockTx.skill.create.mockResolvedValue(createdSkill);
        mockTx.skillVersion.create.mockResolvedValue({});
        return cb(mockTx);
      });

      const fullRow = makeSkillRow({ id: "skill-new" });
      mockPrisma.skill.findUniqueOrThrow.mockResolvedValue(fullRow);

      const result = await createSkill("user-1", input);

      expect(result.slug).toBe("test-skill");
      expect(result.name).toBe("Test Skill");
      expect(result.qualityScore).toBe(75);
      expect(result.latestVersion).toBe("1.0.0");
      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({ where: { slug: "build" } });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("throws NotFoundError for invalid category", async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      const input = {
        name: "Test",
        description: "Desc",
        categorySlug: "nonexistent",
        platforms: ["CLAUDE_CODE"] as any,
        instructions: "instructions",
        visibility: "PUBLIC" as const,
        version: "1.0.0",
      };

      await expect(createSkill("user-1", input)).rejects.toThrow("Category not found");
    });
  });

  describe("listSkills", () => {
    it("returns PUBLISHED skills by default", async () => {
      const skillRows = [makeSkillRow({ status: "PUBLISHED", id: "s1" })];
      mockPrisma.skill.findMany.mockResolvedValue(skillRows);

      const result = await listSkills({ limit: 20 } as any);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe("PUBLISHED");
      expect(result.hasMore).toBe(false);
    });

    it("filters by author username", async () => {
      mockPrisma.skill.findMany.mockResolvedValue([]);

      await listSkills({ author: "testuser", limit: 20 } as any);

      const callArgs = mockPrisma.skill.findMany.mock.calls[0][0];
      expect(callArgs.where.author).toEqual({ username: "testuser" });
    });

    it("requires requesterId for DRAFT status", async () => {
      await expect(
        listSkills({ status: "DRAFT", limit: 20 } as any),
      ).rejects.toThrow("Authentication required");
    });

    it("allows DRAFT status with requesterId", async () => {
      mockPrisma.skill.findMany.mockResolvedValue([]);

      const result = await listSkills({ status: "DRAFT", limit: 20 } as any, "user-1");

      expect(result.data).toHaveLength(0);
      const callArgs = mockPrisma.skill.findMany.mock.calls[0][0];
      expect(callArgs.where.status).toBe("DRAFT");
      expect(callArgs.where.authorId).toBe("user-1");
    });

    it("applies cursor-based pagination", async () => {
      const skills = [
        makeSkillRow({ id: "s1", status: "PUBLISHED" }),
        makeSkillRow({ id: "s2", status: "PUBLISHED" }),
        makeSkillRow({ id: "s3", status: "PUBLISHED" }),
      ];
      // Return limit+1 items to indicate hasMore
      mockPrisma.skill.findMany.mockResolvedValue(skills);

      const result = await listSkills({ limit: 2 } as any);

      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBe("s2");
    });
  });

  describe("getSkillBySlug", () => {
    it("returns skill detail when found", async () => {
      const row = makeSkillRow({
        status: "PUBLISHED",
        versions: [
          { id: "v1", version: "1.0.0", changelog: null, qualityScore: 75, createdAt: NOW },
        ],
        media: [],
        compositionOf: null,
        githubRepoUrl: "https://github.com/test/repo",
      });
      mockPrisma.skill.findUnique.mockResolvedValue(row);
      mockPrisma.skillVersion.findFirst.mockResolvedValue({
        instructions: "Do the thing",
        version: "1.0.0",
      });

      const result = await getSkillBySlug("test-skill");

      expect(result.slug).toBe("test-skill");
      expect(result.instructions).toBe("Do the thing");
      expect(result.versions).toHaveLength(1);
    });

    it("throws NotFoundError when skill does not exist", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue(null);

      await expect(getSkillBySlug("nonexistent")).rejects.toThrow("Skill not found");
    });

    it("throws NotFoundError for private skill accessed by non-owner", async () => {
      const row = makeSkillRow({ visibility: "PRIVATE", authorId: "owner-1" });
      mockPrisma.skill.findUnique.mockResolvedValue(row);

      await expect(getSkillBySlug("test-skill", "other-user")).rejects.toThrow("Skill not found");
    });
  });

  describe("publishSkill", () => {
    it("updates skill status to PUBLISHED", async () => {
      const skill = makeSkillRow({ status: "DRAFT", authorId: "user-1", qualityScore: 75, org: null });
      mockPrisma.skill.findUnique.mockResolvedValue(skill);

      const updatedRow = makeSkillRow({ status: "PUBLISHED" });
      mockPrisma.skill.update.mockResolvedValue(updatedRow);

      const result = await publishSkill("user-1", "test-skill");

      expect(result.status).toBe("PUBLISHED");
      expect(mockPrisma.skill.update).toHaveBeenCalledWith({
        where: { slug: "test-skill" },
        data: { status: "PUBLISHED" },
        select: expect.any(Object),
      });
    });

    it("throws NotFoundError for missing skill", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue(null);

      await expect(publishSkill("user-1", "nope")).rejects.toThrow("Skill not found");
    });

    it("throws ConflictError if already published", async () => {
      const skill = makeSkillRow({ status: "PUBLISHED", authorId: "user-1", org: null });
      mockPrisma.skill.findUnique.mockResolvedValue(skill);

      await expect(publishSkill("user-1", "test-skill")).rejects.toThrow("already published");
    });

    it("throws ForbiddenError if not the author", async () => {
      const skill = makeSkillRow({ status: "DRAFT", authorId: "other-user", org: null });
      mockPrisma.skill.findUnique.mockResolvedValue(skill);

      await expect(publishSkill("user-1", "test-skill")).rejects.toThrow("only publish your own");
    });

    it("throws ValidationError if validation fails", async () => {
      const skill = makeSkillRow({
        status: "DRAFT",
        authorId: "user-1",
        qualityScore: 5,
        org: null,
        description: "",
        versions: [{ version: "bad", instructions: "tiny" }],
      });
      mockPrisma.skill.findUnique.mockResolvedValue(skill);

      await expect(publishSkill("user-1", "test-skill")).rejects.toThrow("Cannot publish");
    });
  });
});
