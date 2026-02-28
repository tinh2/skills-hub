import { describe, it, expect } from "vitest";
import { createReviewSchema } from "./review.js";

describe("createReviewSchema", () => {
  it("accepts rating 1", () => {
    const result = createReviewSchema.parse({ rating: 1 });
    expect(result.rating).toBe(1);
  });

  it("accepts rating 5", () => {
    const result = createReviewSchema.parse({ rating: 5 });
    expect(result.rating).toBe(5);
  });

  it("rejects rating 0", () => {
    expect(() => createReviewSchema.parse({ rating: 0 })).toThrow();
  });

  it("rejects rating 6", () => {
    expect(() => createReviewSchema.parse({ rating: 6 })).toThrow();
  });

  it("rejects non-integer rating", () => {
    expect(() => createReviewSchema.parse({ rating: 3.5 })).toThrow();
  });

  it("accepts optional fields", () => {
    const result = createReviewSchema.parse({
      rating: 4,
      title: "Great skill",
      body: "Very useful",
      usedFor: "Code review",
    });
    expect(result.title).toBe("Great skill");
  });
});
