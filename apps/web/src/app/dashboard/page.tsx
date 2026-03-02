"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { skills as skillsApi, orgs as orgsApi, versions as versionsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import type { SkillSummary, VersionSummary } from "@skills-hub-ai/shared";

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-[var(--muted)]">No ratings</span>;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= full ? "text-yellow-500" : i === full + 1 && half ? "text-yellow-500" : "text-[var(--border)]"}>
          {i <= full ? "\u2605" : i === full + 1 && half ? "\u2605" : "\u2606"}
        </span>
      ))}
      <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
    </span>
  );
}

function VersionHistory({ slug }: { slug: string }) {
  const { data: versionList, isLoading } = useQuery({
    queryKey: ["versions", slug],
    queryFn: () => versionsApi.list(slug),
  });

  if (isLoading) return <p className="py-2 text-xs text-[var(--muted)]">Loading versions...</p>;
  if (!versionList || versionList.length === 0) return <p className="py-2 text-xs text-[var(--muted)]">No versions yet.</p>;

  return (
    <div className="mt-2 space-y-1">
      {versionList.slice(0, 5).map((v: VersionSummary) => (
        <div key={v.id} className="flex items-center justify-between rounded bg-[var(--accent)] px-3 py-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium">v{v.version}</span>
            {v.changelog && <span className="text-[var(--muted)] truncate max-w-[200px]">{v.changelog}</span>}
          </div>
          <span className="text-[var(--muted)]">{new Date(v.createdAt).toLocaleDateString()}</span>
        </div>
      ))}
      {versionList.length > 5 && (
        <Link href={`/skills/${slug}`} className="block text-xs text-[var(--primary)] hover:underline">
          View all {versionList.length} versions
        </Link>
      )}
    </div>
  );
}

