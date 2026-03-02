import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  skill: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../../common/db.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("../../common/errors.js", () => ({
  NotFoundError: class NotFoundError extends Error {
    statusCode = 404;
    code: string;
    constructor(resource: string) {
      super(`${resource} not found`);
      this.code = `${resource.toUpperCase()}_NOT_FOUND`;
    }
  },
  ValidationError: class ValidationError extends Error {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    constructor(msg: string) { super(msg); }
  },
}));

const mockRefreshTrustLevel = vi.hoisted(() => vi.fn().mockResolvedValue("ESTABLISHED"));
vi.mock("./trust.service.js", () => ({
  refreshTrustLevel: mockRefreshTrustLevel,
}));

import { listFlaggedSkills, approveSkill, rejectSkill } from "./moderation.service.js";

const NOW = new Date("2026-03-02T12:00:00Z");

function makeFlaggedRow(overrides: Record<string, any> = {}) {
  return {
    slug: "flagged-skill",
    name: "Flagged Skill",
    status: "PENDING_REVIEW",
    reviewReason: "Security warnings",
    flaggedForReview: true,
    createdAt: NOW,
    author: { username: "testuser" },
    _count: { reports: 2 },
    ...overrides,
  };
}

describe("moderation.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listFlaggedSkills", () => {
    it("returns flagged and pending review skills", async () => {
      const rows = [makeFlaggedRow(), makeFlaggedRow({ slug: "skill-2", name: "Skill 2" })];
      mockPrisma.skill.findMany.mockResolvedValue(rows);

      const result = await listFlaggedSkills(50);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].slug).toBe("flagged-skill");
      expect(result.data[0].authorUsername).toBe("testuser");
      expect(result.data[0].pendingReportCount).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it("paginates with cursor", async () => {
      const rows = [
        makeFlaggedRow({ slug: "s1" }),
        makeFlaggedRow({ slug: "s2" }),
        makeFlaggedRow({ slug: "s3" }),
      ];
      mockPrisma.skill.findMany.mockResolvedValue(rows);

      const result = await listFlaggedSkills(2);

      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBe("s2");
    });

    it("passes cursor for pagination skip", async () => {
      mockPrisma.skill.findMany.mockResolvedValue([]);

      await listFlaggedSkills(50, "prev-slug");

      const callArgs = mockPrisma.skill.findMany.mock.calls[0][0];
      expect(callArgs.cursor).toEqual({ slug: "prev-slug" });
      expect(callArgs.skip).toBe(1);
    });
  });

  describe("approveSkill", () => {
    it("approves a PENDING_REVIEW skill and refreshes trust level", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({
        id: "skill-1",
        status: "PENDING_REVIEW",
        authorId: "author-1",
      });

      await approveSkill("admin-1", "test-skill");

      expect(mockPrisma.skill.update).toHaveBeenCalledWith({
        where: { id: "skill-1" },
        data: {
          status: "PUBLISHED",
          flaggedForReview: false,
          reviewReason: null,
          moderatedAt: expect.any(Date),
          moderatedBy: "admin-1",
        },
      });
      expect(mockRefreshTrustLevel).toHaveBeenCalledWith("author-1");
    });

    it("throws NotFoundError for missing skill", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue(null);

      await expect(approveSkill("admin-1", "nonexistent")).rejects.toThrow("Skill not found");
    });

    it("throws ValidationError if skill is not PENDING_REVIEW", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({
        id: "skill-1",
        status: "PUBLISHED",
        authorId: "author-1",
      });

      await expect(approveSkill("admin-1", "test-skill")).rejects.toThrow(
        "Only skills in PENDING_REVIEW",
      );
    });
  });

  describe("rejectSkill", () => {
    it("rejects a PENDING_REVIEW skill and refreshes trust level", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({
        id: "skill-1",
        status: "PENDING_REVIEW",
        authorId: "author-1",
      });

      await rejectSkill("admin-1", "test-skill", "Contains malicious patterns");

      expect(mockPrisma.skill.update).toHaveBeenCalledWith({
        where: { id: "skill-1" },
        data: {
          status: "DRAFT",
          flaggedForReview: false,
          reviewReason: "Contains malicious patterns",
          moderatedAt: expect.any(Date),
          moderatedBy: "admin-1",
        },
      });
      expect(mockRefreshTrustLevel).toHaveBeenCalledWith("author-1");
    });

    it("uses default rejection reason when none provided", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({
        id: "skill-1",
        status: "PENDING_REVIEW",
        authorId: "author-1",
      });

      await rejectSkill("admin-1", "test-skill");

      const callArgs = mockPrisma.skill.update.mock.calls[0][0];
      expect(callArgs.data.reviewReason).toBe("Rejected by moderator");
    });

    it("throws NotFoundError for missing skill", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue(null);

      await expect(rejectSkill("admin-1", "nonexistent")).rejects.toThrow("Skill not found");
    });

    it("throws ValidationError if skill is not PENDING_REVIEW", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({
        id: "skill-1",
        status: "DRAFT",
        authorId: "author-1",
      });

      await expect(rejectSkill("admin-1", "test-skill")).rejects.toThrow(
        "Only skills in PENDING_REVIEW",
      );
    });
  });
});
