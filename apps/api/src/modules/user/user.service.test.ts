import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
  apiKey: {
    count: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../../common/db.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("../../common/auth.js", () => ({
  hashApiKey: vi.fn().mockResolvedValue("hashed-key"),
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

import { getPublicProfile, getPrivateProfile, createApiKey, listApiKeys, deleteApiKey } from "./user.service.js";

const NOW = new Date("2026-02-28T12:00:00Z");

describe("getPublicProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns formatted public profile", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://github.com/test.png",
      bio: "Hello",
      githubUrl: "https://github.com/testuser",
      createdAt: NOW,
      _count: { skills: 3 },
      skills: [{ installCount: 10 }, { installCount: 20 }, { installCount: 5 }],
    });

    const result = await getPublicProfile("testuser");
    expect(result.username).toBe("testuser");
    expect(result.skillCount).toBe(3);
    expect(result.totalInstalls).toBe(35);
    expect(result).not.toHaveProperty("email");
  });

  it("throws NotFoundError for unknown user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(getPublicProfile("nobody")).rejects.toThrow("not found");
  });
});

describe("createApiKey", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an API key", async () => {
    mockPrisma.apiKey.count.mockResolvedValue(0);
    mockPrisma.apiKey.create.mockResolvedValue({
      id: "key-1",
      name: "My Key",
      keyPrefix: "sh_abc123...",
      keyHash: "hashed",
      lastUsedAt: null,
      expiresAt: null,
      createdAt: NOW,
    });

    const result = await createApiKey("u1", "My Key");
    expect(result.id).toBe("key-1");
    expect(result.name).toBe("My Key");
    expect(result.key).toMatch(/^sh_/);
  });

  it("rejects when API key limit reached", async () => {
    mockPrisma.apiKey.count.mockResolvedValue(10);
    await expect(createApiKey("u1", "Too Many")).rejects.toThrow("Maximum");
  });

  it("sets expiration when expiresInDays provided", async () => {
    mockPrisma.apiKey.count.mockResolvedValue(0);
    mockPrisma.apiKey.create.mockImplementation(async ({ data }) => ({
      id: "key-2",
      name: data.name,
      keyPrefix: data.keyPrefix,
      keyHash: data.keyHash,
      lastUsedAt: null,
      expiresAt: data.expiresAt,
      createdAt: NOW,
    }));

    const result = await createApiKey("u1", "Expiring Key", 30);
    expect(result.expiresAt).not.toBeNull();
  });
});

describe("listApiKeys", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns formatted key list", async () => {
    mockPrisma.apiKey.findMany.mockResolvedValue([
      {
        id: "key-1",
        name: "Key 1",
        keyPrefix: "sh_abc...",
        lastUsedAt: NOW,
        expiresAt: null,
        createdAt: NOW,
      },
    ]);

    const result = await listApiKeys("u1");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Key 1");
    expect(result[0].lastUsedAt).toBe(NOW.toISOString());
  });
});

describe("deleteApiKey", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes a key owned by the user", async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({ id: "key-1", userId: "u1" });
    mockPrisma.apiKey.delete.mockResolvedValue({});

    await deleteApiKey("u1", "key-1");
    expect(mockPrisma.apiKey.delete).toHaveBeenCalledWith({ where: { id: "key-1" } });
  });

  it("rejects if key not found", async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue(null);
    await expect(deleteApiKey("u1", "missing")).rejects.toThrow("not found");
  });

  it("rejects if key belongs to another user", async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({ id: "key-1", userId: "other" });
    await expect(deleteApiKey("u1", "key-1")).rejects.toThrow("not found");
  });
});
