import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Getting Started — skills-hub.ai",
  description: "Learn how to find, install, and publish skills for Claude Code, Cursor, and Codex CLI.",
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
        skills-hub.ai makes it easy to discover and install skills for your AI coding assistant.
        Follow this guide to get up and running in minutes.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">1. Install a skill with the CLI</h2>
        <p className="mb-3 text-[var(--muted)]">
          Clone the repository and install the CLI locally:
        </p>
        <CodeBlock>{`git clone https://github.com/tinh2/skills-hub.git
cd skills-hub
pnpm install
pnpm --filter @skills-hub/cli build`}</CodeBlock>
        <p className="mt-4 mb-3 text-[var(--muted)]">Then use the CLI to install skills:</p>
        <CodeBlock>{`# Link the CLI for local use
cd apps/cli && pnpm link --global

# Install a skill into your project
skills-hub install <skill-name>`}</CodeBlock>
        <p className="mt-3 text-sm text-[var(--muted)]">
          This downloads the skill&apos;s <InlineCode>SKILL.md</InlineCode> file to your project&apos;s
          {" "}<InlineCode>.claude/skills/</InlineCode> directory (or <InlineCode>.cursor/skills/</InlineCode> for Cursor).
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">2. Browse skills</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          Visit the <Link href="/browse" className="text-[var(--primary)] hover:underline">Browse</Link> page to search by keyword, filter by
          category or platform, and sort by popularity or quality score.
        </p>
        <p className="leading-relaxed text-[var(--muted)]">
          Each skill shows its quality score, install count, and community ratings so you can
          make informed choices.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">3. Publish your own skill</h2>
        <p className="mb-3 text-[var(--muted)]">
          Create a <InlineCode>SKILL.md</InlineCode> file with YAML frontmatter describing your skill:
        </p>
        <CodeBlock>{`---
name: My Skill
description: What this skill does
category: code-quality
platforms:
  - claude-code
version: 1.0.0
---

Your skill instructions go here. This is the content
that will be injected into the AI assistant's context.`}</CodeBlock>
        <p className="mt-3 text-[var(--muted)]">
          Then publish it through the <Link href="/publish" className="text-[var(--primary)] hover:underline">web form</Link> (sign in with GitHub first) or via the CLI:
        </p>
        <CodeBlock>{`skills-hub login
skills-hub publish`}</CodeBlock>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">4. Skill anatomy</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
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
                <td className="px-4 py-3"><InlineCode>category</InlineCode></td>
                <td className="px-4 py-3">Yes</td>
                <td className="px-4 py-3">One of the <Link href="/categories" className="text-[var(--primary)] hover:underline">available categories</Link></td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="px-4 py-3"><InlineCode>platforms</InlineCode></td>
                <td className="px-4 py-3">Yes</td>
                <td className="px-4 py-3">claude-code, cursor, codex-cli, or other</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="px-4 py-3"><InlineCode>version</InlineCode></td>
                <td className="px-4 py-3">Yes</td>
                <td className="px-4 py-3">Semver (e.g. 1.0.0)</td>
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
        <h2 className="mb-3 text-2xl font-semibold">5. Run locally</h2>
        <p className="mb-3 text-[var(--muted)]">
          Want to contribute or run the platform yourself? The full stack is open source.
        </p>
        <CodeBlock>{`git clone https://github.com/tinh2/skills-hub.git
cd skills-hub

# Start PostgreSQL + Redis
docker compose up -d

# Install dependencies and set up the database
pnpm install
cp .env.example apps/api/.env   # edit with your values
pnpm db:migrate
pnpm db:seed

# Start all apps in dev mode
pnpm dev`}</CodeBlock>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Requires Node.js 22+, pnpm 9+, and Docker. See the{" "}
          <a href="https://github.com/tinh2/skills-hub" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">
            README
          </a>{" "}
          for full setup instructions.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">6. Versioning</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          Skills use semantic versioning. When you update a skill, bump the version and optionally
          add a changelog. Users can view version history and diffs on the skill detail page.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">7. Compositions</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          Combine multiple skills into a pipeline using compositions. A composition chains
          2-20 skills together, running them in sequence or parallel.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Next steps</h2>
        <ul className="space-y-2">
          <li><Link href="/browse" className="text-[var(--primary)] hover:underline">Browse the skill catalog</Link></li>
          <li><Link href="/publish" className="text-[var(--primary)] hover:underline">Publish your first skill</Link></li>
          <li><a href="https://github.com/tinh2/skills-hub" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">View the source on GitHub</a></li>
          <li><Link href="/about" className="text-[var(--primary)] hover:underline">Learn more about the platform</Link></li>
        </ul>
      </section>
    </div>
  );
}