function DashboardSkillRow({
  skill,
  onPublish,
  onArchive,
  isPublishing,
  isArchiving,
  tab,
}: {
  skill: SkillSummary;
  onPublish: (slug: string) => void;
  onArchive: (slug: string) => void;
  isPublishing: boolean;
  isArchiving: boolean;
  tab: "published" | "drafts";
}) {
  const [showVersions, setShowVersions] = useState(false);

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/skills/${skill.slug}`} className="text-base font-semibold hover:text-[var(--primary)]">
              {skill.name}
            </Link>
            {skill.status !== "PUBLISHED" && (
              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                skill.status === "DRAFT" ? "bg-[var(--accent)] text-[var(--muted)]" :
                skill.status === "PENDING_REVIEW" ? "bg-[var(--warning-subtle)] text-[var(--warning)]" :
                "bg-[var(--error-subtle)] text-[var(--error)]"
              }`}>
                {skill.status === "PENDING_REVIEW" ? "In Review" : skill.status}
              </span>
            )}
            {skill.isComposition && (
              <span className="rounded bg-[var(--primary)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--primary)]">
                Composition
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--muted)] line-clamp-1">{skill.description}</p>
        </div>

        <div className="flex shrink-0 gap-1">
          <Link
            href={`/skills/${skill.slug}/edit`}
            className="inline-flex min-h-[44px] items-center rounded bg-[var(--accent)] px-3 py-1.5 text-xs transition-colors hover:bg-[var(--border)]"
            aria-label={`Edit ${skill.name}`}
          >
            Edit
          </Link>
          {tab === "drafts" && (
            <button
              onClick={() => onPublish(skill.slug)}
              disabled={isPublishing}
              className="min-h-[44px] rounded bg-[var(--success-subtle)] px-3 py-1.5 text-xs text-[var(--success)] transition-colors hover:opacity-80 disabled:opacity-50"
              aria-label={`Publish ${skill.name}`}
            >
              Publish
            </button>
          )}
          <button
            onClick={() => {
              if (confirm("Archive this skill?")) onArchive(skill.slug);
            }}
            disabled={isArchiving}
            className="min-h-[44px] rounded bg-[var(--error-subtle)] px-3 py-1.5 text-xs text-[var(--error)] transition-colors hover:opacity-80 disabled:opacity-50"
            aria-label={`Archive ${skill.name}`}
          >
            Archive
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-4 flex flex-wrap items-center gap-6 text-sm">
        <div className="flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="text-[var(--muted)]">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          <span className="font-semibold">{skill.installCount.toLocaleString()}</span>
          <span className="text-[var(--muted)]">installs</span>
        </div>

        <div className="flex items-center gap-1.5">
          <StarRating rating={skill.avgRating} />
          {skill.reviewCount > 0 && (
            <span className="text-[var(--muted)]">({skill.reviewCount})</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-red-500">{skill.userLiked ? "\u2665" : "\u2661"}</span>
          <span className="font-semibold">{skill.likeCount}</span>
          <span className="text-[var(--muted)]">likes</span>
        </div>

        <div className="flex items-center gap-1.5 text-[var(--muted)]">
          <span className="font-mono text-xs">v{skill.latestVersion}</span>
        </div>

        {skill.qualityScore !== null && (
          <div className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            skill.qualityScore >= 70
              ? "bg-[var(--success-subtle)] text-[var(--success)]"
              : skill.qualityScore >= 40
                ? "bg-[var(--warning-subtle)] text-[var(--warning)]"
                : "bg-[var(--error-subtle)] text-[var(--error)]"
          }`}>
            Score: {skill.qualityScore}
          </div>
        )}
      </div>

      {/* Version history toggle */}
      <button
        onClick={() => setShowVersions(!showVersions)}
        className="mt-3 flex min-h-[44px] items-center gap-1 text-xs text-[var(--primary)] hover:underline"
        aria-expanded={showVersions}
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"
          className={`transition-transform ${showVersions ? "rotate-90" : ""}`}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        Version History
      </button>
      {showVersions && <VersionHistory slug={skill.slug} />}
    </div>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"published" | "drafts">("published");

  const { data: publishedData, isLoading: loadingPublished } = useQuery({
    queryKey: ["dashboard", "published", user?.username],
    queryFn: () => skillsApi.list({ author: user!.username, sort: "recently_updated", limit: 50 }),
    enabled: isAuthenticated && !!user,
  });

  const { data: draftData, isLoading: loadingDrafts } = useQuery({
    queryKey: ["dashboard", "drafts", user?.username],
    queryFn: () => skillsApi.list({ author: user!.username, status: "DRAFT", sort: "recently_updated", limit: 50 }),
    enabled: isAuthenticated && !!user,
  });

  const { data: userOrgs } = useQuery({
    queryKey: ["userOrgs"],
    queryFn: () => orgsApi.list(),
    enabled: isAuthenticated,
  });

  const [actionError, setActionError] = useState("");

  const archiveSkill = useMutation({
    mutationFn: (slug: string) => skillsApi.archive(slug),
    onSuccess: () => {
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const publishSkillMutation = useMutation({
    mutationFn: (slug: string) => skillsApi.publish(slug),
    onSuccess: () => {
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  if (!isAuthenticated) {
    router.push("/");
    return null;
  }

  const myPublished = publishedData?.data ?? [];
  const myDrafts = draftData?.data ?? [];
  const totalInstalls = myPublished.reduce((sum, s) => sum + s.installCount, 0);
  const totalReviews = myPublished.reduce((sum, s) => sum + s.reviewCount, 0);
  const ratedSkills = myPublished.filter((s) => s.avgRating !== null);
  const avgRating = ratedSkills.length > 0
    ? ratedSkills.reduce((sum, s) => sum + (s.avgRating ?? 0), 0) / ratedSkills.length
    : null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Link
            href="/publish"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90"
          >
            New Skill
          </Link>
          <Link
            href="/settings"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm transition-colors hover:bg-[var(--accent)]"
          >
            Settings
          </Link>
        </div>
      </div>

      {actionError && <p role="alert" className="mb-4 rounded-lg bg-[var(--error-subtle)] p-3 text-sm text-[var(--error)]">{actionError}</p>}

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
          <p className="text-2xl font-bold">{publishedData?.hasMore ? `${myPublished.length}+` : myPublished.length}</p>
          <p className="text-sm text-[var(--muted)]">Published</p>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
          <p className="text-2xl font-bold">{draftData?.hasMore ? `${myDrafts.length}+` : myDrafts.length}</p>
          <p className="text-sm text-[var(--muted)]">Drafts</p>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
          <p className="text-2xl font-bold">
            {totalInstalls.toLocaleString()}{publishedData?.hasMore ? "+" : ""}
          </p>
          <p className="text-sm text-[var(--muted)]">Total Installs</p>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
          <p className="text-2xl font-bold">{totalReviews.toLocaleString()}</p>
          <p className="text-sm text-[var(--muted)]">Total Reviews</p>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
          <div className="flex items-center gap-1">
            {avgRating !== null ? (
              <>
                <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
                <span className="text-yellow-500">{"\u2605"}</span>
              </>
            ) : (
              <span className="text-2xl font-bold">--</span>
            )}
          </div>
          <p className="text-sm text-[var(--muted)]">Avg Rating</p>
        </div>
      </div>

      {/* Organizations */}
      {userOrgs && userOrgs.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Organizations</h2>
            <Link href="/orgs/create" className="text-sm text-[var(--primary)] hover:underline">
              Create Org
            </Link>
          </div>
          <div className="flex flex-wrap gap-3">
            {userOrgs.map((m) => (
              <Link
                key={m.org.slug}
                href={`/orgs/${m.org.slug}`}
                className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 hover:shadow-sm"
              >
                {m.org.avatarUrl && (
                  <Image src={m.org.avatarUrl} alt={`${m.org.name} logo`} width={24} height={24} className="rounded-full" />
                )}
                <span className="text-sm font-medium">{m.org.name}</span>
                <span className="rounded bg-[var(--accent)] px-1.5 py-0.5 text-xs">{m.role}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Skills tabs */}
      <div role="tablist" aria-label="Skill lists" className="mb-4 flex gap-4 border-b border-[var(--border)]">
        <button
          role="tab"
          aria-selected={tab === "published"}
          aria-controls="panel-published"
          id="tab-published"
          onClick={() => setTab("published")}
          className={`min-h-[44px] border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${tab === "published" ? "border-[var(--primary)] text-[var(--foreground)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}
        >
          Published ({myPublished.length})
        </button>
        <button
          role="tab"
          aria-selected={tab === "drafts"}
          aria-controls="panel-drafts"
          id="tab-drafts"
          onClick={() => setTab("drafts")}
          className={`min-h-[44px] border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${tab === "drafts" ? "border-[var(--primary)] text-[var(--foreground)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}
        >
          Drafts ({myDrafts.length})
        </button>
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {(tab === "published" ? loadingPublished : loadingDrafts) && (
          <div className="flex items-center justify-center py-8">
            <span className="loading-spinner" aria-hidden="true" />
            <span className="ml-3 text-[var(--muted)]">Loading skills...</span>
          </div>
        )}

        {tab === "published" && myPublished.length === 0 && !loadingPublished && (
          <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center">
            <p className="mb-2 text-[var(--muted)]">No published skills yet.</p>
            <Link href="/publish" className="text-sm text-[var(--primary)] hover:underline">
              Publish your first skill
            </Link>
          </div>
        )}

        {tab === "drafts" && myDrafts.length === 0 && !loadingDrafts && (
          <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center">
            <p className="text-[var(--muted)]">No drafts.</p>
          </div>
        )}

        <div className="space-y-4">
          {(tab === "published" ? myPublished : myDrafts).map((skill) => (
            <DashboardSkillRow
              key={skill.id}
              skill={skill}
              onPublish={(slug) => publishSkillMutation.mutate(slug)}
              onArchive={(slug) => archiveSkill.mutate(slug)}
              isPublishing={publishSkillMutation.isPending}
              isArchiving={archiveSkill.isPending}
              tab={tab}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
