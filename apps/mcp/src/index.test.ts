import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ParsedSkill } from "@skills-hub-ai/skill-parser";

vi.mock("./discover.js", () => ({
  discoverSkills: vi.fn(),
}));

// Mock the MCP SDK — we test the handler logic, not the transport
vi.mock("@modelcontextprotocol/sdk/server/index.js", () => {
  const handlers = new Map<string, (req: unknown) => Promise<unknown>>();
  return {
    Server: vi.fn().mockImplementation(() => ({
      setRequestHandler: vi.fn((schema: { method: string }, handler: (req: unknown) => Promise<unknown>) => {
        handlers.set(schema.method, handler);
      }),
      connect: vi.fn(),
      _handlers: handlers,
    })),
  };
});

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/types.js", () => ({
  ListPromptsRequestSchema: { method: "prompts/list" },
  GetPromptRequestSchema: { method: "prompts/get" },
  ErrorCode: { InvalidRequest: -32600 },
  McpError: class McpError extends Error {
    code: number;
    constructor(code: number, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

import { discoverSkills } from "./discover.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

const mockDiscoverSkills = vi.mocked(discoverSkills);

function makeSkill(name: string, description: string, instructions: string): ParsedSkill {
  return {
    name,
    description,
    version: "1.0.0",
    category: undefined,
    platforms: [],
    instructions,
    raw: "",
  };
}

let handlers: Map<string, (req: unknown) => Promise<unknown>>;

beforeEach(async () => {
  vi.clearAllMocks();

  // Re-import to trigger module-level server creation
  vi.resetModules();

  // Re-mock after resetModules
  vi.doMock("./discover.js", () => ({
    discoverSkills: mockDiscoverSkills,
  }));

  vi.doMock("@modelcontextprotocol/sdk/server/index.js", () => {
    const h = new Map<string, (req: unknown) => Promise<unknown>>();
    handlers = h;
    return {
      Server: vi.fn().mockImplementation(() => ({
        setRequestHandler: vi.fn((schema: { method: string }, handler: (req: unknown) => Promise<unknown>) => {
          h.set(schema.method, handler);
        }),
        connect: vi.fn(),
      })),
    };
  });

  vi.doMock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
    StdioServerTransport: vi.fn(),
  }));

  vi.doMock("@modelcontextprotocol/sdk/types.js", () => ({
    ListPromptsRequestSchema: { method: "prompts/list" },
    GetPromptRequestSchema: { method: "prompts/get" },
    ErrorCode: { InvalidRequest: -32600 },
    McpError: class McpError extends Error {
      code: number;
      constructor(code: number, message: string) {
        super(message);
        this.code = code;
      }
    },
  }));

  // Suppress console.error from main()
  vi.spyOn(console, "error").mockImplementation(() => {});

  await import("./index.js");
});

describe("MCP server", () => {
  it("registers prompts/list and prompts/get handlers", () => {
    expect(handlers.has("prompts/list")).toBe(true);
    expect(handlers.has("prompts/get")).toBe(true);
  });

  it("listPrompts returns discovered skills", async () => {
    const skills = new Map<string, ParsedSkill>();
    skills.set("code-review", makeSkill("Code Review", "Review code quality", "Review carefully"));
    skills.set("security-scan", makeSkill("Security Scan", "Find vulnerabilities", "Check OWASP"));
    mockDiscoverSkills.mockReturnValue(skills);

    const handler = handlers.get("prompts/list")!;
    const result = (await handler({})) as { prompts: Array<{ name: string; description: string }> };

    expect(result.prompts).toHaveLength(2);
    expect(result.prompts[0].name).toBe("code-review");
    expect(result.prompts[0].description).toBe("Review code quality");
    expect(result.prompts[1].name).toBe("security-scan");
  });

  it("listPrompts returns empty array when no skills installed", async () => {
    mockDiscoverSkills.mockReturnValue(new Map());

    const handler = handlers.get("prompts/list")!;
    const result = (await handler({})) as { prompts: unknown[] };

    expect(result.prompts).toEqual([]);
  });

  it("getPrompt returns skill instructions", async () => {
    const skills = new Map<string, ParsedSkill>();
    skills.set("code-review", makeSkill("Code Review", "Review code quality", "Review carefully"));
    mockDiscoverSkills.mockReturnValue(skills);

    const handler = handlers.get("prompts/get")!;
    const result = (await handler({
      params: { name: "code-review", arguments: {} },
    })) as { description: string; messages: Array<{ role: string; content: { type: string; text: string } }> };

    expect(result.description).toBe("Review code quality");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe("user");
    expect(result.messages[0].content.text).toBe("Review carefully");
  });

  it("getPrompt appends input argument to instructions", async () => {
    const skills = new Map<string, ParsedSkill>();
    skills.set("code-review", makeSkill("Code Review", "Review code quality", "Review carefully"));
    mockDiscoverSkills.mockReturnValue(skills);

    const handler = handlers.get("prompts/get")!;
    const result = (await handler({
      params: { name: "code-review", arguments: { input: "Focus on error handling" } },
    })) as { messages: Array<{ content: { text: string } }> };

    expect(result.messages[0].content.text).toBe("Review carefully\n\nFocus on error handling");
  });

  it("getPrompt throws McpError for unknown skill", async () => {
    mockDiscoverSkills.mockReturnValue(new Map());

    const handler = handlers.get("prompts/get")!;

    await expect(
      handler({ params: { name: "nonexistent", arguments: {} } }),
    ).rejects.toThrow('Unknown skill: nonexistent');
  });
});
