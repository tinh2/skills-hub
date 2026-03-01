import { describe, it, expect } from "vitest";
import { computeQualityScore, computeDetailedScore, validateSkill } from "./validation.service.js";

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

describe("validateSkill", () => {
  const good = {
    slug: "test-skill",
    name: "Test Skill",
    description: "A description that is long enough to earn points in the validation",
    categorySlug: "build",
    platforms: ["CLAUDE_CODE"],
    version: "1.0.0",
    instructions:
      "x".repeat(600) +
      "\n## Step 1\nProcess the input and generate output.\n" +
      "Handle errors gracefully with retry logic.\n" +
      "IMPORTANT: Never skip validation.\n" +
      "Example:\n```typescript\nconsole.log('hello');\n```\n" +
      "Output format: JSON response with status field.",
  };

  it("returns publishable for a well-formed skill", () => {
    const report = validateSkill(good);
    expect(report.publishable).toBe(true);
    expect(report.summary.errors).toBe(0);
    expect(report.qualityScore).toBeGreaterThanOrEqual(20);
  });

  it("returns slug in report", () => {
    const report = validateSkill(good);
    expect(report.slug).toBe("test-skill");
  });

  it("fails schema checks for missing name", () => {
    const report = validateSkill({ ...good, name: "" });
    expect(report.publishable).toBe(false);
    const nameCheck = report.checks.schema.find((c) => c.id === "schema.name");
    expect(nameCheck?.passed).toBe(false);
    expect(nameCheck?.severity).toBe("error");
  });

  it("fails schema checks for missing instructions", () => {
    const report = validateSkill({ ...good, instructions: "" });
    expect(report.publishable).toBe(false);
    const instrCheck = report.checks.schema.find((c) => c.id === "schema.instructions");
    expect(instrCheck?.passed).toBe(false);
  });

  it("warns on short description", () => {
    const report = validateSkill({ ...good, description: "short" });
    const descCheck = report.checks.schema.find((c) => c.id === "schema.description_length");
    expect(descCheck?.passed).toBe(false);
    expect(descCheck?.severity).toBe("warning");
  });

  it("warns on invalid semver", () => {
    const report = validateSkill({ ...good, version: "bad" });
    const versionCheck = report.checks.schema.find((c) => c.id === "schema.version");
    expect(versionCheck?.passed).toBe(false);
    expect(versionCheck?.severity).toBe("warning");
  });

  it("detects TODO markers as error", () => {
    const report = validateSkill({ ...good, instructions: good.instructions + "\nTODO: finish this section" });
    const todoCheck = report.checks.structure.find((c) => c.id === "structure.no_todos");
    expect(todoCheck?.passed).toBe(false);
    expect(todoCheck?.severity).toBe("error");
  });

  it("detects FIXME markers as error", () => {
    const report = validateSkill({ ...good, instructions: good.instructions + "\nFIXME: broken logic" });
    const todoCheck = report.checks.structure.find((c) => c.id === "structure.no_todos");
    expect(todoCheck?.passed).toBe(false);
  });

  it("passes when no TODO markers present", () => {
    const report = validateSkill(good);
    const todoCheck = report.checks.structure.find((c) => c.id === "structure.no_todos");
    expect(todoCheck?.passed).toBe(true);
  });

  it("detects unlabeled code blocks", () => {
    const instructions = good.instructions + "\n```\nunlabeled block\n```";
    const report = validateSkill({ ...good, instructions });
    const codeCheck = report.checks.structure.find((c) => c.id === "structure.code_block_langs");
    expect(codeCheck?.passed).toBe(false);
  });

  it("passes when all code blocks have language hints", () => {
    const report = validateSkill(good);
    const codeCheck = report.checks.structure.find((c) => c.id === "structure.code_block_langs");
    expect(codeCheck?.passed).toBe(true);
  });

  it("detects heading hierarchy gaps", () => {
    const instructions = good.instructions + "\n# Heading 1\n### Jump to 3\n";
    const report = validateSkill({ ...good, instructions });
    const headingCheck = report.checks.structure.find((c) => c.id === "structure.heading_hierarchy");
    expect(headingCheck?.passed).toBe(false);
  });

  it("flags trivial instructions as error", () => {
    const report = validateSkill({ ...good, instructions: "Do the thing." });
    const trivialCheck = report.checks.structure.find((c) => c.id === "structure.not_trivial");
    expect(trivialCheck?.passed).toBe(false);
    expect(trivialCheck?.severity).toBe("error");
  });

  it("computes summary counts correctly", () => {
    const report = validateSkill(good);
    const all = [
      ...report.checks.schema,
      ...report.checks.content,
      ...report.checks.structure,
    ];
    expect(report.summary.total).toBe(all.length);
    expect(report.summary.passed + report.summary.errors + report.summary.warnings)
      .toBeLessThanOrEqual(report.summary.total);
  });

  it("is not publishable when quality score is below threshold", () => {
    const report = validateSkill({
      ...good,
      name: "",
      description: "",
      instructions: "",
      version: "bad",
      categorySlug: "invalid",
    });
    expect(report.publishable).toBe(false);
  });
});
