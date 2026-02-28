import { describe, it, expect, beforeAll } from "vitest";
import { createRefreshToken, hashApiKey, createAccessToken, verifyToken } from "./auth.js";

// Set JWT_SECRET for token tests
beforeAll(() => {
  process.env.JWT_SECRET = "test-jwt-secret-that-is-at-least-32-chars";
  process.env.JWT_EXPIRES_IN = "15m";
});

describe("createRefreshToken", () => {
  it("returns a 64-char hex string", async () => {
    const token = await createRefreshToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]+$/);
  });

  it("generates unique tokens", async () => {
    const a = await createRefreshToken();
    const b = await createRefreshToken();
    expect(a).not.toBe(b);
  });
});

describe("hashApiKey", () => {
  it("produces a deterministic hash", async () => {
    const a = await hashApiKey("test-key");
    const b = await hashApiKey("test-key");
    expect(a).toBe(b);
  });

  it("produces different hashes for different inputs", async () => {
    const a = await hashApiKey("key-1");
    const b = await hashApiKey("key-2");
    expect(a).not.toBe(b);
  });

  it("returns a 64-char hex string", async () => {
    const hash = await hashApiKey("test");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });
});

describe("createAccessToken + verifyToken", () => {
  it("round-trips correctly", async () => {
    const token = await createAccessToken("user-123", "testuser");
    const payload = await verifyToken(token);
    expect(payload.sub).toBe("user-123");
    expect(payload.username).toBe("testuser");
  });

  it("rejects invalid tokens", async () => {
    await expect(verifyToken("not-a-valid-jwt")).rejects.toThrow();
  });

  it("rejects tampered tokens", async () => {
    const token = await createAccessToken("user-123", "testuser");
    const tampered = token.slice(0, -5) + "xxxxx";
    await expect(verifyToken(tampered)).rejects.toThrow();
  });
});
