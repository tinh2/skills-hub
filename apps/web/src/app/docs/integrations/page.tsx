import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tool Integrations — skills-hub.ai",
  description: "Set up skills-hub with Windsurf, GitHub Copilot, Cline, Claude Code, Cursor, and any MCP-compatible AI tool.",
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-[var(--accent)] p-4 text-sm leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-[var(--accent)] px-1.5 py-0.5 text-sm">{children}</code>;
}

function ToolSection({
  name,
  icon,
  children,
}: {
  name: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
      <h2 className="mb-4 flex items-center gap-3 text-2xl font-semibold">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)] text-lg">
          {icon}
        </span>
        {name}
      </h2>
      {children}
    </section>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-3xl py-12">
      <h1 className="mb-4 text-3xl font-bold">Tool Integrations</h1>

      <p className="mb-8 leading-relaxed text-[var(--muted)]">
        skills-hub skills work with any AI coding tool that supports the{" "}
        <a
          href="https://modelcontextprotocol.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--primary)] hover:underline"
        >
          Model Context Protocol (MCP)
        </a>
        . Install skills once, use them everywhere.
      </p>

      <div className="mb-8 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
        <p className="text-sm">
          <strong>How it works:</strong> The <InlineCode>@skills-hub-ai/mcp</InlineCode> server
          scans your installed skills and exposes them as MCP prompts. Each tool below connects
          to this server differently, but once configured, all your installed skills appear
          automatically.
        </p>
      </div>

      <ToolSection name="Claude Code" icon="C">
        <p className="mb-3 text-[var(--muted)]">
          Claude Code has native MCP support. Skills installed
          via <InlineCode>npx skills-hub install</InlineCode> are automatically discovered
          from <InlineCode>~/.claude/skills/</InlineCode>.
        </p>

        <h3 className="mb-2 mt-4 text-lg font-semibold">Option A: Direct install (no MCP needed)</h3>
        <CodeBlock>{`npx skills-hub install code-review
# Now type /code-review in Claude Code`}</CodeBlock>

        <h3 className="mb-2 mt-4 text-lg font-semibold">Option B: MCP server (all skills as prompts)</h3>
        <CodeBlock>claude mcp add skills-hub -- npx @skills-hub-ai/mcp</CodeBlock>
        <p className="mt-2 text-sm text-[var(--muted)]">
          This registers the MCP server globally. All installed skills appear as prompts
          across all projects.
        </p>
      </ToolSection>

      <ToolSection name="Cursor" icon="Cu">
        <p className="mb-3 text-[var(--muted)]">
          Cursor supports MCP servers via configuration files. Add the skills-hub
          server to use your installed skills as prompts.
        </p>

        <h3 className="mb-2 mt-4 text-lg font-semibold">Step 1: Install skills</h3>
        <CodeBlock>{`npx skills-hub install code-review --target cursor
# Installs to ~/.cursor/skills/code-review/`}</CodeBlock>

        <h3 className="mb-2 mt-4 text-lg font-semibold">Step 2: Configure MCP server</h3>
        <p className="mb-2 text-sm text-[var(--muted)]">
          Add to <InlineCode>.cursor/mcp.json</InlineCode> in your project root (or globally
          at <InlineCode>~/.cursor/mcp.json</InlineCode>):
        </p>
        <CodeBlock>{`{
  "mcpServers": {
    "skills-hub": {
      "command": "npx",
      "args": ["@skills-hub-ai/mcp"]
    }
  }
}`}</CodeBlock>

        <h3 className="mb-2 mt-4 text-lg font-semibold">Step 3: Use skills</h3>
        <p className="text-sm text-[var(--muted)]">
          Open Cursor, and your installed skills will be available as prompts. The MCP
          server reads from both <InlineCode>~/.claude/skills/</InlineCode> and <InlineCode>~/.cursor/skills/</InlineCode>.
        </p>
      </ToolSection>

      <ToolSection name="Windsurf" icon="W">
        <p className="mb-3 text-[var(--muted)]">
          Windsurf (by Codeium) supports MCP servers for extending Cascade with custom tools
          and prompts. Configure the skills-hub MCP server to bring your skills into Windsurf.
        </p>

        <h3 className="mb-2 mt-4 text-lg font-semibold">Step 1: Install skills</h3>
        <CodeBlock>npx skills-hub install code-review</CodeBlock>

        <h3 className="mb-2 mt-4 text-lg font-semibold">Step 2: Configure MCP server</h3>
        <p className="mb-2 text-sm text-[var(--muted)]">
          Open Windsurf Settings, navigate to <strong>Cascade &gt; MCP Servers</strong>, and
          add a new server. Or add to <InlineCode>~/.codeium/windsurf/mcp_config.json</InlineCode>:
        </p>
        <CodeBlock>{`{
  "mcpServers": {
    "skills-hub": {
      "command": "npx",
      "args": ["@skills-hub-ai/mcp"]
    }
  }
}`}</CodeBlock>

        <h3 className="mb-2 mt-4 text-lg font-semibold">Step 3: Restart and use</h3>
        <p className="text-sm text-[var(--muted)]">
          Restart Windsurf or reload the MCP configuration. Your installed skills will
          appear as available prompts in Cascade conversations.
        </p>
      </ToolSection>

      <ToolSection name="GitHub Copilot" icon="GH">
        <p className="mb-3 text-[var(--muted)]">
          GitHub Copilot supports MCP servers in VS Code through the Copilot Chat agent mode.
          This lets you use skills-hub skills directly in Copilot conversations.
        </p>

        <h3 className="mb-2 mt-4 text-lg font-semibold">Step 1: Install skills</h3>
        <CodeBlock>npx skills-hub install code-review</CodeBlock>

        <h3 className="mb-2 mt-4 text-lg font-semibold">Step 2: Configure MCP server</h3>
        <p className="mb-2 text-sm text-[var(--muted)]">
          Add to your VS Code <InlineCode>settings.json</InlineCode> (or workspace <InlineCode>.vscode/settings.json</InlineCode>):
        </p>
        <CodeBlock>{`{
  "github.copilot.chat.mcp.servers": {
    "skills-hub": {
      "command": "npx",
      "args": ["@skills-hub-ai/mcp"]
    }
  }
}`}</CodeBlock>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Alternatively, add to <InlineCode>.vscode/mcp.json</InlineCode> in your project:
        </p>
        <CodeBlock>{`{
  "servers": {
    "skills-hub": {
      "command": "npx",
      "args": ["@skills-hub-ai/mcp"]
    }
  }
}`}</CodeBlock>

        <h3 className="mb-2 mt-4 text-lg font-semibold">Step 3: Enable agent mode</h3>
        <p className="text-sm text-[var(--muted)]">
          In VS Code, open Copilot Chat and switch to <strong>Agent mode</strong> (click the
          mode selector at the top of the chat panel). Your skills will be available
          as MCP prompts.
        </p>
      </ToolSection>

      <ToolSection name="Cline" icon="Cl">
        <p className="mb-3 text-[var(--muted)]">
          Cline (formerly Claude Dev) is a VS Code extension with built-in MCP support.
          Configure the skills-hub server to use your skills in Cline conversations.
        </p>

        <h3 className="mb-2 mt-4 text-lg font-semibold">Step 1: Install skills</h3>
        <CodeBlock>npx skills-hub install code-review</CodeBlock>

        <h3 className="mb-2 mt-4 text-lg font-semibold">Step 2: Configure MCP server</h3>
        <p className="mb-2 text-sm text-[var(--muted)]">
          Open Cline settings in VS Code (click the gear icon in the Cline sidebar). Navigate
          to <strong>MCP Servers</strong> and add a new server:
        </p>
        <CodeBlock>{`{
  "mcpServers": {
    "skills-hub": {
      "command": "npx",
      "args": ["@skills-hub-ai/mcp"]
    }
  }
}`}</CodeBlock>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Or add the server via
          Cline&apos;s <strong>MCP Servers</strong> panel &gt; <strong>Add Server</strong> button, selecting
          &quot;stdio&quot; as the transport type.
        </p>

        <h3 className="mb-2 mt-4 text-lg font-semibold">Step 3: Use skills</h3>
        <p className="text-sm text-[var(--muted)]">
          Once configured, Cline will discover your installed skills as MCP prompts.
          Reference them in your conversations with Cline to invoke skill instructions.
        </p>
      </ToolSection>

      <ToolSection name="Any MCP-Compatible Tool" icon="*">
        <p className="mb-3 text-[var(--muted)]">
          Any tool that supports the Model Context Protocol can use skills-hub skills.
          The server uses stdio transport by default.
        </p>

        <h3 className="mb-2 mt-4 text-lg font-semibold">Generic setup</h3>
        <CodeBlock>{`# Server command:
npx @skills-hub-ai/mcp

# Transport: stdio
# The server scans:
#   ~/.claude/skills/
#   ~/.cursor/skills/
# and serves each SKILL.md as an MCP prompt.`}</CodeBlock>

        <p className="mt-3 text-sm text-[var(--muted)]">
          Consult your tool&apos;s documentation for how to add an MCP server. Most tools
          accept a <InlineCode>command</InlineCode> + <InlineCode>args</InlineCode> configuration
          pointing to the server executable.
        </p>
      </ToolSection>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Next steps</h2>
        <ul className="space-y-2">
          <li><Link href="/browse" className="text-[var(--primary)] hover:underline">Browse the skill catalog</Link></li>
          <li><Link href="/docs/getting-started" className="text-[var(--primary)] hover:underline">Getting started guide</Link></li>
          <li><Link href="/docs/cli" className="text-[var(--primary)] hover:underline">CLI reference</Link></li>
          <li><Link href="/publish" className="text-[var(--primary)] hover:underline">Publish your own skill</Link></li>
        </ul>
      </section>
    </div>
  );
}
