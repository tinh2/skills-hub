"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { skills as skillsApi } from "@/lib/api";
import { SkillCard } from "@/components/skill-card";
import { CATEGORIES, PLATFORMS, PLATFORM_LABELS } from "@skills-hub/shared";
import { useState, Suspense } from "react";

function BrowseContent() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [platform, setPlatform] = useState(searchParams.get("platform") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");

  const { data, isLoading, error } = useQuery({
    queryKey: ["skills", searchQuery, category, platform, sort],
    queryFn: () =>
      skillsApi.list({
        q: searchQuery || undefined,
        category: category || undefined,
        platform: (platform || undefined) as any,
        sort: sort as any,
        limit: 20,
      }),
  });

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Browse Skills</h1>

      {/* Filters */}
      <div className="mb-8 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
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
          onChange={(e) => setPlatform(e.target.value)}
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
          onChange={(e) => setSort(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm"
        >
          <option value="newest">Newest</option>
          <option value="most_installed">Most Installed</option>
          <option value="highest_rated">Highest Rated</option>
          <option value="recently_updated">Recently Updated</option>
        </select>
      </div>

      {/* Results */}
      {isLoading && <p className="text-[var(--muted)]">Loading skills...</p>}
      {error && (
        <p className="text-[var(--error)]">
          Failed to load skills. Please try again.
        </p>
      )}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
          {data.data.length === 0 && (
            <p className="py-12 text-center text-[var(--muted)]">
              No skills found matching your criteria.
            </p>
          )}
        </>
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
