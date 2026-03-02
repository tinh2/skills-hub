import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Getting Started — skills-hub.ai",
  description: "Install your first AI coding skill in 30 seconds. Works with Claude Code, Cursor, and any MCP-compatible AI tool.",
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

export default function GettingStartedPage() {
  return (
    <div className="mx-auto max-w-3xl py-12">
      <h1 className="mb-4 text-3xl font-bold">Getting Started</h1>

      <p className="mb-8 leading-relaxed text-[var(--muted)]">
        skills-hub.ai is a marketplace for AI coding skills — reusable instruction sets you
        can install into Claude Code, Cursor, or any MCP-compatible AI tool. Get up and running
        in under a minute.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">1. Install your first skill</h2>
        <p className="mb-3 text-[var(--muted)]">
          No setup needed — just run this in your terminal:
        </p>
        <CodeBlock>npx skills-hub install code-review</CodeBlock>
        <p className="mt-3 text-sm text-[var(--muted)]">
          This downloads the skill&apos;s <InlineCode>SKILL.md</InlineCode> file
          to <InlineCode>~/.claude/skills/code-review/</InlineCode> (or <InlineCode>~/.cursor/skills/</InlineCode> for
          Cursor with <InlineCode>--target cursor</InlineCode>).
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">2. Use it</h2>
        <p className="mb-3 text-[var(--muted)]">
          In Claude Code or Cursor, type <InlineCode>/code-review</InlineCode> and the skill
          loads into your AI assistant&apos;s context. That&apos;s it — the tool discovers installed
          skills automatically.
        </p>
        <p className="text-[var(--muted)]">
          If a skill is a <strong>composition</strong> (a pipeline of multiple skills), all
          dependencies are installed automatically. For example, installing a &quot;full story
          lifecycle&quot; skill that chains <InlineCode>/arch-review</InlineCode> then <InlineCode>/story-implementer</InlineCode> then <InlineCode>/pr</InlineCode> will
          install all three child skills alongside the parent.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">3. Use skills in any AI tool</h2>
        <p className="mb-3 text-[var(--muted)]">
          Skills aren&apos;t limited to Claude Code and Cursor. The skills-hub MCP server exposes your
          installed skills as prompts in any{" "}
          <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">
            MCP-compatible
          </a>{" "}
          AI tool — including Windsurf, Copilot, and others.
        </p>

        <h3 className="mb-2 mt-4 text-lg font-semibold">Claude Code</h3>
        <CodeBlock>claude mcp add skills-hub -- npx @skills-hub-ai/mcp</CodeBlock>

        <h3 className="mb-2 mt-4 text-lg font-semibold">Cursor</h3>
        <p className="mb-2 text-sm text-[var(--muted)]">
          Add to <InlineCode>.cursor/mcp.json</InlineCode>:
        </p>
        <CodeBlock>{`{
  "mcpServers": {
    "skills-hub": {
      "command": "npx",
      "args": ["@skills-hub-ai/mcp"]
    }
  }
}`}</CodeBlock>

        <h3 className="mb-2 mt-4 text-lg font-semibold">Any other MCP client</h3>
        <p className="text-sm text-[var(--muted)]">
          Point your tool at <InlineCode>npx @skills-hub-ai/mcp</InlineCode> as a stdio MCP server.
          The server scans both <InlineCode>~/.claude/skills/</InlineCode> and <InlineCode>~/.cursor/skills/</InlineCode> and
          serves each installed skill as an MCP prompt.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">4. Browse and search</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Visit the <Link href="/browse" className="text-[var(--primary)] hover:underline">Browse</Link> page to search by keyword, filter by
          category or platform, and sort by popularity or quality score.
          Each skill shows its automated quality score, install count, and community ratings.
        </p>
        <p className="text-[var(--muted)]">Or search from your terminal:</p>
        <CodeBlock>{`npx skills-hub search "code review"
npx skills-hub search --category review --sort highest_rated`}</CodeBlock>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">5. Publish your own skill</h2>
        <p className="mb-3 text-[var(--muted)]">
          Create a <InlineCode>SKILL.md</InlineCode> file with YAML frontmatter:
        </p>
        <CodeBlock>{`---
name: My Skill
description: What this skill does in one sentence
version: 1.0.0
category: code-quality
platforms:
  - CLAUDE_CODE
---

Your skill instructions go here. This is the content
that will be injected into the AI assistant's context.`}</CodeBlock>

        <p className="mt-3 mb-3 text-[var(--muted)]">Then publish via the CLI or web:</p>
        <CodeBlock>{`npx skills-hub login          # sign in with GitHub
npx skills-hub publish        # publishes ./SKILL.md`}</CodeBlock>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Or use the <Link href="/publish" className="text-[var(--primary)] hover:underline">web publish page</Link> — you
          can describe what you want and AI generates the name, description, category, tags, and
          instructions for you.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--accent)]">
                <th className="px-4 py-3 text-left font-semibold">Field</th>
                <th className="px-4 py-3 text-left font-semibold">Required</th>
                <th className="px-4 py-3 text-left font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--border)]">
                <td className="px-4 py-3"><InlineCode>name</InlineCode></td>
                <td className="px-4 py-3">Yes</td>
                <td className="px-4 py-3">Display name (1-100 chars)</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="px-4 py-3"><InlineCode>description</InlineCode></td>
                <td className="px-4 py-3">Yes</td>
                <td className="px-4 py-3">Short summary (10-1000 chars)</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="px-4 py-3"><InlineCode>version</InlineCode></td>
                <td className="px-4 py-3">Yes</td>
                <td className="px-4 py-3">Semver (e.g. 1.0.0)</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="px-4 py-3"><InlineCode>category</InlineCode></td>
                <td className="px-4 py-3">Yes</td>
                <td className="px-4 py-3">One of the <Link href="/categories" className="text-[var(--primary)] hover:underline">available categories</Link></td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="px-4 py-3"><InlineCode>platforms</InlineCode></td>
                <td className="px-4 py-3">Yes</td>
                <td className="px-4 py-3">CLAUDE_CODE, CURSOR, CODEX_CLI, or OTHER</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><InlineCode>tags</InlineCode></td>
                <td className="px-4 py-3">No</td>
                <td className="px-4 py-3">Up to 10 searchable tags</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">6. Guided setup</h2>
        <p className="mb-3 text-[var(--muted)]">
          Run <InlineCode>init</InlineCode> for a guided walkthrough that checks your platform,
          auth status, installed skills, and suggests popular skills:
        </p>
        <CodeBlock>npx skills-hub init</CodeBlock>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Next steps</h2>
        <ul className="space-y-2">
          <li><Link href="/browse" className="text-[var(--primary)] hover:underline">Browse the skill catalog</Link></li>
          <li><Link href="/docs/cli" className="text-[var(--primary)] hover:underline">CLI reference</Link></li>
          <li><Link href="/publish" className="text-[var(--primary)] hover:underline">Publish your first skill</Link></li>
          <li><a href="https://github.com/tinh2/skills-hub" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">View the source on GitHub</a></li>
        </ul>
      </section>
    </div>
  );
}
