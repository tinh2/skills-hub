import { describe, it, expect } from "vitest";
import { runSandboxSchema, createTestCaseSchema, updateTestCaseSchema } from "./sandbox.js";

describe("runSandboxSchema", () => {
  it("accepts valid input", () => {
    const result = runSandboxSchema.safeParse({ input: "Review this code" });
    expect(result.success).toBe(true);
    expect(result.data?.input).toBe("Review this code");
  });

  it("accepts input with testCaseId", () => {
    const result = runSandboxSchema.safeParse({
      input: "test input",
      testCaseId: "clid123",
    });
    expect(result.success).toBe(true);
    expect(result.data?.testCaseId).toBe("clid123");
  });

  it("rejects empty input", () => {
    const result = runSandboxSchema.safeParse({ input: "" });
    expect(result.success).toBe(false);
  });

  it("rejects input over 10,000 chars", () => {
    const result = runSandboxSchema.safeParse({ input: "x".repeat(10_001) });
    expect(result.success).toBe(false);
  });

  it("rejects missing input", () => {
    const result = runSandboxSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("createTestCaseSchema", () => {
  it("accepts valid test case", () => {
    const result = createTestCaseSchema.safeParse({
      label: "Basic input",
      input: "Hello world",
    });
    expect(result.success).toBe(true);
    expect(result.data?.sortOrder).toBe(0);
  });

  it("accepts full test case with expected output", () => {
    const result = createTestCaseSchema.safeParse({
      label: "Expected output test",
      input: "2 + 2",
      expectedOutput: "4",
      sortOrder: 1,
    });
    expect(result.success).toBe(true);
    expect(result.data?.expectedOutput).toBe("4");
  });

  it("rejects empty label", () => {
    const result = createTestCaseSchema.safeParse({
      label: "",
      input: "test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects label over 200 chars", () => {
    const result = createTestCaseSchema.safeParse({
      label: "x".repeat(201),
      input: "test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty input", () => {
    const result = createTestCaseSchema.safeParse({
      label: "Test",
      input: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateTestCaseSchema", () => {
  it("accepts partial updates", () => {
    const result = updateTestCaseSchema.safeParse({ label: "Updated label" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no changes)", () => {
    const result = updateTestCaseSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts null expectedOutput (clear it)", () => {
    const result = updateTestCaseSchema.safeParse({ expectedOutput: null });
    expect(result.success).toBe(true);
  });
});
