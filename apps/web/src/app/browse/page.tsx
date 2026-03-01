"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { skills as skillsApi, categories as categoriesApi, search as searchApi } from "@/lib/api";
import { SkillCard } from "@/components/skill-card";
import { CATEGORIES, PLATFORMS, PLATFORM_LABELS } from "@skills-hub/shared";
import { useState, useCallback, useEffect, useRef, useId, Suspense } from "react";
import Link from "next/link";

function BrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [platform, setPlatform] = useState(searchParams.get("platform") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [minScore, setMinScore] = useState(searchParams.get("minScore") || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      // Reset sort from "relevance" when query is cleared (option no longer visible)
      if (!searchQuery && sort === "relevance") setSort("newest");
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, sort]);

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

  // Update URL when debounced query changes
  useEffect(() => {
    updateUrl({ q: debouncedQuery, category, platform, sort, minScore });
  }, [debouncedQuery, category, platform, sort, minScore, updateUrl]);

  function handleFilterChange(key: string, value: string) {
    if (key === "q") {
      setSearchQuery(value);
      return; // URL will update via debounced effect
    }
    if (key === "category") setCategory(value);
    if (key === "platform") setPlatform(value);
    if (key === "sort") setSort(value);
    if (key === "minScore") setMinScore(value);
  }

  const hasActiveFilters = debouncedQuery || category || platform || sort !== "newest" || minScore;

  function clearAllFilters() {
    setSearchQuery("");
    setDebouncedQuery("");
    setCategory("");
    setPlatform("");
    setSort("newest");
    setMinScore("");
  }

  // Featured skill for the active category
  const { data: featuredMap } = useQuery({
    queryKey: ["featured"],
    queryFn: () => categoriesApi.featured(),
    staleTime: 60_000,
  });

  const featuredSkill = category && featuredMap ? featuredMap[category] : null;

  // Autocomplete suggestions
  const { data: suggestions } = useQuery({
    queryKey: ["suggestions", searchQuery],
    queryFn: () => searchApi.suggestions(searchQuery),
    enabled: searchQuery.length >= 2,
    staleTime: 30_000,
  });

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["skills", debouncedQuery, category, platform, sort, minScore],
    queryFn: ({ pageParam }) => {
      const params = {
        q: debouncedQuery || undefined,
        category: category || undefined,
        platform: (platform || undefined) as any,
        sort: (debouncedQuery && sort === "newest" ? "relevance" : sort) as any,
        minScore: minScore ? Number(minScore) : undefined,
        limit: 20,
        cursor: pageParam,
      };
      // Use tsvector search endpoint when query is present
      return debouncedQuery ? searchApi.query(params) : skillsApi.list(params);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.cursor ?? undefined : undefined,
  });

  const allSkills = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Browse Skills</h1>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative" ref={suggestionsRef}>
          {(() => {
            const allItems = [
              ...(suggestions?.skills.map((s) => ({ type: "skill" as const, ...s })) ?? []),
              ...(suggestions?.tags.map((t) => ({ type: "tag" as const, name: t })) ?? []),
            ];
            const isOpen = showSuggestions && searchQuery.length >= 2 && allItems.length > 0;
            const activeItem = activeIndex >= 0 && activeIndex < allItems.length ? allItems[activeIndex] : null;
            const activeDescendant = activeItem ? `${listboxId}-option-${activeIndex}` : undefined;

            return (
              <>
                <input
                  type="search"
                  placeholder="Search skills..."
                  role="combobox"
                  aria-label="Search skills"
                  aria-expanded={isOpen}
                  aria-haspopup="listbox"
                  aria-autocomplete="list"
                  aria-controls={listboxId}
                  aria-activedescendant={activeDescendant}
                  value={searchQuery}
                  onChange={(e) => {
                    handleFilterChange("q", e.target.value);
                    setShowSuggestions(true);
                    setActiveIndex(-1);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setShowSuggestions(false);
                      setActiveIndex(-1);
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      if (!isOpen) { setShowSuggestions(true); return; }
                      setActiveIndex((prev) => (prev + 1) % allItems.length);
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActiveIndex((prev) => (prev <= 0 ? allItems.length - 1 : prev - 1));
                    } else if (e.key === "Enter" && activeItem) {
                      e.preventDefault();
                      if (activeItem.type === "skill") {
                        router.push(`/skills/${(activeItem as any).slug}`);
                      } else {
                        setSearchQuery(activeItem.name);
                      }
                      setShowSuggestions(false);
                      setActiveIndex(-1);
                    }
                  }}
                  className="min-h-[44px] rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm"
                />
                {isOpen && (
                  <div
                    id={listboxId}
                    role="listbox"
                    className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-[var(--border)] bg-[var(--background)] py-1 shadow-lg"
                  >
                    {suggestions!.skills.length > 0 && (
                      <div>
                        <p className="px-3 py-1 text-xs font-medium text-[var(--muted)]">Skills</p>
                        {suggestions!.skills.map((s, i) => (
                          <Link
                            key={s.slug}
                            href={`/skills/${s.slug}`}
                            id={`${listboxId}-option-${i}`}
                            role="option"
                            aria-selected={activeIndex === i}
                            onClick={() => setShowSuggestions(false)}
                            className={`block min-h-[44px] px-3 py-2 text-sm ${activeIndex === i ? "bg-[var(--accent)]" : "hover:bg-[var(--accent)]"}`}
                          >
                            {s.name}
                          </Link>
                        ))}
                      </div>
                    )}
                    {suggestions!.tags.length > 0 && (
                      <div>
                        <p className="px-3 py-1 text-xs font-medium text-[var(--muted)]">Tags</p>
                        {suggestions!.tags.map((tag, j) => {
                          const idx = (suggestions!.skills.length) + j;
                          return (
                            <button
                              key={tag}
                              id={`${listboxId}-option-${idx}`}
                              role="option"
                              aria-selected={activeIndex === idx}
                              onClick={() => {
                                setSearchQuery(tag);
                                setShowSuggestions(false);
                              }}
                              className={`block min-h-[44px] w-full px-3 py-2 text-left text-sm ${activeIndex === idx ? "bg-[var(--accent)]" : "hover:bg-[var(--accent)]"}`}
                            >
                              #{tag}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
        <select
          value={category}
          aria-label="Filter by category"
          onChange={(e) => handleFilterChange("category", e.target.value)}
          className="min-h-[44px] rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm"
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
          className="min-h-[44px] rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm"
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
          className="min-h-[44px] rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm"
        >
          {debouncedQuery && <option value="relevance">Best Match</option>}
          <option value="newest">Newest</option>
          <option value="most_installed">Most Installed</option>
          <option value="most_liked">Most Liked</option>
          <option value="highest_rated">Highest Rated</option>
          <option value="recently_updated">Recently Updated</option>
        </select>
        <input
          type="number"
          min="0"
          max="100"
          placeholder="Min score"
          aria-label="Minimum quality score"
          value={minScore}
          onChange={(e) => handleFilterChange("minScore", e.target.value)}
          className="min-h-[44px] w-28 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm"
        />
      </div>

      {/* Active filter indicator + clear */}
      {hasActiveFilters && (
        <div className="mb-6 flex items-center gap-2 text-sm text-[var(--muted)]">
          <span>Filtering results</span>
          <button
            onClick={clearAllFilters}
            className="min-h-[44px] rounded-lg px-3 py-2 text-[var(--primary)] underline hover:no-underline"
          >
            Clear all filters
          </button>
        </div>
      )}

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
            <span>{featuredSkill.likeCount} likes</span>
            <span>{featuredSkill.installCount.toLocaleString()} installs</span>
            {featuredSkill.avgRating !== null && (
              <span>{featuredSkill.avgRating.toFixed(1)} stars</span>
            )}
            <span>v{featuredSkill.latestVersion}</span>
          </div>
        </Link>
      )}

      {/* Results */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <span className="loading-spinner" aria-hidden="true" />
          <span className="ml-3 text-[var(--muted)]">Loading skills...</span>
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-lg border border-[var(--error)] bg-[var(--error-subtle)] p-4">
          <p className="text-sm text-[var(--error)]">
            Failed to load skills. Please try again.
          </p>
        </div>
      )}
      {allSkills.length > 0 && (
        <>
          <p className="mb-4 text-sm text-[var(--muted)]" aria-live="polite">
            {allSkills.length} skill{allSkills.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                isFeatured={!!featuredSkill && skill.id === featuredSkill.id}
              />
            ))}
          </div>
        </>
      )}
      {!isLoading && allSkills.length === 0 && (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center">
          <p className="mb-2 text-[var(--muted)]">
            No skills found matching your criteria.
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="min-h-[44px] rounded-lg px-4 py-2 text-sm text-[var(--primary)] underline hover:no-underline"
            >
              Clear filters and try again
            </button>
          )}
        </div>
      )}
      {hasNextPage && (
        <div className="mt-8 text-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="min-h-[44px] rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-medium transition-colors hover:bg-[var(--border)] disabled:opacity-50"
          >
            {isFetchingNextPage ? (
              <span className="flex items-center justify-center gap-2">
                <span className="loading-spinner" aria-hidden="true" />
                Loading...
              </span>
            ) : (
              "Load More"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <span className="loading-spinner" aria-hidden="true" />
          <span className="ml-3 text-[var(--muted)]">Loading...</span>
        </div>
      }
    >
      <BrowseContent />
    </Suspense>
  );
}
