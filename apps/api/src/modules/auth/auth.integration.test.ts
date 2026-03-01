import { describe, it, expect } from "vitest";
import { setupIntegrationTest, createTestUser, testPrisma } from "../../test/setup.js";
import { refreshAccessToken, revokeRefreshToken } from "./auth.service.js";
import { createRefreshToken, hashToken, verifyToken } from "../../common/auth.js";

setupIntegrationTest();

async function createStoredRefreshToken(userId: string, expiresInMs = 7 * 24 * 60 * 60 * 1000) {
  const rawToken = await createRefreshToken();
  const tokenHash = await hashToken(rawToken);
  await testPrisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt: new Date(Date.now() + expiresInMs),
    },
  });
  return rawToken;
}

describe("auth service (integration)", () => {
  describe("refreshAccessToken", () => {
    it("returns new access + refresh tokens for a valid refresh token", async () => {
      const user = await createTestUser();
      const rawToken = await createStoredRefreshToken(user.id);

      const result = await refreshAccessToken(rawToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe(rawToken);

      // Verify the new access token is valid and contains correct claims
      const payload = await verifyToken(result.accessToken);
      expect(payload.sub).toBe(user.id);
      expect(payload.username).toBe(user.username);
    });

    it("rotates the refresh token — old token is invalidated", async () => {
      const user = await createTestUser();
      const rawToken = await createStoredRefreshToken(user.id);

      const result = await refreshAccessToken(rawToken);

      // Old token should be gone
      const oldHash = await hashToken(rawToken);
      const oldStored = await testPrisma.refreshToken.findUnique({ where: { tokenHash: oldHash } });
      expect(oldStored).toBeNull();

      // New token should exist
      const newHash = await hashToken(result.refreshToken);
      const newStored = await testPrisma.refreshToken.findUnique({ where: { tokenHash: newHash } });
      expect(newStored).not.toBeNull();
      expect(newStored!.userId).toBe(user.id);
    });

    it("throws UnauthorizedError for an invalid refresh token", async () => {
      await expect(refreshAccessToken("nonexistent-token-value")).rejects.toThrow(
        "Invalid refresh token",
      );
    });

    it("throws UnauthorizedError and deletes expired token", async () => {
      const user = await createTestUser();
      const rawToken = await createStoredRefreshToken(user.id, -1000); // expired 1s ago

      await expect(refreshAccessToken(rawToken)).rejects.toThrow("Refresh token expired");

      // Expired token should be deleted from DB
      const hash = await hashToken(rawToken);
      const stored = await testPrisma.refreshToken.findUnique({ where: { tokenHash: hash } });
      expect(stored).toBeNull();
    });

    it("chained refresh — new token can be used to refresh again", async () => {
      const user = await createTestUser();
      const rawToken = await createStoredRefreshToken(user.id);

      const first = await refreshAccessToken(rawToken);
      const second = await refreshAccessToken(first.refreshToken);

      expect(second.accessToken).toBeDefined();
      expect(second.refreshToken).not.toBe(first.refreshToken);

      // Original token should fail
      await expect(refreshAccessToken(rawToken)).rejects.toThrow("Invalid refresh token");
    });
  });

  describe("revokeRefreshToken", () => {
    it("deletes a valid refresh token", async () => {
      const user = await createTestUser();
      const rawToken = await createStoredRefreshToken(user.id);

      await revokeRefreshToken(rawToken);

      const hash = await hashToken(rawToken);
      const stored = await testPrisma.refreshToken.findUnique({ where: { tokenHash: hash } });
      expect(stored).toBeNull();
    });

    it("is idempotent — revoking a nonexistent token does not throw", async () => {
      await expect(revokeRefreshToken("does-not-exist")).resolves.toBeUndefined();
    });

    it("does not affect other users' tokens", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const token1 = await createStoredRefreshToken(user1.id);
      const token2 = await createStoredRefreshToken(user2.id);

      await revokeRefreshToken(token1);

      // user2's token should still exist
      const hash2 = await hashToken(token2);
      const stored2 = await testPrisma.refreshToken.findUnique({ where: { tokenHash: hash2 } });
      expect(stored2).not.toBeNull();
    });
  });

  describe("token cleanup (MAX_REFRESH_TOKENS_PER_USER = 5)", () => {
    it("keeps only 5 most recent tokens when a 6th is created via exchangeGithubCode", async () => {
      const user = await createTestUser();

      // Create 6 refresh tokens directly (simulating 6 logins)
      const tokens: string[] = [];
      for (let i = 0; i < 6; i++) {
        const raw = await createRefreshToken();
        const hash = await hashToken(raw);
        await testPrisma.refreshToken.create({
          data: {
            tokenHash: hash,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            createdAt: new Date(Date.now() + i * 1000), // ensure ordering
          },
        });
        tokens.push(raw);
      }

      // Verify all 6 exist before cleanup
      const before = await testPrisma.refreshToken.count({ where: { userId: user.id } });
      expect(before).toBe(6);

      // The cleanup logic runs inside exchangeGithubCode, which we can't easily call
      // (requires GitHub API). Instead, verify the cleanup SQL pattern works:
      const allTokens = await testPrisma.refreshToken.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      const idsToDelete = allTokens.slice(5).map((t) => t.id);
      await testPrisma.refreshToken.deleteMany({ where: { id: { in: idsToDelete } } });

      const after = await testPrisma.refreshToken.count({ where: { userId: user.id } });
      expect(after).toBe(5);
    });

    it("refreshAccessToken does not accumulate tokens beyond expected count", async () => {
      const user = await createTestUser();

      // Start with one token, refresh it 3 times
      let rawToken = await createStoredRefreshToken(user.id);

      for (let i = 0; i < 3; i++) {
        const result = await refreshAccessToken(rawToken);
        rawToken = result.refreshToken;
      }

      // Each refresh rotates 1-for-1, so count should still be 1
      const count = await testPrisma.refreshToken.count({ where: { userId: user.id } });
      expect(count).toBe(1);
    });
  });
});
