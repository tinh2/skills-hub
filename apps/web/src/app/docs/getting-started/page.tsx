import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Getting Started — skills-hub.ai",
  description: "Learn how to find, install, and publish skills for Claude Code, Cursor, and Codex CLI.",
};

export default function GettingStartedPage() {
  return (
    <div className="prose mx-auto max-w-3xl dark:prose-invert">
      <h1>Getting Started</h1>

      <p>
        skills-hub.ai makes it easy to discover and install skills for your AI coding assistant.
        Follow this guide to get up and running in minutes.
      </p>

      <h2>1. Install a skill with the CLI</h2>
      <p>
        The fastest way to install a skill is with the CLI. No account required.
      </p>
      <pre><code>npx skills-hub install &lt;skill-name&gt;</code></pre>
      <p>
        This downloads the skill&apos;s <code>SKILL.md</code> file to your project&apos;s
        {" "}<code>.claude/skills/</code> directory (or equivalent for your platform).
      </p>

      <h2>2. Browse skills</h2>
      <p>
        Visit the <Link href="/browse">Browse</Link> page to search by keyword, filter by
        category or platform, and sort by popularity or quality score.
      </p>
      <p>
        Each skill shows its quality score, install count, and community ratings so you can
        make informed choices.
      </p>

      <h2>3. Publish your own skill</h2>
      <p>
        Create a <code>SKILL.md</code> file with YAML frontmatter describing your skill:
      </p>
      <pre><code>{`---
name: My Skill
description: What this skill does
category: code-quality
platforms:
  - claude-code
version: 1.0.0
---

Your skill instructions go here. This is the content
that will be injected into the AI assistant's context.`}</code></pre>
      <p>
        Then publish it through the <Link href="/publish">web form</Link> (you can upload
        your SKILL.md directly) or via the CLI:
      </p>
      <pre><code>npx skills-hub publish</code></pre>

      <h2>4. Skill anatomy</h2>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Required</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>name</code></td>
            <td>Yes</td>
            <td>Display name (1-100 chars)</td>
          </tr>
          <tr>
            <td><code>description</code></td>
            <td>Yes</td>
            <td>Short summary (10-1000 chars)</td>
          </tr>
          <tr>
            <td><code>category</code></td>
            <td>Yes</td>
            <td>One of the <Link href="/categories">available categories</Link></td>
          </tr>
          <tr>
            <td><code>platforms</code></td>
            <td>Yes</td>
            <td>claude-code, cursor, codex-cli, or windsurf</td>
          </tr>
          <tr>
            <td><code>version</code></td>
            <td>Yes</td>
            <td>Semver (e.g. 1.0.0)</td>
          </tr>
          <tr>
            <td><code>tags</code></td>
            <td>No</td>
            <td>Up to 10 searchable tags</td>
          </tr>
        </tbody>
      </table>

      <h2>5. Versioning</h2>
      <p>
        Skills use semantic versioning. When you update a skill, bump the version and optionally
        add a changelog. Users can view version history and diffs on the skill detail page.
      </p>

      <h2>6. Compositions</h2>
      <p>
        Combine multiple skills into a pipeline using compositions. A composition chains
        2-20 skills together, running them in sequence or parallel.
      </p>

      <h2>Next steps</h2>
      <ul>
        <li><Link href="/browse">Browse the skill catalog</Link></li>
        <li><Link href="/publish">Publish your first skill</Link></li>
        <li><Link href="/about">Learn more about the platform</Link></li>
      </ul>
    </div>
  );
}
