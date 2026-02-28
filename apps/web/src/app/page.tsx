import Link from "next/link";
import { CATEGORIES } from "@skills-hub/shared";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="py-16 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          The marketplace for{" "}
          <span className="text-[var(--primary)]">Claude Code skills</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--muted)]">
          Discover, share, and install quality-scored skills for Claude Code,
          Cursor, and Codex CLI. Built by the community, for the community.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/browse"
            className="rounded-lg bg-[var(--primary)] px-6 py-3 font-medium text-[var(--primary-foreground)]"
          >
            Browse Skills
          </Link>
          <Link
            href="/publish"
            className="rounded-lg border border-[var(--border)] px-6 py-3 font-medium"
          >
            Publish a Skill
          </Link>
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]">
          or install via CLI:{" "}
          <code className="rounded bg-[var(--accent)] px-2 py-1">
            npx skills-hub install &lt;skill-name&gt;
          </code>
        </p>
      </section>

      {/* Categories */}
      <section className="py-12">
        <h2 className="mb-6 text-2xl font-bold">Browse by Category</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/browse?category=${cat.slug}`}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 transition-shadow hover:shadow-md"
            >
              <h3 className="font-medium">{cat.name}</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {cat.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-12">
        <h2 className="mb-6 text-2xl font-bold">How it works</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
            <div className="mb-3 text-2xl font-bold text-[var(--primary)]">1</div>
            <h3 className="font-semibold">Discover</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Browse quality-scored skills by category, search by keyword, or
              filter by platform.
            </p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
            <div className="mb-3 text-2xl font-bold text-[var(--primary)]">2</div>
            <h3 className="font-semibold">Install</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              One command to install any skill. Updates and version management
              built in.
            </p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
            <div className="mb-3 text-2xl font-bold text-[var(--primary)]">3</div>
            <h3 className="font-semibold">Share</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Publish your own skills. Get ratings, reviews, and usage
              analytics.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
