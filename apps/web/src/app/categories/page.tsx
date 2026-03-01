"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CATEGORIES } from "@skills-hub/shared";
import { categories as categoriesApi } from "@/lib/api";

export default function CategoriesPage() {
  const { data: featuredMap } = useQuery({
    queryKey: ["featured"],
    queryFn: () => categoriesApi.featured(),
    staleTime: 60_000,
  });

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Categories</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((cat) => {
          const featured = featuredMap?.[cat.slug];
          return (
            <Link
              key={cat.slug}
              href={`/browse?category=${cat.slug}`}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6 transition-shadow hover:shadow-md"
            >
              <h2 className="text-lg font-semibold">{cat.name}</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {cat.description}
              </p>
              {featured && (
                <div className="mt-3 border-t border-[var(--card-border)] pt-3">
                  <p className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-400">Top skill</p>
                  <p className="text-sm font-medium">{featured.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    by {featured.author.username} &middot; {"\u2665"} {featured.likeCount}
                  </p>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
