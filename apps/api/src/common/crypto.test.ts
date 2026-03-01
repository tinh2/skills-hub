import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken } from "./crypto.js";
import { randomBytes } from "crypto";

// Generate a valid 256-bit key for testing
const TEST_KEY = randomBytes(32).toString("hex");

describe("encryptToken", () => {
  it("returns plaintext when no key provided", () => {
    const result = encryptToken("my-secret-token", undefined);
    expect(result).toBe("my-secret-token");
  });

  it("encrypts when key is provided", () => {
    const result = encryptToken("my-secret-token", TEST_KEY);
    expect(result).toMatch(/^enc:/);
    expect(result).not.toContain("my-secret-token");
  });

  it("produces different ciphertexts for same input (random IV)", () => {
    const a = encryptToken("same-input", TEST_KEY);
    const b = encryptToken("same-input", TEST_KEY);
    expect(a).not.toBe(b);
  });
});

describe("decryptToken", () => {
  it("returns plaintext unchanged when not encrypted", () => {
    const result = decryptToken("plain-token", TEST_KEY);
    expect(result).toBe("plain-token");
  });

  it("returns encrypted value unchanged when no key provided", () => {
    const encrypted = encryptToken("my-token", TEST_KEY);
    const result = decryptToken(encrypted, undefined);
    expect(result).toBe(encrypted);
  });

  it("round-trips encrypt then decrypt", () => {
    const original = "ghp_abc123XYZ789";
    const encrypted = encryptToken(original, TEST_KEY);
    const decrypted = decryptToken(encrypted, TEST_KEY);
    expect(decrypted).toBe(original);
  });

  it("handles empty string", () => {
    const encrypted = encryptToken("", TEST_KEY);
    const decrypted = decryptToken(encrypted, TEST_KEY);
    expect(decrypted).toBe("");
  });

  it("handles unicode content", () => {
    const original = "token-with-émojis-🔑";
    const encrypted = encryptToken(original, TEST_KEY);
    const decrypted = decryptToken(encrypted, TEST_KEY);
    expect(decrypted).toBe(original);
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encryptToken("my-token", TEST_KEY);
    const tampered = encrypted.slice(0, -2) + "XX";
    expect(() => decryptToken(tampered, TEST_KEY)).toThrow();
  });

  it("throws with wrong key", () => {
    const encrypted = encryptToken("my-token", TEST_KEY);
    const wrongKey = randomBytes(32).toString("hex");
    expect(() => decryptToken(encrypted, wrongKey)).toThrow();
  });
});
