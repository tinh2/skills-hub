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
        skills-hub.ai is the marketplace for Claude Code skills. We help developers discover,
        share, and install quality-scored skills for Claude Code, Cursor, and Codex CLI.
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
        <h2 className="mb-3 text-xl font-semibold">Why a marketplace?</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          As AI coding assistants become central to development workflows, the skills powering them
          should be shared, reviewed, and versioned like any other software. skills-hub.ai provides
          the infrastructure for that ecosystem.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Features</h2>
        <ul className="list-inside list-disc space-y-2 text-[var(--muted)]">
          <li>Browse and search skills by category, platform, or keyword</li>
          <li>Quality scoring to surface the best skills</li>
          <li>Semantic versioning with changelogs</li>
          <li>Community reviews and ratings</li>
          <li>One-command CLI installation</li>
          <li>Organization support for teams</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Get Started</h2>
        <p className="mb-3 leading-relaxed text-[var(--muted)]">
          <Link href="/browse" className="text-[var(--primary)] hover:underline">Browse skills</Link> to find what you need, or{" "}
          <Link href="/publish" className="text-[var(--primary)] hover:underline">publish your own</Link> to share with the community.
        </p>
        <p className="mb-3 text-[var(--muted)]">Install the CLI for the fastest experience:</p>
        <CodeBlock>npx skills-hub install &lt;skill-name&gt;</CodeBlock>
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
