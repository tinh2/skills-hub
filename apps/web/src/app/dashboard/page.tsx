"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { skills as skillsApi, orgs as orgsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "next/navigation";
import { SkillCard } from "@/components/skill-card";
import Image from "next/image";
import { useState } from "react";

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

  const archiveSkill = useMutation({
    mutationFn: (slug: string) => skillsApi.archive(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const publishSkill = useMutation({
    mutationFn: (slug: string) => skillsApi.publish(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (!isAuthenticated) {
    router.push("/");
    return null;
  }

  const myPublished = publishedData?.data ?? [];
  const myDrafts = draftData?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Link
            href="/publish"
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)]"
          >
            New Skill
          </Link>
          <Link
            href="/settings"
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
          <p className="text-2xl font-bold">{myPublished.length}</p>
          <p className="text-sm text-[var(--muted)]">Published Skills</p>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
          <p className="text-2xl font-bold">{myDrafts.length}</p>
          <p className="text-sm text-[var(--muted)]">Drafts</p>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
          <p className="text-2xl font-bold">
            {myPublished.reduce((sum, s) => sum + s.installCount, 0).toLocaleString()}
          </p>
          <p className="text-sm text-[var(--muted)]">Total Installs</p>
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
      <div className="mb-4 flex gap-4 border-b border-[var(--border)]">
        <button
          onClick={() => setTab("published")}
          className={`border-b-2 pb-2 text-sm font-medium ${tab === "published" ? "border-[var(--primary)] text-[var(--foreground)]" : "border-transparent text-[var(--muted)]"}`}
        >
          Published ({myPublished.length})
        </button>
        <button
          onClick={() => setTab("drafts")}
          className={`border-b-2 pb-2 text-sm font-medium ${tab === "drafts" ? "border-[var(--primary)] text-[var(--foreground)]" : "border-transparent text-[var(--muted)]"}`}
        >
          Drafts ({myDrafts.length})
        </button>
      </div>

      {(tab === "published" ? loadingPublished : loadingDrafts) && (
        <div className="flex items-center py-8">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(tab === "published" ? myPublished : myDrafts).map((skill) => (
          <div key={skill.id} className="relative">
            <SkillCard skill={skill} />
            <div className="absolute right-2 top-2 flex gap-1">
              <Link
                href={`/skills/${skill.slug}/edit`}
                className="inline-flex min-h-[36px] items-center rounded bg-[var(--card)] px-3 py-1.5 text-xs shadow-sm transition-colors hover:bg-[var(--accent)]"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Edit ${skill.name}`}
              >
                Edit
              </Link>
              {tab === "drafts" && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    publishSkill.mutate(skill.slug);
                  }}
                  disabled={publishSkill.isPending}
                  className="min-h-[36px] rounded bg-green-100 px-3 py-1.5 text-xs text-green-800 transition-colors hover:bg-green-200 disabled:opacity-50 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800"
                  aria-label={`Publish ${skill.name}`}
                >
                  Publish
                </button>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (confirm("Archive this skill?")) archiveSkill.mutate(skill.slug);
                }}
                disabled={archiveSkill.isPending}
                className="min-h-[36px] rounded bg-red-100 px-3 py-1.5 text-xs text-red-800 transition-colors hover:bg-red-200 disabled:opacity-50 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
                aria-label={`Archive ${skill.name}`}
              >
                Archive
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
