import { describe, it, expect } from "vitest";
import { createAgentSchema, updateAgentSchema, agentQuerySchema, executeAgentSchema } from "./agent.js";

describe("createAgentSchema", () => {
  it("accepts minimal valid input", () => {
    const result = createAgentSchema.safeParse({
      name: "My Agent",
      skillSlug: "code-reviewer",
    });
    expect(result.success).toBe(true);
    expect(result.data?.triggerType).toBe("MANUAL");
    expect(result.data?.modelProvider).toBe("anthropic");
    expect(result.data?.modelId).toBe("claude-sonnet-4-5-20250514");
  });

  it("accepts full input with all fields", () => {
    const result = createAgentSchema.safeParse({
      name: "PR Reviewer Bot",
      skillSlug: "code-reviewer",
      triggerType: "WEBHOOK",
      triggerConfig: { url: "https://example.com/hook" },
      channelType: "discord",
      channelConfig: { channelId: "123" },
      modelProvider: "openai",
      modelId: "gpt-4",
    });
    expect(result.success).toBe(true);
    expect(result.data?.triggerType).toBe("WEBHOOK");
  });

  it("rejects empty name", () => {
    const result = createAgentSchema.safeParse({
      name: "",
      skillSlug: "test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name over 100 chars", () => {
    const result = createAgentSchema.safeParse({
      name: "x".repeat(101),
      skillSlug: "test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing skillSlug", () => {
    const result = createAgentSchema.safeParse({
      name: "My Agent",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid triggerType", () => {
    const result = createAgentSchema.safeParse({
      name: "My Agent",
      skillSlug: "test",
      triggerType: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid trigger types", () => {
    for (const trigger of ["MANUAL", "SCHEDULE", "WEBHOOK", "CHANNEL"]) {
      const result = createAgentSchema.safeParse({
        name: "Agent",
        skillSlug: "test",
        triggerType: trigger,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("updateAgentSchema", () => {
  it("accepts empty update (no changes)", () => {
    const result = updateAgentSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update", () => {
    const result = updateAgentSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts null channelType (clear it)", () => {
    const result = updateAgentSchema.safeParse({ channelType: null });
    expect(result.success).toBe(true);
  });
});

describe("agentQuerySchema", () => {
  it("accepts empty query (defaults)", () => {
    const result = agentQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.limit).toBe(20);
  });

  it("accepts status filter", () => {
    const result = agentQuerySchema.safeParse({ status: "RUNNING" });
    expect(result.success).toBe(true);
  });

  it("accepts all valid statuses", () => {
    for (const status of ["RUNNING", "PAUSED", "STOPPED", "ERROR"]) {
      const result = agentQuerySchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("coerces string limit to number", () => {
    const result = agentQuerySchema.safeParse({ limit: "50" });
    expect(result.success).toBe(true);
    expect(result.data?.limit).toBe(50);
  });

  it("clamps limit to range 1-100", () => {
    expect(agentQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
    expect(agentQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });
});

describe("executeAgentSchema", () => {
  it("accepts empty body (no input)", () => {
    const result = executeAgentSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts input text", () => {
    const result = executeAgentSchema.safeParse({ input: "Run the task" });
    expect(result.success).toBe(true);
  });

  it("rejects input over 10,000 chars", () => {
    const result = executeAgentSchema.safeParse({ input: "x".repeat(10_001) });
    expect(result.success).toBe(false);
  });
});
