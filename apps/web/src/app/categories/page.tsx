import Link from "next/link";
import { CATEGORIES } from "@skills-hub/shared";

export default function CategoriesPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Categories</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/browse?category=${cat.slug}`}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6 transition-shadow hover:shadow-md"
          >
            <h2 className="text-lg font-semibold">{cat.name}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {cat.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
