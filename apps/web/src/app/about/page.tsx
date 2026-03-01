import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — skills-hub.ai",
};

export default function AboutPage() {
  return (
    <div className="prose mx-auto max-w-3xl dark:prose-invert">
      <h1>About skills-hub.ai</h1>

      <p>
        skills-hub.ai is the marketplace for Claude Code skills. We help developers discover,
        share, and install quality-scored skills for Claude Code, Cursor, and Codex CLI.
      </p>

      <h2>What are skills?</h2>
      <p>
        Skills are reusable instruction sets that extend AI coding assistants. They teach your
        AI assistant new capabilities — from code review workflows to deployment automation,
        testing strategies, and domain-specific patterns.
      </p>

      <h2>Why a marketplace?</h2>
      <p>
        As AI coding assistants become central to development workflows, the skills powering them
        should be shared, reviewed, and versioned like any other software. skills-hub.ai provides
        the infrastructure for that ecosystem.
      </p>

      <h2>Features</h2>
      <ul>
        <li>Browse and search skills by category, platform, or keyword</li>
        <li>Quality scoring to surface the best skills</li>
        <li>Semantic versioning with changelogs</li>
        <li>Community reviews and ratings</li>
        <li>One-command CLI installation</li>
        <li>Organization support for teams</li>
      </ul>

      <h2>Get Started</h2>
      <p>
        <Link href="/browse">Browse skills</Link> to find what you need, or{" "}
        <Link href="/publish">publish your own</Link> to share with the community.
      </p>
      <p>
        Install the CLI for the fastest experience:
      </p>
      <pre><code>npx skills-hub install &lt;skill-name&gt;</code></pre>

      <h2>Open Source</h2>
      <p>
        skills-hub.ai is built in the open.{" "}
        <a href="https://github.com/tinh2/skills-hub" target="_blank" rel="noopener noreferrer">
          View the source on GitHub
        </a>.
      </p>
    </div>
  );
}
