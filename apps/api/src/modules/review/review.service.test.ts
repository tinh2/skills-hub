import { describe, it, expect, vi, beforeEach } from "vitest";

const mockTx = {
  review: {
    create: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
  },
  skill: {
    update: vi.fn(),
  },
};

const mockPrisma = vi.hoisted(() => ({
  skill: {
    findUnique: vi.fn(),
  },
  review: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    aggregate: vi.fn(),
  },
  reviewVote: {
    upsert: vi.fn(),
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
}));

import { createReview, deleteReview, voteReview } from "./review.service.js";

const NOW = new Date("2026-01-15T00:00:00Z");

describe("review.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createReview", () => {
    it("creates a review for a skill (happy path)", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill-1", authorId: "author-1" });
      mockPrisma.review.findUnique.mockResolvedValue(null); // no existing review

      const createdReview = {
        id: "review-1",
        rating: 5,
        title: "Great skill",
        body: "Really helpful",
        usedFor: "Development",
        author: { username: "reviewer", avatarUrl: null },
        createdAt: NOW,
        updatedAt: NOW,
      };

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        mockTx.review.create.mockResolvedValue(createdReview);
        mockTx.review.aggregate.mockResolvedValue({ _avg: { rating: 5 }, _count: 1 });
        mockTx.skill.update.mockResolvedValue({});
        return cb(mockTx);
      });

      const result = await createReview("user-1", "test-skill", {
        rating: 5,
        title: "Great skill",
        body: "Really helpful",
        usedFor: "Development",
      });

      expect(result.id).toBe("review-1");
      expect(result.rating).toBe(5);
      expect(result.title).toBe("Great skill");
      expect(result.helpfulCount).toBe(0);
      expect(result.notHelpfulCount).toBe(0);
      expect(result.userVote).toBeNull();
      expect(result.response).toBeNull();
    });

    it("throws NotFoundError when skill does not exist", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue(null);

      await expect(
        createReview("user-1", "nope", { rating: 5, title: "T", body: "B" }),
      ).rejects.toThrow("Skill not found");
    });

    it("throws ForbiddenError when reviewing own skill", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill-1", authorId: "user-1" });

      await expect(
        createReview("user-1", "my-skill", { rating: 5, title: "T", body: "B" }),
      ).rejects.toThrow("cannot review your own");
    });

    it("throws ConflictError for duplicate review", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({ id: "skill-1", authorId: "author-1" });
      mockPrisma.review.findUnique.mockResolvedValue({ id: "existing-review" });

      await expect(
        createReview("user-1", "test-skill", { rating: 5, title: "T", body: "B" }),
      ).rejects.toThrow("already reviewed");
    });
  });

  describe("deleteReview", () => {
    it("deletes a review owned by the user", async () => {
      mockPrisma.review.findUnique.mockResolvedValue({
        id: "review-1",
        authorId: "user-1",
        skillId: "skill-1",
      });

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        mockTx.review.delete.mockResolvedValue({});
        mockTx.review.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: 0 });
        mockTx.skill.update.mockResolvedValue({});
        return cb(mockTx);
      });

      await expect(deleteReview("user-1", "review-1")).resolves.toBeUndefined();
    });

    it("throws NotFoundError when review does not exist", async () => {
      mockPrisma.review.findUnique.mockResolvedValue(null);

      await expect(deleteReview("user-1", "no-review")).rejects.toThrow("Review not found");
    });

    it("throws ForbiddenError when deleting another user's review", async () => {
      mockPrisma.review.findUnique.mockResolvedValue({
        id: "review-1",
        authorId: "other-user",
        skillId: "skill-1",
      });

      await expect(deleteReview("user-1", "review-1")).rejects.toThrow("only delete your own");
    });
  });

  describe("voteReview", () => {
    it("upserts a helpful vote on a review", async () => {
      mockPrisma.review.findUnique.mockResolvedValue({ id: "review-1" });
      mockPrisma.reviewVote.upsert.mockResolvedValue({});

      await expect(voteReview("user-1", "review-1", true)).resolves.toBeUndefined();

      expect(mockPrisma.reviewVote.upsert).toHaveBeenCalledWith({
        where: { reviewId_userId: { reviewId: "review-1", userId: "user-1" } },
        create: { reviewId: "review-1", userId: "user-1", helpful: true },
        update: { helpful: true },
      });
    });

    it("upserts a not-helpful vote on a review", async () => {
      mockPrisma.review.findUnique.mockResolvedValue({ id: "review-1" });
      mockPrisma.reviewVote.upsert.mockResolvedValue({});

      await expect(voteReview("user-1", "review-1", false)).resolves.toBeUndefined();

      expect(mockPrisma.reviewVote.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ helpful: false }),
          update: { helpful: false },
        }),
      );
    });

    it("throws NotFoundError when review does not exist", async () => {
      mockPrisma.review.findUnique.mockResolvedValue(null);

      await expect(voteReview("user-1", "no-review", true)).rejects.toThrow("Review not found");
    });
  });
});
