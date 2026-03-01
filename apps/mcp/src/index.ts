#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { discoverSkills } from "./discover.js";

const server = new Server(
  { name: "skills-hub", version: "0.1.0" },
  { capabilities: { prompts: { listChanged: true } } },
);

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  const skills = discoverSkills();

  return {
    prompts: Array.from(skills.entries()).map(([slug, skill]) => ({
      name: slug,
      description: skill.description,
      arguments: [
        {
          name: "input",
          description: "Context or instructions for the skill",
          required: false,
        },
      ],
    })),
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const skills = discoverSkills();
  const skill = skills.get(name);

  if (!skill) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Unknown skill: ${name}. Run "skills-hub install ${name}" to install it.`,
    );
  }

  let text = skill.instructions;
  if (args?.input) {
    text += `\n\n${args.input}`;
  }

  return {
    description: skill.description,
    messages: [
      {
        role: "user" as const,
        content: { type: "text" as const, text },
      },
    ],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr only — stdout is the MCP JSON-RPC stream
  console.error("skills-hub MCP server running");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
