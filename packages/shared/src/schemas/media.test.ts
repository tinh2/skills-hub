import { describe, it, expect } from "vitest";
import { addMediaSchema, reorderMediaSchema } from "./media.js";

describe("addMediaSchema", () => {
  it("accepts valid screenshot input", () => {
    const result = addMediaSchema.parse({
      type: "SCREENSHOT",
      url: "https://i.imgur.com/test.png",
      caption: "Test screenshot",
    });
    expect(result.type).toBe("SCREENSHOT");
    expect(result.sortOrder).toBe(0);
  });

  it("accepts valid YouTube input", () => {
    const result = addMediaSchema.parse({
      type: "YOUTUBE",
      url: "https://www.youtube.com/watch?v=abc123",
    });
    expect(result.type).toBe("YOUTUBE");
  });

  it("rejects invalid type", () => {
    expect(() =>
      addMediaSchema.parse({ type: "GIF", url: "https://example.com/a.gif" }),
    ).toThrow();
  });

  it("rejects invalid URL", () => {
    expect(() =>
      addMediaSchema.parse({ type: "SCREENSHOT", url: "not-a-url" }),
    ).toThrow();
  });

  it("rejects caption over 200 chars", () => {
    expect(() =>
      addMediaSchema.parse({
        type: "SCREENSHOT",
        url: "https://i.imgur.com/test.png",
        caption: "x".repeat(201),
      }),
    ).toThrow();
  });

  it("applies default sortOrder", () => {
    const result = addMediaSchema.parse({
      type: "SCREENSHOT",
      url: "https://i.imgur.com/test.png",
    });
    expect(result.sortOrder).toBe(0);
  });
});

describe("reorderMediaSchema", () => {
  it("accepts valid mediaIds array", () => {
    const result = reorderMediaSchema.parse({ mediaIds: ["a", "b", "c"] });
    expect(result.mediaIds).toHaveLength(3);
  });

  it("rejects empty array", () => {
    expect(() => reorderMediaSchema.parse({ mediaIds: [] })).toThrow();
  });
});
