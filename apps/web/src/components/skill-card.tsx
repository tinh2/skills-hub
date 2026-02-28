"use client";

import Link from "next/link";
import type { SkillSummary } from "@skills-hub/shared";

export function SkillCard({ skill }: { skill: SkillSummary }) {
  return (
    <Link
      href={`/skills/${skill.slug}`}
      className="block rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5 transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{skill.name}</h3>
            {skill.isComposition && (
              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-800">
                Composition
              </span>
            )}
            {skill.visibility !== "PUBLIC" && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                {skill.visibility === "PRIVATE" ? "Private" : "Unlisted"}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            by {skill.author.username}
          </p>
        </div>
        {skill.qualityScore !== null && (
          <div
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              skill.qualityScore >= 70
                ? "bg-green-100 text-green-800"
                : skill.qualityScore >= 40
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
            }`}
          >
            {skill.qualityScore}
          </div>
        )}
      </div>

      <p className="mb-4 line-clamp-2 text-sm text-[var(--muted)]">
        {skill.description}
      </p>

      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
        <div className="flex items-center gap-3">
          <span className="rounded bg-[var(--accent)] px-2 py-0.5">
            {skill.category.name}
          </span>
          <span>v{skill.latestVersion}</span>
        </div>
        <div className="flex items-center gap-3">
          {skill.avgRating !== null && <span>{skill.avgRating.toFixed(1)} stars</span>}
          <span>{skill.installCount.toLocaleString()} installs</span>
        </div>
      </div>

      {skill.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {skill.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded bg-[var(--accent)] px-1.5 py-0.5 text-xs text-[var(--muted)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
