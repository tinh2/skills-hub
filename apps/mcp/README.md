# @skills-hub-ai/mcp

MCP server for [skills-hub.ai](https://skills-hub.ai) — serve your installed skills as prompts in Claude Code, Cursor, or any MCP-compatible tool.

## Setup

### Claude Code

```bash
claude mcp add skills-hub -- npx @skills-hub-ai/mcp
```

### Cursor

Add to your Cursor MCP settings (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "skills-hub": {
      "command": "npx",
      "args": ["@skills-hub-ai/mcp"]
    }
  }
}
```

### Manual (any MCP client)

```json
{
  "command": "npx",
  "args": ["@skills-hub-ai/mcp"]
}
```

## How It Works

The server scans these directories for installed skills:

| Tool | Directory |
|------|-----------|
| Claude Code | `~/.claude/skills/` |
| Cursor | `~/.cursor/skills/` |

Each skill directory should contain a `SKILL.md` file (installed via `skills-hub install <slug>`).

Skills are exposed as **MCP prompts** — your AI tool can list and invoke them. The server caches discovered skills for 30 seconds.

## Installing Skills

Use the [CLI](https://www.npmjs.com/package/@skills-hub-ai/cli) to install skills:

```bash
npx @skills-hub-ai/cli search "code review"
npx @skills-hub-ai/cli install <skill-name>
```

## Links

- [Browse skills](https://skills-hub.ai/browse)
- [CLI](https://www.npmjs.com/package/@skills-hub-ai/cli)
- [Getting Started](https://skills-hub.ai/docs/getting-started)
- [GitHub](https://github.com/tinh2/skills-hub)
