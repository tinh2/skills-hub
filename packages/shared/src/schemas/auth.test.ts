import { describe, it, expect } from "vitest";
import { githubCallbackSchema } from "./auth.js";

describe("githubCallbackSchema", () => {
  it("accepts valid input", () => {
    const result = githubCallbackSchema.parse({
      code: "abc123",
      state: "random-state-value",
    });
    expect(result.code).toBe("abc123");
    expect(result.state).toBe("random-state-value");
  });

  it("rejects missing code", () => {
    expect(() =>
      githubCallbackSchema.parse({ state: "abc" }),
    ).toThrow();
  });

  it("rejects empty code", () => {
    expect(() =>
      githubCallbackSchema.parse({ code: "", state: "abc" }),
    ).toThrow();
  });

  it("requires state parameter", () => {
    expect(() =>
      githubCallbackSchema.parse({ code: "abc123" }),
    ).toThrow();
  });

  it("rejects empty state", () => {
    expect(() =>
      githubCallbackSchema.parse({ code: "abc123", state: "" }),
    ).toThrow();
  });
});
