import { describe, it, expect } from "vitest";
import { translateToHand, serializeHandToml } from "./openfang.js";
import type { ParsedSkill } from "./index.js";

const sampleSkill: ParsedSkill = {
  name: "Code Reviewer",
  description: "Reviews code for bugs and style issues",
  version: "1.2.0",
  category: "build",
  platforms: ["CLAUDE_CODE", "CURSOR"],
  instructions: `You are an autonomous code reviewer.

## Phase 1: Analysis
Input: The user provides a git diff or file path.
Output: A structured review with line-by-line comments.

## Phase 2: Suggestions
Error handling: If the diff is empty, report "no changes found".
IMPORTANT: Never modify code directly — only suggest changes.

Example:
\`\`\`
// Line 42: Consider using const instead of let
\`\`\`

Output format: Markdown with headings per file.`,
  raw: "",
};

describe("translateToHand", () => {
  it("translates a parsed skill to HandConfig", () => {
    const config = translateToHand(sampleSkill);

    expect(config.hand.name).toBe("code-reviewer");
    expect(config.hand.description).toBe("Reviews code for bugs and style issues");
    expect(config.hand.version).toBe("1.2.0");
  });

  it("sets default model config", () => {
    const config = translateToHand(sampleSkill);

    expect(config.model.provider).toBe("anthropic");
    expect(config.model.model_id).toBe("claude-sonnet-4-5-20250514");
    expect(config.model.max_tokens).toBe(4096);
    expect(config.model.temperature).toBe(0.3);
  });

  it("passes instructions as system_prompt", () => {
    const config = translateToHand(sampleSkill);

    expect(config.instructions.system_prompt).toBe(sampleSkill.instructions);
  });

  it("extracts user_template from instructions", () => {
    const config = translateToHand(sampleSkill);

    // Should extract the input specification or fall back to {{input}}
    expect(config.instructions.user_template).toBeDefined();
    expect(config.instructions.user_template.length).toBeGreaterThan(0);
  });

  it("respects custom options", () => {
    const config = translateToHand(sampleSkill, {
      modelProvider: "openai",
      modelId: "gpt-4",
      maxTokens: 8192,
      temperature: 0.7,
      timeoutSeconds: 60,
      sourceUrl: "https://skills-hub.ai/skills/code-reviewer",
    });

    expect(config.model.provider).toBe("openai");
    expect(config.model.model_id).toBe("gpt-4");
    expect(config.model.max_tokens).toBe(8192);
    expect(config.model.temperature).toBe(0.7);
    expect(config.limits.timeout_seconds).toBe(60);
    expect(config.metadata.source_url).toBe("https://skills-hub.ai/skills/code-reviewer");
  });

  it("sets metadata from skill", () => {
    const config = translateToHand(sampleSkill);

    expect(config.metadata.source).toBe("skills-hub.ai");
    expect(config.metadata.platforms).toEqual(["CLAUDE_CODE", "CURSOR"]);
    expect(config.metadata.category).toBe("build");
  });

  it("sanitizes name for OpenFang compatibility", () => {
    const skill: ParsedSkill = {
      ...sampleSkill,
      name: "My Awesome Skill! (v2) @#$",
    };

    const config = translateToHand(skill);
    expect(config.hand.name).toBe("my-awesome-skill-v2");
    expect(config.hand.name).toMatch(/^[a-z0-9-]+$/);
  });

  it("handles missing category", () => {
    const skill: ParsedSkill = {
      ...sampleSkill,
      category: undefined,
    };

    const config = translateToHand(skill);
    expect(config.metadata.category).toBe("general");
  });

  it("truncates long names to 64 chars", () => {
    const skill: ParsedSkill = {
      ...sampleSkill,
      name: "a".repeat(100),
    };

    const config = translateToHand(skill);
    expect(config.hand.name.length).toBeLessThanOrEqual(64);
  });
});

describe("serializeHandToml", () => {
  it("serializes HandConfig to valid TOML", () => {
    const config = translateToHand(sampleSkill);
    const toml = serializeHandToml(config);

    expect(toml).toContain("[hand]");
    expect(toml).toContain('name = "code-reviewer"');
    expect(toml).toContain("[instructions]");
    expect(toml).toContain("[model]");
    expect(toml).toContain("[limits]");
    expect(toml).toContain("[metadata]");
  });

  it("uses multiline strings for long system_prompt", () => {
    const config = translateToHand(sampleSkill);
    const toml = serializeHandToml(config);

    // Long instructions should use triple-quoted literals
    expect(toml).toContain("'''");
  });

  it("escapes special characters in strings", () => {
    const skill: ParsedSkill = {
      ...sampleSkill,
      description: 'Has "quotes" and \\ backslashes',
    };
    const config = translateToHand(skill);
    const toml = serializeHandToml(config);

    expect(toml).toContain('\\"quotes\\"');
    expect(toml).toContain("\\\\");
  });

  it("serializes arrays correctly", () => {
    const config = translateToHand(sampleSkill);
    const toml = serializeHandToml(config);

    expect(toml).toContain('platforms = ["CLAUDE_CODE", "CURSOR"]');
  });

  it("includes numeric values without quotes", () => {
    const config = translateToHand(sampleSkill);
    const toml = serializeHandToml(config);

    expect(toml).toContain("max_tokens = 4096");
    expect(toml).toContain("temperature = 0.3");
    expect(toml).toContain("timeout_seconds = 120");
    expect(toml).toContain("max_retries = 2");
  });

  it("ends with newline", () => {
    const config = translateToHand(sampleSkill);
    const toml = serializeHandToml(config);

    expect(toml.endsWith("\n")).toBe(true);
  });
});
