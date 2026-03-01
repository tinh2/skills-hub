"use client";

import Link from "next/link";
import type { SkillDetail } from "@skills-hub/shared";
import { PLATFORM_LABELS, VISIBILITY_LABELS } from "@skills-hub/shared";
import type { Platform, Visibility } from "@skills-hub/shared";
import { VersionHistory } from "./version-history";

export function SkillSidebar({ skill }: { skill: SkillDetail }) {
  return (
    <aside aria-label="Skill details" className="space-y-6">
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
            <dt className="text-[var(--muted)]">Visibility</dt>
            <dd>{VISIBILITY_LABELS[skill.visibility as Visibility] ?? skill.visibility}</dd>
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
      <VersionHistory skill={skill} />

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
  );
}
