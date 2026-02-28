import { describe, it, expect } from "vitest";
import { computeQualityScore, computeDetailedScore } from "./validation.service.js";

describe("computeQualityScore", () => {
  const minimal = {
    name: "x",
    description: "short",
    categorySlug: "invalid",
    platforms: [],
    instructions: "tiny",
    version: "bad",
  };

  it("scores minimal input low", () => {
    const score = computeQualityScore(minimal);
    // Gets 10 for having all required fields present (name, description, instructions, version are all truthy)
    expect(score).toBe(10);
  });

  it("awards points for all required fields present", () => {
    const input = {
      ...minimal,
      name: "Test",
      description: "A description",
      instructions: "Some instructions",
      version: "1.0.0",
    };
    const breakdown = computeDetailedScore(input);
    // Should get: SCHEMA_FIELDS_PRESENT(10) + SCHEMA_SEMVER(5) = 15
    expect(breakdown.schema).toBeGreaterThanOrEqual(15);
  });

  it("awards description length bonus", () => {
    const input = {
      ...minimal,
      name: "Test",
      description: "x".repeat(50),
      instructions: "Some instructions",
      version: "1.0.0",
    };
    const breakdown = computeDetailedScore(input);
    expect(breakdown.schema).toBeGreaterThanOrEqual(20); // fields(10) + desc(5) + semver(5)
  });

  it("awards valid category points", () => {
    const input = {
      ...minimal,
      name: "Test",
      description: "x".repeat(50),
      instructions: "Some instructions",
      version: "1.0.0",
      categorySlug: "build",
    };
    const breakdown = computeDetailedScore(input);
    expect(breakdown.schema).toBe(25); // max schema score
  });

  it("awards instruction length points", () => {
    const input = {
      ...minimal,
      name: "Test",
      description: "x".repeat(50),
      instructions: "x".repeat(500),
      version: "1.0.0",
      categorySlug: "build",
    };
    const breakdown = computeDetailedScore(input);
    expect(breakdown.instructions).toBeGreaterThanOrEqual(10);
  });

  it("awards long instruction bonus", () => {
    const input = {
      ...minimal,
      name: "Test",
      description: "x".repeat(50),
      instructions: "x".repeat(2000),
      version: "1.0.0",
      categorySlug: "build",
    };
    const breakdown = computeDetailedScore(input);
    expect(breakdown.instructions).toBeGreaterThanOrEqual(15); // min_length(10) + long_bonus(5)
  });

  it("detects structured phases", () => {
    const input = {
      ...minimal,
      name: "Test",
      description: "x".repeat(50),
      instructions: "x".repeat(500) + "\n## Phase 1\nDo something\n## Phase 2\nDo more",
      version: "1.0.0",
      categorySlug: "build",
    };
    const breakdown = computeDetailedScore(input);
    expect(breakdown.details.some((d) => d.includes("structured"))).toBe(true);
  });

  it("caps total score at 100", () => {
    const rich = "x".repeat(2000) +
      "\n## Step 1\nInput: foo\nOutput: bar\n" +
      "Error handling: catch all errors\n" +
      "IMPORTANT: Never skip this step\n" +
      "Example:\n```\ncode here\n```\n" +
      "Output format: JSON response";
    const input = {
      name: "Test",
      description: "x".repeat(50),
      instructions: rich,
      version: "1.0.0",
      categorySlug: "build",
      platforms: ["CLAUDE_CODE"],
    };
    const score = computeQualityScore(input);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns breakdown with details", () => {
    const input = {
      ...minimal,
      name: "Test",
      description: "x".repeat(50),
      instructions: "x".repeat(500),
      version: "1.0.0",
      categorySlug: "build",
    };
    const breakdown = computeDetailedScore(input);
    expect(breakdown.details.length).toBeGreaterThan(0);
    expect(breakdown.total).toBe(breakdown.schema + breakdown.instructions);
  });
});
