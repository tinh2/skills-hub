import { describe, it, expect, vi, beforeEach } from "vitest";

const mockTx = {
  skillReport: {
    update: vi.fn(),
    count: vi.fn(),
  },
  skill: {
    update: vi.fn(),
  },
};

const mockPrisma = vi.hoisted(() => ({
  skill: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  skillReport: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../../common/db.js", () => ({
  prisma: mockPrisma,
}));

const mockRefreshTrustLevel = vi.hoisted(() => vi.fn().mockResolvedValue("ESTABLISHED"));
vi.mock("../moderation/trust.service.js", () => ({
  refreshTrustLevel: mockRefreshTrustLevel,
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
  ForbiddenError: class ForbiddenError extends Error {
    statusCode = 403;
    code = "FORBIDDEN";
    constructor(msg: string) { super(msg); }
  },
  ConflictError: class ConflictError extends Error {
    statusCode = 409;
    code = "CONFLICT";
    constructor(msg: string) { super(msg); }
  },
  ValidationError: class ValidationError extends Error {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    constructor(msg: string) { super(msg); }
  },
}));

import { createReport, listPendingReports, resolveReport } from "./report.service.js";

const NOW = new Date("2026-03-02T12:00:00Z");

function makeReportRow(overrides: Record<string, any> = {}) {
  return {
    id: "report-1",
    reason: "MALICIOUS",
    description: "Contains shell injection",
    status: "PENDING",
    createdAt: NOW,
    resolvedAt: null,
    skill: { slug: "bad-skill", name: "Bad Skill" },
    reporter: { username: "reporter-user" },
    ...overrides,
  };
}

