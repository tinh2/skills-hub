import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  skill: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
  skillLike: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../../common/db.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("../../common/errors.js", () => ({
  NotFoundError: class NotFoundError extends Error {
    statusCode = 404;
    code = "NOT_FOUND";
    constructor(msg: string) { super(msg); }
  },
}));

import { toggleLike, hasUserLiked, batchHasUserLiked } from "./like.service.js";

describe("like.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("toggleLike", () => {
    it("likes a skill when not already liked", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill1" });
      mockPrisma.skillLike.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.skill.findUniqueOrThrow.mockResolvedValue({ likeCount: 1 });

      const result = await toggleLike("user1", "test-skill");
      expect(result.liked).toBe(true);
      expect(result.likeCount).toBe(1);
    });

    it("unlikes a skill when already liked", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill1" });
      mockPrisma.skillLike.findUnique.mockResolvedValue({ id: "like1" });
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.skill.findUniqueOrThrow.mockResolvedValue({ likeCount: 0 });

      const result = await toggleLike("user1", "test-skill");
      expect(result.liked).toBe(false);
      expect(result.likeCount).toBe(0);
    });

    it("throws NotFoundError for missing skill", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue(null);
      await expect(toggleLike("user1", "no-skill")).rejects.toThrow("Skill");
    });

    it("handles race condition on like (P2002)", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill1" });
      mockPrisma.skillLike.findUnique.mockResolvedValue(null);
      const p2002 = new Error("Unique constraint");
      Object.assign(p2002, { name: "PrismaClientKnownRequestError", code: "P2002" });
      mockPrisma.$transaction.mockRejectedValue(p2002);
      mockPrisma.skill.findUniqueOrThrow.mockResolvedValue({ likeCount: 1 });

      // Should not throw — silently handle the race condition
      const result = await toggleLike("user1", "test-skill");
      expect(result.liked).toBe(true);
    });

    it("ensures likeCount never goes below 0", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill1" });
      mockPrisma.skillLike.findUnique.mockResolvedValue({ id: "like1" });
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.skill.findUniqueOrThrow.mockResolvedValue({ likeCount: -1 });

      const result = await toggleLike("user1", "test-skill");
      expect(result.likeCount).toBe(0);
    });
  });

  describe("hasUserLiked", () => {
    it("returns true if user liked the skill", async () => {
      mockPrisma.skillLike.findUnique.mockResolvedValue({ id: "like1" });
      expect(await hasUserLiked("user1", "skill1")).toBe(true);
    });

    it("returns false if user has not liked the skill", async () => {
      mockPrisma.skillLike.findUnique.mockResolvedValue(null);
      expect(await hasUserLiked("user1", "skill1")).toBe(false);
    });
  });

  describe("batchHasUserLiked", () => {
    it("returns set of liked skill IDs", async () => {
      mockPrisma.skillLike.findMany.mockResolvedValue([
        { skillId: "s1" },
        { skillId: "s3" },
      ]);
      const result = await batchHasUserLiked("user1", ["s1", "s2", "s3"]);
      expect(result.has("s1")).toBe(true);
      expect(result.has("s2")).toBe(false);
      expect(result.has("s3")).toBe(true);
    });

    it("returns empty set for empty input", async () => {
      const result = await batchHasUserLiked("user1", []);
      expect(result.size).toBe(0);
      expect(mockPrisma.skillLike.findMany).not.toHaveBeenCalled();
    });
  });
});
