import Link from "next/link";
import { CATEGORIES } from "@skills-hub/shared";

const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type SkillSummaryData = {
  slug: string;
  name: string;
  description: string;
  installCount: number;
  avgRating: number | null;
  qualityScore: number | null;
  latestVersion: string;
  author: { username: string };
  category: { name: string };
  tags: string[];
};

async function fetchSkills(params: string): Promise<SkillSummaryData[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/skills?${params}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

function SkillCardSimple({ skill }: { skill: SkillSummaryData }) {
  return (
    <Link
      href={`/skills/${skill.slug}`}
      className="block rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5 transition-shadow hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{skill.name}</h3>
          <p className="text-xs text-[var(--muted)]">by {skill.author.username}</p>
        </div>
        {skill.qualityScore !== null && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              skill.qualityScore >= 70
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : skill.qualityScore >= 40
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            }`}
            aria-label={`Quality score: ${skill.qualityScore} out of 100`}
          >
            {skill.qualityScore}
          </span>
        )}
      </div>
      <p className="mb-3 line-clamp-2 text-sm text-[var(--muted)]">{skill.description}</p>
      <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
        <span className="rounded bg-[var(--accent)] px-2 py-0.5">{skill.category.name}</span>
        <span>v{skill.latestVersion}</span>
        <span>{skill.installCount.toLocaleString()} installs</span>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const [trending, recent] = await Promise.all([
    fetchSkills("sort=most_installed&limit=6"),
    fetchSkills("sort=newest&limit=6"),
  ]);

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
            className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--primary)] px-6 py-3 font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90"
          >
            Browse Skills
          </Link>
          <Link
            href="/publish"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--border)] px-6 py-3 font-medium transition-colors hover:bg-[var(--accent)]"
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

      {/* Trending Skills */}
      {trending.length > 0 && (
        <section aria-labelledby="trending-heading" className="py-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="trending-heading" className="text-2xl font-bold">Trending Skills</h2>
            <Link href="/browse?sort=most_installed" className="text-sm text-[var(--primary)] hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trending.map((skill) => (
              <SkillCardSimple key={skill.slug} skill={skill} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Published */}
      {recent.length > 0 && (
        <section aria-labelledby="recent-heading" className="py-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="recent-heading" className="text-2xl font-bold">Recently Published</h2>
            <Link href="/browse?sort=newest" className="text-sm text-[var(--primary)] hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((skill) => (
              <SkillCardSimple key={skill.slug} skill={skill} />
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section aria-labelledby="categories-heading" className="py-8">
        <h2 id="categories-heading" className="mb-6 text-2xl font-bold">Browse by Category</h2>
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
      <section aria-labelledby="how-it-works-heading" className="py-8">
        <h2 id="how-it-works-heading" className="mb-6 text-2xl font-bold">How it works</h2>
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
