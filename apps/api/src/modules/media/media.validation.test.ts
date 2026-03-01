import { describe, it, expect, vi } from "vitest";

vi.mock("../../common/errors.js", () => ({
  ValidationError: class ValidationError extends Error {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    constructor(msg: string) { super(msg); }
  },
}));

import { validateMediaUrl, sanitizeYouTubeUrl } from "./media.validation.js";

describe("media.validation", () => {
  describe("validateMediaUrl", () => {
    it("allows imgur.com screenshots", () => {
      const url = "https://i.imgur.com/abc123.png";
      const result = validateMediaUrl(url, "SCREENSHOT");
      expect(result).toBe(url);
    });

    it("allows raw.githubusercontent.com screenshots", () => {
      const url = "https://raw.githubusercontent.com/user/repo/main/screenshot.jpg";
      const result = validateMediaUrl(url, "SCREENSHOT");
      expect(result).toBe(url);
    });

    it("allows user-images.githubusercontent.com screenshots", () => {
      const url = "https://user-images.githubusercontent.com/12345/image.webp";
      const result = validateMediaUrl(url, "SCREENSHOT");
      expect(result).toBe(url);
    });

    it("allows cdn.skills-hub.ai screenshots", () => {
      const url = "https://cdn.skills-hub.ai/uploads/image.jpeg";
      const result = validateMediaUrl(url, "SCREENSHOT");
      expect(result).toBe(url);
    });

    it("rejects disallowed image hosts", () => {
      expect(() => validateMediaUrl("https://evil.com/image.png", "SCREENSHOT")).toThrow(
        "Image host not allowed",
      );
    });

    it("rejects non-HTTPS URLs", () => {
      expect(() => validateMediaUrl("http://i.imgur.com/abc.png", "SCREENSHOT")).toThrow(
        "Only HTTPS",
      );
    });

    it("rejects invalid URLs", () => {
      expect(() => validateMediaUrl("not-a-url", "SCREENSHOT")).toThrow("Invalid URL");
    });

    it("rejects invalid image extensions", () => {
      expect(() =>
        validateMediaUrl("https://i.imgur.com/file.txt", "SCREENSHOT"),
      ).toThrow("Invalid image extension");
    });

    it("allows YouTube watch URLs for YOUTUBE type", () => {
      const result = validateMediaUrl(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "YOUTUBE",
      );
      expect(result).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    });

    it("rejects disallowed video hosts", () => {
      expect(() =>
        validateMediaUrl("https://vimeo.com/12345", "YOUTUBE"),
      ).toThrow("Video host not allowed");
    });
  });

  describe("sanitizeYouTubeUrl", () => {
    it("extracts video ID from watch URL", () => {
      const result = sanitizeYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(result).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    });

    it("extracts video ID from youtu.be short URL", () => {
      const result = sanitizeYouTubeUrl("https://youtu.be/dQw4w9WgXcQ");
      expect(result).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    });

    it("extracts video ID from embed URL", () => {
      const result = sanitizeYouTubeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ");
      expect(result).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    });

    it("rejects URLs without a valid 11-char video ID", () => {
      expect(() => sanitizeYouTubeUrl("https://www.youtube.com/watch?v=short")).toThrow(
        "Invalid YouTube video ID",
      );
    });

    it("rejects URLs with no video parameter", () => {
      expect(() => sanitizeYouTubeUrl("https://www.youtube.com/channel/test")).toThrow(
        "Invalid YouTube video ID",
      );
    });
  });
});
