"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { skills as skillsApi, reviews as reviewsApi } from "@/lib/api";
import { PLATFORM_LABELS } from "@skills-hub/shared";
import type { Platform } from "@skills-hub/shared";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function SkillDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: skill, isLoading } = useQuery({
    queryKey: ["skill", slug],
    queryFn: () => skillsApi.get(slug),
  });

  const { data: reviewList } = useQuery({
    queryKey: ["reviews", slug],
    queryFn: () => reviewsApi.list(slug),
    enabled: !!skill,
  });

  if (isLoading) {
    return <p className="text-[var(--muted)]">Loading skill...</p>;
  }

  if (!skill) {
    return <p className="text-[var(--error)]">Skill not found.</p>;
  }

  const installCmd = `npx skills-hub install ${skill.slug}`;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Main content */}
      <div className="lg:col-span-2">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{skill.name}</h1>
            <p className="mt-1 text-[var(--muted)]">
              by{" "}
              <Link
                href={`/u/${skill.author.username}`}
                className="text-[var(--primary)] hover:underline"
              >
                {skill.author.username}
              </Link>
            </p>
          </div>
          {skill.qualityScore !== null && (
            <div
              className={`rounded-full px-3 py-1 text-sm font-bold ${
                skill.qualityScore >= 70
                  ? "bg-green-100 text-green-800"
                  : skill.qualityScore >= 40
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              Quality: {skill.qualityScore}/100
            </div>
          )}
        </div>

        <p className="mb-6 text-lg text-[var(--muted)]">{skill.description}</p>

        {/* Install command */}
        <div className="mb-8 rounded-lg bg-[var(--accent)] p-4">
          <p className="mb-2 text-sm font-medium">Install</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-[var(--background)] px-3 py-2 text-sm">
              {installCmd}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(installCmd)}
              className="rounded bg-[var(--primary)] px-3 py-2 text-sm text-[var(--primary-foreground)]"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Instructions */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-bold">Instructions</h2>
          <div className="prose max-w-none rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {skill.instructions}
            </ReactMarkdown>
          </div>
        </section>

        {/* Reviews */}
        <section>
          <h2 className="mb-4 text-xl font-bold">
            Reviews ({skill.reviewCount})
          </h2>
          {reviewList?.length === 0 && (
            <p className="text-[var(--muted)]">No reviews yet.</p>
          )}
          {reviewList?.map((review) => (
            <div
              key={review.id}
              className="mb-4 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {review.author.username}
                  </span>
                  <span className="text-sm text-[var(--muted)]">
                    {"*".repeat(review.rating)}
                    {"*" === "*" ? `${review.rating}/5` : ""}
                  </span>
                </div>
                <span className="text-xs text-[var(--muted)]">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              {review.title && (
                <p className="mb-1 font-medium">{review.title}</p>
              )}
              {review.body && (
                <p className="text-sm text-[var(--muted)]">{review.body}</p>
              )}
              {review.response && (
                <div className="mt-3 rounded bg-[var(--accent)] p-3">
                  <p className="text-xs font-medium">Author response:</p>
                  <p className="text-sm text-[var(--muted)]">
                    {review.response.body}
                  </p>
                </div>
              )}
            </div>
          ))}
        </section>
      </div>

      {/* Sidebar */}
      <aside className="space-y-6">
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Version</dt>
              <dd className="font-medium">v{skill.latestVersion}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Category</dt>
              <dd>
                <Link
                  href={`/browse?category=${skill.category.slug}`}
                  className="text-[var(--primary)] hover:underline"
                >
                  {skill.category.name}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Installs</dt>
              <dd className="font-medium">
                {skill.installCount.toLocaleString()}
              </dd>
            </div>
            {skill.avgRating !== null && (
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">Rating</dt>
                <dd className="font-medium">
                  {skill.avgRating.toFixed(1)}/5 ({skill.reviewCount} reviews)
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Platforms</dt>
              <dd>
                {skill.platforms
                  .map((p) => PLATFORM_LABELS[p as Platform])
                  .join(", ")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Published</dt>
              <dd>{new Date(skill.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        {/* Tags */}
        {skill.tags.length > 0 && (
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
            <h3 className="mb-3 text-sm font-medium">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {skill.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/browse?q=${tag}`}
                  className="rounded bg-[var(--accent)] px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Version history */}
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
          <h3 className="mb-3 text-sm font-medium">Version History</h3>
          <ul className="space-y-2">
            {skill.versions.slice(0, 5).map((v) => (
              <li key={v.id} className="text-sm">
                <span className="font-medium">v{v.version}</span>
                <span className="ml-2 text-xs text-[var(--muted)]">
                  {new Date(v.createdAt).toLocaleDateString()}
                </span>
                {v.changelog && (
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {v.changelog}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* GitHub link */}
        {skill.githubRepoUrl && (
          <a
            href={skill.githubRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 text-center text-sm text-[var(--primary)] hover:underline"
          >
            View on GitHub
          </a>
        )}
      </aside>
    </div>
  );
}
