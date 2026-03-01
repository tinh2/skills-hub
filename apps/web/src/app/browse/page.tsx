"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { skills as skillsApi, categories as categoriesApi } from "@/lib/api";
import { SkillCard } from "@/components/skill-card";
import { CATEGORIES, PLATFORMS, PLATFORM_LABELS } from "@skills-hub/shared";
import { useState, useCallback, Suspense } from "react";
import Link from "next/link";

function BrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [platform, setPlatform] = useState(searchParams.get("platform") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");

  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v) qs.set(k, v);
      }
      const str = qs.toString();
      router.replace(str ? `?${str}` : "/browse", { scroll: false });
    },
    [router],
  );

  function handleFilterChange(key: string, value: string) {
    const updated = { q: searchQuery, category, platform, sort, [key]: value };
    if (key === "q") setSearchQuery(value);
    if (key === "category") setCategory(value);
    if (key === "platform") setPlatform(value);
    if (key === "sort") setSort(value);
    updateUrl(updated);
  }

  // Featured skill for the active category
  const { data: featuredMap } = useQuery({
    queryKey: ["featured"],
    queryFn: () => categoriesApi.featured(),
    staleTime: 60_000,
  });

  const featuredSkill = category && featuredMap ? featuredMap[category] : null;

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["skills", searchQuery, category, platform, sort],
    queryFn: ({ pageParam }) =>
      skillsApi.list({
        q: searchQuery || undefined,
        category: category || undefined,
        platform: (platform || undefined) as any,
        sort: sort as any,
        limit: 20,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.cursor ?? undefined : undefined,
  });

  const allSkills = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Browse Skills</h1>

      {/* Filters */}
      <div className="mb-8 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search skills..."
          aria-label="Search skills"
          value={searchQuery}
          onChange={(e) => handleFilterChange("q", e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm"
        />
        <select
          value={category}
          aria-label="Filter by category"
          onChange={(e) => handleFilterChange("category", e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
        <select
          value={platform}
          aria-label="Filter by platform"
          onChange={(e) => handleFilterChange("platform", e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm"
        >
          <option value="">All Platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_LABELS[p]}
            </option>
          ))}
        </select>
        <select
          value={sort}
          aria-label="Sort skills by"
          onChange={(e) => handleFilterChange("sort", e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm"
        >
          <option value="newest">Newest</option>
          <option value="most_installed">Most Installed</option>
          <option value="most_liked">Most Liked</option>
          <option value="highest_rated">Highest Rated</option>
          <option value="recently_updated">Recently Updated</option>
        </select>
      </div>

      {/* Featured Hero Card */}
      {featuredSkill && category && (
        <Link
          href={`/skills/${featuredSkill.slug}`}
          className="mb-8 block rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6 transition-shadow hover:shadow-lg dark:border-amber-800 dark:from-amber-950 dark:to-orange-950"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              Top Liked
            </span>
            <span className="rounded bg-[var(--accent)] px-2 py-0.5 text-xs">
              {featuredSkill.category.name}
            </span>
          </div>
          <h2 className="mb-1 text-xl font-bold">{featuredSkill.name}</h2>
          <p className="mb-1 text-sm text-[var(--muted)]">
            by {featuredSkill.author.username}
          </p>
          <p className="mb-3 text-sm text-[var(--muted)]">
            {featuredSkill.description}
          </p>
          <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
            <span>{"\u2665"} {featuredSkill.likeCount} likes</span>
            <span>{featuredSkill.installCount.toLocaleString()} installs</span>
            {featuredSkill.avgRating !== null && (
              <span>{featuredSkill.avgRating.toFixed(1)} stars</span>
            )}
            <span>v{featuredSkill.latestVersion}</span>
          </div>
        </Link>
      )}

      {/* Results */}
      {isLoading && <p className="text-[var(--muted)]">Loading skills...</p>}
      {error && (
        <p role="alert" className="text-[var(--error)]">
          Failed to load skills. Please try again.
        </p>
      )}
      {allSkills.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              isFeatured={!!featuredSkill && skill.id === featuredSkill.id}
            />
          ))}
        </div>
      )}
      {!isLoading && allSkills.length === 0 && (
        <p className="py-12 text-center text-[var(--muted)]">
          No skills found matching your criteria.
        </p>
      )}
      {hasNextPage && (
        <div className="mt-8 text-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-medium disabled:opacity-50"
          >
            {isFetchingNextPage ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<p className="text-[var(--muted)]">Loading...</p>}>
      <BrowseContent />
    </Suspense>
  );
}
