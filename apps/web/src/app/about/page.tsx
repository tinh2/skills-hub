import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — skills-hub.ai",
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-[var(--accent)] p-4 text-sm leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl py-12">
      <h1 className="mb-4 text-3xl font-bold">About skills-hub.ai</h1>

      <p className="mb-8 leading-relaxed text-[var(--muted)]">
        skills-hub.ai is an open platform for AI coding skills. Discover, publish, test, and
        deploy reusable skills for Claude Code, Cursor, Codex CLI, and any MCP-compatible tool.
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">What are skills?</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          Skills are reusable instruction sets that extend AI coding assistants. They teach your
          AI assistant new capabilities — from code review workflows to deployment automation,
          testing strategies, and domain-specific patterns.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Why a platform?</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          As AI coding assistants become central to development workflows, the skills powering them
          should be shared, reviewed, tested, and versioned like any other software. skills-hub.ai
          provides the infrastructure for that ecosystem — from discovery and installation to
          sandbox testing, agent deployment, and team collaboration.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Features</h2>
        <ul className="list-inside list-disc space-y-2 text-[var(--muted)]">
          <li>Browse and search skills by category, platform, or keyword</li>
          <li>Quality scoring and trust tiers to surface the best skills</li>
          <li>Semantic versioning with changelogs and version diffs</li>
          <li>Community reviews, ratings, and content moderation</li>
          <li>Skill compositions — chain skills into sequential or parallel pipelines</li>
          <li>Sandbox testing with defined test cases</li>
          <li>Agent deployment with scheduled, webhook, or manual triggers</li>
          <li>AI-powered skill generation from natural language descriptions</li>
          <li>One-command CLI installation across platforms</li>
          <li>MCP server for cross-platform skill distribution</li>
          <li>Organization workspaces with GitHub sync, roles, and analytics</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Get Started</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          <Link href="/browse" className="text-[var(--primary)] hover:underline">Browse skills</Link> to find what you need, or{" "}
          <Link href="/publish" className="text-[var(--primary)] hover:underline">publish your own</Link> to share with the community.
        </p>
        <p className="mb-3 text-[var(--muted)]">Install the CLI for the fastest experience:</p>
        <CodeBlock>npx @skills-hub-ai/cli install &lt;skill-name&gt;</CodeBlock>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Built by Developers</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          skills-hub.ai is built by developers, for developers. We&apos;re focused on creating the
          best possible experience for discovering and sharing AI coding skills.
        </p>
      </section>
    </div>
  );
}
