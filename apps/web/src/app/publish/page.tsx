"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { skills as skillsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { CATEGORIES, PLATFORMS, PLATFORM_LABELS, VISIBILITY, VISIBILITY_LABELS, VISIBILITY_DESCRIPTIONS } from "@skills-hub/shared";
import type { Platform, Visibility } from "@skills-hub/shared";

export default function PublishPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    categorySlug: "",
    platforms: ["CLAUDE_CODE"] as string[],
    visibility: "PUBLIC" as string,
    instructions: "",
    version: "1.0.0",
    tags: "",
  });

  if (!isAuthenticated) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Sign in to publish</h1>
        <p className="mt-2 text-[var(--muted)]">
          You need a GitHub account to publish skills.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await skillsApi.create({
        ...form,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        platforms: form.platforms,
        visibility: form.visibility,
      });
      router.push(`/skills/${result.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create skill");
    } finally {
      setLoading(false);
    }
  }

  function handlePlatformToggle(platform: string) {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold">Publish a Skill</h1>

      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="publish-name" className="mb-1 block text-sm font-medium">Name</label>
          <input
            id="publish-name"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2"
            placeholder="my-awesome-skill"
          />
        </div>

        <div>
          <label htmlFor="publish-description" className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            id="publish-description"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2"
            rows={3}
            placeholder="What does this skill do?"
          />
        </div>

        <div>
          <label htmlFor="publish-category" className="mb-1 block text-sm font-medium">Category</label>
          <select
            id="publish-category"
            required
            value={form.categorySlug}
            onChange={(e) => setForm({ ...form, categorySlug: e.target.value })}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2"
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.name} — {cat.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Platforms</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePlatformToggle(p)}
                aria-pressed={form.platforms.includes(p)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  form.platforms.includes(p)
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "bg-[var(--accent)] text-[var(--muted)]"
                }`}
              >
                {PLATFORM_LABELS[p as Platform]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Visibility</label>
          <div className="flex flex-wrap gap-2">
            {VISIBILITY.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setForm({ ...form, visibility: v })}
                aria-pressed={form.visibility === v}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  form.visibility === v
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "bg-[var(--accent)] text-[var(--muted)]"
                }`}
              >
                {VISIBILITY_LABELS[v as Visibility]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {VISIBILITY_DESCRIPTIONS[form.visibility as Visibility]}
          </p>
        </div>

        <div>
          <label htmlFor="publish-version" className="mb-1 block text-sm font-medium">Version</label>
          <input
            id="publish-version"
            type="text"
            required
            value={form.version}
            onChange={(e) => setForm({ ...form, version: e.target.value })}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2"
            placeholder="1.0.0"
          />
        </div>

        <div>
          <label htmlFor="publish-tags" className="mb-1 block text-sm font-medium">
            Tags (comma-separated)
          </label>
          <input
            id="publish-tags"
            type="text"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2"
            placeholder="flutter, testing, automation"
          />
        </div>

        <div>
          <label htmlFor="publish-instructions" className="mb-1 block text-sm font-medium">Instructions</label>
          <textarea
            id="publish-instructions"
            required
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 font-mono text-sm"
            rows={16}
            placeholder="The full instructions for your skill..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[44px] rounded-lg bg-[var(--primary)] py-3 font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="loading-spinner" aria-hidden="true" />
              Creating...
            </span>
          ) : (
            "Create Skill"
          )}
        </button>
      </form>
    </div>
  );
}
