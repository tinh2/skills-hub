import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  skill: {
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  skillReport: {
    count: vi.fn(),
  },
}));

vi.mock("../../common/db.js", () => ({
  prisma: mockPrisma,
}));

import { computeTrustLevel, refreshTrustLevel } from "./trust.service.js";
import { TRUST_THRESHOLDS } from "@skills-hub/shared";

describe("trust.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("computeTrustLevel", () => {
    it("returns NEW for nonexistent user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await computeTrustLevel("nonexistent");

      expect(result).toBe("NEW");
    });

    it("returns TRUSTED for admin users", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        createdAt: new Date(),
        isAdmin: true,
      });

      const result = await computeTrustLevel("admin-1");

      expect(result).toBe("TRUSTED");
    });

    it("returns NEW when too many unresolved reports", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 365); // old account

      mockPrisma.user.findUnique.mockResolvedValue({
        createdAt: oldDate,
        isAdmin: false,
      });
      mockPrisma.skill.count.mockResolvedValue(20);
      mockPrisma.skill.aggregate.mockResolvedValue({ _avg: { qualityScore: 90 } });
      mockPrisma.skillReport.count.mockResolvedValue(TRUST_THRESHOLDS.MAX_UNRESOLVED_REPORTS);

      const result = await computeTrustLevel("user-1");

      expect(result).toBe("NEW");
    });

    it("returns TRUSTED for well-established author", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - (TRUST_THRESHOLDS.TRUSTED_MIN_ACCOUNT_AGE_DAYS + 1));

      mockPrisma.user.findUnique.mockResolvedValue({
        createdAt: oldDate,
        isAdmin: false,
      });
      mockPrisma.skill.count.mockResolvedValue(TRUST_THRESHOLDS.TRUSTED_MIN_PUBLISHED);
      mockPrisma.skill.aggregate.mockResolvedValue({
        _avg: { qualityScore: TRUST_THRESHOLDS.TRUSTED_MIN_AVG_SCORE },
      });
      mockPrisma.skillReport.count.mockResolvedValue(0);

      const result = await computeTrustLevel("user-1");

      expect(result).toBe("TRUSTED");
    });

    it("returns ESTABLISHED for mid-tier author", async () => {
      const date = new Date();
      date.setDate(date.getDate() - (TRUST_THRESHOLDS.ESTABLISHED_MIN_ACCOUNT_AGE_DAYS + 1));

      mockPrisma.user.findUnique.mockResolvedValue({
        createdAt: date,
        isAdmin: false,
      });
      mockPrisma.skill.count.mockResolvedValue(TRUST_THRESHOLDS.ESTABLISHED_MIN_PUBLISHED);
      mockPrisma.skill.aggregate.mockResolvedValue({
        _avg: { qualityScore: TRUST_THRESHOLDS.ESTABLISHED_MIN_AVG_SCORE },
      });
      mockPrisma.skillReport.count.mockResolvedValue(0);

      const result = await computeTrustLevel("user-1");

      expect(result).toBe("ESTABLISHED");
    });

    it("returns NEW for brand new user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        createdAt: new Date(), // just created
        isAdmin: false,
      });
      mockPrisma.skill.count.mockResolvedValue(0);
      mockPrisma.skill.aggregate.mockResolvedValue({ _avg: { qualityScore: null } });
      mockPrisma.skillReport.count.mockResolvedValue(0);

      const result = await computeTrustLevel("user-1");

      expect(result).toBe("NEW");
    });
  });

  describe("refreshTrustLevel", () => {
    it("computes and persists trust level", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        createdAt: new Date(),
        isAdmin: true,
      });

      const result = await refreshTrustLevel("admin-1");

      expect(result).toBe("TRUSTED");
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "admin-1" },
        data: { trustLevel: "TRUSTED" },
      });
    });
  });
});
