import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns base64-encoded ciphertext in format: iv:authTag:ciphertext
 * If no key is provided, returns the plaintext unchanged (dev fallback).
 */
export function encryptToken(plaintext: string, keyHex: string | undefined): string {
  if (!keyHex) return plaintext;

  const key = Buffer.from(keyHex, "hex");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: base64(iv):base64(authTag):base64(ciphertext)
  return `enc:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypt a token encrypted with encryptToken.
 * If the value doesn't start with "enc:", it's treated as plaintext (backwards compat).
 */
export function decryptToken(stored: string, keyHex: string | undefined): string {
  if (!stored.startsWith("enc:")) return stored;
  if (!keyHex) return stored; // Can't decrypt without key

  const parts = stored.slice(4).split(":");
  if (parts.length !== 3) return stored;

  const iv = Buffer.from(parts[0], "base64");
  const authTag = Buffer.from(parts[1], "base64");
  const ciphertext = Buffer.from(parts[2], "base64");

  const decipher = createDecipheriv(ALGORITHM, Buffer.from(keyHex, "hex"), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
