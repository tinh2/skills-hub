import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  skill: {
    findMany: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
  },
  $queryRaw: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../common/db.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("../org/org.auth.js", () => ({
  isOrgMember: vi.fn().mockResolvedValue(false),
}));

vi.mock("../like/like.service.js", () => ({
  batchHasUserLiked: vi.fn().mockResolvedValue(new Set()),
}));

import { searchSkills } from "./search.service.js";

const NOW = new Date("2026-01-15T00:00:00Z");

function makeSearchRow(overrides: Record<string, any> = {}) {
  return {
    id: "skill-1",
    slug: "test-skill",
    name: "Test Skill",
    description: "A test skill",
    status: "PUBLISHED",
    visibility: "PUBLIC",
    platforms: ["CLAUDE_CODE"],
    qualityScore: 75,
    installCount: 10,
    likeCount: 5,
    avgRating: 4.5,
    reviewCount: 3,
    createdAt: NOW,
    updatedAt: NOW,
    category: { name: "Build", slug: "build" },
    author: { username: "testuser", avatarUrl: null },
    tags: [{ tag: { name: "typescript" } }],
    versions: [{ version: "1.0.0" }],
    compositionOf: null,
    org: null,
    ...overrides,
  };
}

describe("search.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchSkills", () => {
    it("returns paginated results", async () => {
      const rows = [
        makeSearchRow({ id: "s1" }),
        makeSearchRow({ id: "s2" }),
      ];
      mockPrisma.skill.findMany.mockResolvedValue(rows);

      const result = await searchSkills({ limit: 20 } as any);

      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.cursor).toBeNull();
      expect(result.data[0].slug).toBe("test-skill");
      expect(result.data[0].tags).toEqual(["typescript"]);
    });

    it("sets hasMore when more results than limit", async () => {
      const rows = [
        makeSearchRow({ id: "s1" }),
        makeSearchRow({ id: "s2" }),
        makeSearchRow({ id: "s3" }),
      ];
      mockPrisma.skill.findMany.mockResolvedValue(rows);

      const result = await searchSkills({ limit: 2 } as any);

      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBe("s2");
    });

    it("applies query filter using tsvector + tag fallback", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ id: "s1" }, { id: "s2" }]);
      mockPrisma.skill.findMany.mockResolvedValue([]);

      await searchSkills({ q: "deploy", limit: 20 } as any);

      // Tsvector raw query should be called
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();

      const callArgs = mockPrisma.skill.findMany.mock.calls[0][0];
      expect(callArgs.where.OR).toBeDefined();
      expect(callArgs.where.OR).toHaveLength(2);
      // First OR clause is tsvector ID matches
      expect(callArgs.where.OR[0]).toEqual({ id: { in: ["s1", "s2"] } });
      // Second OR clause is tag name ILIKE fallback
      expect(callArgs.where.OR[1].tags).toBeDefined();
    });

    it("applies most_liked sort", async () => {
      mockPrisma.skill.findMany.mockResolvedValue([]);

      await searchSkills({ sort: "most_liked", limit: 20 } as any);

      const callArgs = mockPrisma.skill.findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual({ likeCount: "desc" });
    });

    it("applies most_installed sort", async () => {
      mockPrisma.skill.findMany.mockResolvedValue([]);

      await searchSkills({ sort: "most_installed", limit: 20 } as any);

      const callArgs = mockPrisma.skill.findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual({ installCount: "desc" });
    });

    it("defaults to createdAt desc sort", async () => {
      mockPrisma.skill.findMany.mockResolvedValue([]);

      await searchSkills({ limit: 20 } as any);

      const callArgs = mockPrisma.skill.findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual({ createdAt: "desc" });
    });

    it("applies category filter", async () => {
      mockPrisma.skill.findMany.mockResolvedValue([]);

      await searchSkills({ category: "build", limit: 20 } as any);

      const callArgs = mockPrisma.skill.findMany.mock.calls[0][0];
      expect(callArgs.where.category).toEqual({ slug: "build" });
    });

    it("applies platform filter", async () => {
      mockPrisma.skill.findMany.mockResolvedValue([]);

      await searchSkills({ platform: "CLAUDE_CODE", limit: 20 } as any);

      const callArgs = mockPrisma.skill.findMany.mock.calls[0][0];
      expect(callArgs.where.platforms).toEqual({ has: "CLAUDE_CODE" });
    });

    it("applies minScore filter", async () => {
      mockPrisma.skill.findMany.mockResolvedValue([]);

      await searchSkills({ minScore: 50, limit: 20 } as any);

      const callArgs = mockPrisma.skill.findMany.mock.calls[0][0];
      expect(callArgs.where.qualityScore).toEqual({ gte: 50 });
    });

    it("applies cursor for pagination", async () => {
      mockPrisma.skill.findMany.mockResolvedValue([]);

      await searchSkills({ cursor: "cursor-id", limit: 20 } as any);

      const callArgs = mockPrisma.skill.findMany.mock.calls[0][0];
      expect(callArgs.cursor).toEqual({ id: "cursor-id" });
      expect(callArgs.skip).toBe(1);
    });

    it("always filters for PUBLISHED and PUBLIC status", async () => {
      mockPrisma.skill.findMany.mockResolvedValue([]);

      await searchSkills({ limit: 20 } as any);

      const callArgs = mockPrisma.skill.findMany.mock.calls[0][0];
      expect(callArgs.where.status).toBe("PUBLISHED");
      expect(callArgs.where.visibility).toBe("PUBLIC");
    });
  });
});
