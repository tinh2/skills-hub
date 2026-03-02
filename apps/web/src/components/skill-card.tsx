"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { likes } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { SkillSummary } from "@skills-hub-ai/shared";

export function SkillCard({
  skill,
  isFeatured,
}: {
  skill: SkillSummary;
  isFeatured?: boolean;
}) {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const toggleLike = useMutation({
    mutationFn: () => likes.toggle(skill.slug),
    onSuccess: (result) => {
      queryClient.setQueriesData(
        { queryKey: ["skills"] },
        (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: page.data.map((s: SkillSummary) =>
                s.id === skill.id
                  ? { ...s, likeCount: result.likeCount, userLiked: result.liked }
                  : s,
              ),
            })),
          };
        },
      );
    },
  });

  function handleLikeClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;
    toggleLike.mutate();
  }

  return (
    <article className="relative rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5 transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">
              <Link
                href={`/skills/${skill.slug}`}
                className="after:absolute after:inset-0"
              >
                {skill.name}
              </Link>
            </h3>
            {isFeatured && (
              <span className="rounded bg-[var(--warning-subtle)] px-1.5 py-0.5 text-xs font-medium text-[var(--warning)]">
                Top Liked
              </span>
            )}
            {skill.isComposition && (
              <span className="rounded bg-[var(--primary)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--primary)]">
                Composition
              </span>
            )}
            {skill.visibility !== "PUBLIC" && (
              <span className="rounded bg-[var(--accent)] px-1.5 py-0.5 text-xs font-medium text-[var(--muted)]">
                {skill.visibility === "PRIVATE" ? "Private" : skill.visibility === "ORG" ? "Org" : "Unlisted"}
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
                ? "bg-[var(--success-subtle)] text-[var(--success)]"
                : skill.qualityScore >= 40
                  ? "bg-[var(--warning-subtle)] text-[var(--warning)]"
                  : "bg-[var(--error-subtle)] text-[var(--error)]"
            }`}
            aria-label={`Quality score: ${skill.qualityScore} out of 100`}
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
        <div className="relative z-10 flex items-center gap-3">
          {skill.avgRating !== null && <span>{skill.avgRating.toFixed(1)} stars</span>}
          <span>{skill.installCount.toLocaleString()} installs</span>
          <button
            type="button"
            onClick={handleLikeClick}
            disabled={toggleLike.isPending}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded px-2 py-1 transition-colors hover:bg-[var(--accent)] hover:text-red-500 disabled:opacity-50"
            aria-label={skill.userLiked ? `Unlike ${skill.name}` : `Like ${skill.name}`}
          >
            <span className={skill.userLiked ? "text-red-500" : ""}>{skill.userLiked ? "\u2665" : "\u2661"}</span>
            <span>{skill.likeCount}</span>
          </button>
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
    </article>
  );
}
