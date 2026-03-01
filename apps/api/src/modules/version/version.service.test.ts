import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  skill: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  skillVersion: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../../common/db.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("../org/org.auth.js", () => ({
  isOrgMember: vi.fn().mockResolvedValue(false),
}));

vi.mock("../validation/validation.service.js", () => ({
  computeQualityScore: vi.fn().mockReturnValue(75),
}));

vi.mock("@skills-hub/skill-parser", () => ({
  compareSemver: vi.fn((a: string, b: string) => {
    const [aMaj, aMin, aPatch] = a.split(".").map(Number);
    const [bMaj, bMin, bPatch] = b.split(".").map(Number);
    if (aMaj !== bMaj) return aMaj - bMaj;
    if (aMin !== bMin) return aMin - bMin;
    return aPatch - bPatch;
  }),
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
}));

import { listVersions, getVersion, createVersion, getVersionDiff } from "./version.service.js";

const NOW = new Date("2026-02-28T12:00:00Z");

describe("listVersions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists versions for a public skill", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({
      id: "s1", visibility: "PUBLIC", authorId: "u1", orgId: null,
    });
    mockPrisma.skillVersion.findMany.mockResolvedValue([
      { id: "v2", version: "1.1.0", changelog: "Added features", qualityScore: 80, createdAt: NOW },
      { id: "v1", version: "1.0.0", changelog: "Initial", qualityScore: 70, createdAt: NOW },
    ]);

    const result = await listVersions("test-skill");
    expect(result).toHaveLength(2);
    expect(result[0].version).toBe("1.1.0");
    expect(result[0].createdAt).toBe(NOW.toISOString());
  });

  it("rejects if skill not found", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(null);
    await expect(listVersions("nonexistent")).rejects.toThrow("not found");
  });

  it("rejects if PRIVATE skill and not author", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({
      id: "s1", visibility: "PRIVATE", authorId: "other", orgId: null,
    });
    await expect(listVersions("private-skill", "user-1")).rejects.toThrow("not found");
  });

  it("allows author to view PRIVATE skill versions", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({
      id: "s1", visibility: "PRIVATE", authorId: "user-1", orgId: null,
    });
    mockPrisma.skillVersion.findMany.mockResolvedValue([]);

    const result = await listVersions("private-skill", "user-1");
    expect(result).toEqual([]);
  });
});

describe("getVersion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns version detail", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({
      id: "s1", visibility: "PUBLIC", authorId: "u1", orgId: null,
    });
    mockPrisma.skillVersion.findUnique.mockResolvedValue({
      id: "v1",
      version: "1.0.0",
      instructions: "Do the thing",
      changelog: "Initial release",
      qualityScore: 75,
      createdAt: NOW,
    });

    const result = await getVersion("test-skill", "1.0.0");
    expect(result.version).toBe("1.0.0");
    expect(result.instructions).toBe("Do the thing");
  });

  it("rejects if version not found", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({
      id: "s1", visibility: "PUBLIC", authorId: "u1", orgId: null,
    });
    mockPrisma.skillVersion.findUnique.mockResolvedValue(null);
    await expect(getVersion("test-skill", "9.9.9")).rejects.toThrow("not found");
  });
});

describe("createVersion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new version with isLatest flag management", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({
      id: "s1", authorId: "u1", name: "Test Skill", description: "desc",
      platforms: ["CLAUDE_CODE"],
    });
    mockPrisma.skillVersion.findUnique.mockResolvedValue(null); // no duplicate
    mockPrisma.skillVersion.findFirst.mockResolvedValue({
      version: "1.0.0",
    });

    const createdVersion = {
      id: "v2",
      version: "1.1.0",
      changelog: "New features",
      qualityScore: 75,
      createdAt: NOW,
    };

    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        skillVersion: {
          updateMany: vi.fn(),
          create: vi.fn().mockResolvedValue(createdVersion),
        },
        skill: {
          update: vi.fn(),
        },
      });
    });

    const result = await createVersion("u1", "test-skill", {
      version: "1.1.0",
      instructions: "Updated instructions",
      changelog: "New features",
    });

    expect(result.version).toBe("1.1.0");
    expect(result.qualityScore).toBe(75);
  });

  it("rejects if not the skill author", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({
      id: "s1", authorId: "other-user",
    });
    await expect(
      createVersion("u1", "test-skill", { version: "1.0.0", instructions: "test" }),
    ).rejects.toThrow("own skills");
  });

  it("rejects duplicate version", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "s1", authorId: "u1" });
    mockPrisma.skillVersion.findUnique.mockResolvedValue({ id: "existing" });

    await expect(
      createVersion("u1", "test-skill", { version: "1.0.0", instructions: "test" }),
    ).rejects.toThrow("already exists");
  });

  it("rejects version lower than current latest", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "s1", authorId: "u1" });
    mockPrisma.skillVersion.findUnique.mockResolvedValue(null); // no duplicate
    mockPrisma.skillVersion.findFirst.mockResolvedValue({ version: "2.0.0" });

    await expect(
      createVersion("u1", "test-skill", { version: "1.5.0", instructions: "test" }),
    ).rejects.toThrow("must be higher");
  });
});

describe("getVersionDiff", () => {
  beforeEach(() => vi.clearAllMocks());

  it("produces a diff between two versions", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({
      id: "s1", visibility: "PUBLIC", authorId: "u1", orgId: null,
    });
    mockPrisma.skillVersion.findUnique
      .mockResolvedValueOnce({
        instructions: "Line 1\nLine 2\nLine 3",
      })
      .mockResolvedValueOnce({
        instructions: "Line 1\nModified Line 2\nLine 3\nLine 4",
      });

    const result = await getVersionDiff("test-skill", "1.0.0", "1.1.0");
    expect(result.fromVersion).toBe("1.0.0");
    expect(result.toVersion).toBe("1.1.0");
    expect(result.diff).toContain("- Line 2");
    expect(result.diff).toContain("+ Modified Line 2");
    expect(result.diff).toContain("+ Line 4");
  });

  it("rejects if from-version not found", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({
      id: "s1", visibility: "PUBLIC", authorId: "u1", orgId: null,
    });
    mockPrisma.skillVersion.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ instructions: "test" });

    await expect(getVersionDiff("test-skill", "0.0.1", "1.0.0"))
      .rejects.toThrow("not found");
  });
});