describe("report.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createReport", () => {
    it("creates a report for a skill", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({
        id: "skill-1",
        name: "Test Skill",
        authorId: "author-1",
        status: "PUBLISHED",
      });
      mockPrisma.skillReport.findUnique.mockResolvedValue(null);
      mockPrisma.skillReport.count
        .mockResolvedValueOnce(0) // daily count
        .mockResolvedValueOnce(0) // pending count
        .mockResolvedValueOnce(1); // total pending after create
      mockPrisma.skillReport.create.mockResolvedValue(makeReportRow());

      const result = await createReport("user-1", "test-skill", {
        reason: "MALICIOUS",
        description: "Contains shell injection",
      });

      expect(result.id).toBe("report-1");
      expect(result.reason).toBe("MALICIOUS");
      expect(result.status).toBe("PENDING");
      expect(result.skillSlug).toBe("bad-skill");
      expect(result.reporterUsername).toBe("reporter-user");
    });

    it("throws NotFoundError for nonexistent skill", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue(null);

      await expect(
        createReport("user-1", "nonexistent", { reason: "SPAM" }),
      ).rejects.toThrow("Skill not found");
    });

    it("throws NotFoundError for non-published skill", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({
        id: "skill-1",
        name: "Draft Skill",
        authorId: "author-1",
        status: "DRAFT",
      });

      await expect(
        createReport("user-1", "draft-skill", { reason: "SPAM" }),
      ).rejects.toThrow("Skill not found");
    });

    it("throws ForbiddenError when reporting own skill", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({
        id: "skill-1",
        name: "My Skill",
        authorId: "user-1",
        status: "PUBLISHED",
      });

      await expect(
        createReport("user-1", "my-skill", { reason: "SPAM" }),
      ).rejects.toThrow("cannot report your own");
    });

    it("throws ConflictError for duplicate report", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({
        id: "skill-1",
        name: "Test Skill",
        authorId: "author-1",
        status: "PUBLISHED",
      });
      mockPrisma.skillReport.findUnique.mockResolvedValue({ id: "existing" });

      await expect(
        createReport("user-1", "test-skill", { reason: "MALICIOUS" }),
      ).rejects.toThrow("already reported");
    });

    it("throws ValidationError when daily limit reached", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({
        id: "skill-1",
        name: "Test Skill",
        authorId: "author-1",
        status: "PUBLISHED",
      });
      mockPrisma.skillReport.findUnique.mockResolvedValue(null);
      mockPrisma.skillReport.count.mockResolvedValueOnce(10); // daily count at max

      await expect(
        createReport("user-1", "test-skill", { reason: "SPAM" }),
      ).rejects.toThrow("reports per day");
    });

    it("throws ValidationError when pending limit reached", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({
        id: "skill-1",
        name: "Test Skill",
        authorId: "author-1",
        status: "PUBLISHED",
      });
      mockPrisma.skillReport.findUnique.mockResolvedValue(null);
      mockPrisma.skillReport.count
        .mockResolvedValueOnce(0) // daily count OK
        .mockResolvedValueOnce(20); // pending count at max

      await expect(
        createReport("user-1", "test-skill", { reason: "SPAM" }),
      ).rejects.toThrow("pending reports");
    });

    it("auto-flags skill with 3+ pending reports", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({
        id: "skill-1",
        name: "Test Skill",
        authorId: "author-1",
        status: "PUBLISHED",
      });
      mockPrisma.skillReport.findUnique.mockResolvedValue(null);
      mockPrisma.skillReport.count
        .mockResolvedValueOnce(0) // daily
        .mockResolvedValueOnce(0) // pending per user
        .mockResolvedValueOnce(3); // total pending on skill
      mockPrisma.skillReport.create.mockResolvedValue(makeReportRow());

      await createReport("user-1", "test-skill", { reason: "MALICIOUS" });

      expect(mockPrisma.skill.update).toHaveBeenCalledWith({
        where: { id: "skill-1" },
        data: { flaggedForReview: true, reviewReason: "Multiple user reports" },
      });
    });

    it("does not flag skill with fewer than 3 pending reports", async () => {
      mockPrisma.skill.findUnique.mockResolvedValue({
        id: "skill-1",
        name: "Test Skill",
        authorId: "author-1",
        status: "PUBLISHED",
      });
      mockPrisma.skillReport.findUnique.mockResolvedValue(null);
      mockPrisma.skillReport.count
        .mockResolvedValueOnce(0) // daily
        .mockResolvedValueOnce(0) // pending per user
        .mockResolvedValueOnce(2); // only 2 pending
      mockPrisma.skillReport.create.mockResolvedValue(makeReportRow());

      await createReport("user-1", "test-skill", { reason: "MALICIOUS" });

      expect(mockPrisma.skill.update).not.toHaveBeenCalled();
    });
  });

  describe("listPendingReports", () => {
    it("returns pending reports", async () => {
      const reports = [makeReportRow({ id: "r1" }), makeReportRow({ id: "r2" })];
      mockPrisma.skillReport.findMany.mockResolvedValue(reports);

      const result = await listPendingReports(50);

      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.cursor).toBeNull();
    });

    it("paginates with cursor", async () => {
      const reports = [
        makeReportRow({ id: "r1" }),
        makeReportRow({ id: "r2" }),
        makeReportRow({ id: "r3" }),
      ];
      mockPrisma.skillReport.findMany.mockResolvedValue(reports);

      const result = await listPendingReports(2);

      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBe("r2");
    });
  });

  describe("resolveReport", () => {
    it("dismisses a pending report", async () => {
      mockPrisma.skillReport.findUnique.mockResolvedValue({
        id: "report-1",
        status: "PENDING",
        skillId: "skill-1",
        skill: { authorId: "author-1" },
      });
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        mockTx.skillReport.count.mockResolvedValue(0); // no more pending
        return cb(mockTx);
      });

      await resolveReport("admin-1", "report-1", "DISMISS");

      expect(mockTx.skillReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "report-1" },
          data: expect.objectContaining({ status: "DISMISSED" }),
        }),
      );
      expect(mockTx.skill.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "skill-1" },
          data: expect.objectContaining({ flaggedForReview: false }),
        }),
      );
      expect(mockRefreshTrustLevel).toHaveBeenCalledWith("author-1");
    });

    it("unpublishes a skill on UNPUBLISH action", async () => {
      mockPrisma.skillReport.findUnique.mockResolvedValue({
        id: "report-1",
        status: "PENDING",
        skillId: "skill-1",
        skill: { authorId: "author-1" },
      });
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));

      await resolveReport("admin-1", "report-1", "UNPUBLISH", "Malicious content");

      expect(mockTx.skill.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "skill-1" },
          data: expect.objectContaining({
            status: "DRAFT",
            flaggedForReview: true,
            moderatedBy: "admin-1",
          }),
        }),
      );
    });

    it("archives a skill on ARCHIVE action", async () => {
      mockPrisma.skillReport.findUnique.mockResolvedValue({
        id: "report-1",
        status: "PENDING",
        skillId: "skill-1",
        skill: { authorId: "author-1" },
      });
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));

      await resolveReport("admin-1", "report-1", "ARCHIVE");

      expect(mockTx.skill.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "skill-1" },
          data: expect.objectContaining({
            status: "ARCHIVED",
            flaggedForReview: false,
          }),
        }),
      );
    });

    it("throws NotFoundError for missing report", async () => {
      mockPrisma.skillReport.findUnique.mockResolvedValue(null);

      await expect(
        resolveReport("admin-1", "nonexistent", "DISMISS"),
      ).rejects.toThrow("Report not found");
    });

    it("throws ValidationError for already resolved report", async () => {
      mockPrisma.skillReport.findUnique.mockResolvedValue({
        id: "report-1",
        status: "DISMISSED",
        skillId: "skill-1",
        skill: { authorId: "author-1" },
      });

      await expect(
        resolveReport("admin-1", "report-1", "DISMISS"),
      ).rejects.toThrow("already resolved");
    });
  });
});
