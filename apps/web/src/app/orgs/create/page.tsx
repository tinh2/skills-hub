"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { orgs } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "next/navigation";

export default function CreateOrgPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const createOrg = useMutation({
    mutationFn: () => orgs.create({ name, slug, description: description || undefined }),
    onSuccess: (org) => router.push(`/orgs/${org.slug}`),
    onError: (err: Error) => setError(err.message),
  });

  function handleNameChange(value: string) {
    setName(value);
    // Auto-generate slug from name
    const generated = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);
    setSlug(generated);
  }

  if (!isAuthenticated) {
    router.push("/");
    return null;
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-3xl font-bold">Create Organization</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Organization Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            placeholder="My Team"
            maxLength={100}
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            placeholder="my-team"
            maxLength={50}
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            URL: skills-hub.ai/orgs/{slug || "..."}
          </p>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            rows={3}
            placeholder="What does your organization do?"
            maxLength={500}
          />
        </div>

        <button
          onClick={() => createOrg.mutate()}
          disabled={createOrg.isPending || !name.trim() || !slug.trim()}
          className="w-full rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-50"
        >
          {createOrg.isPending ? "Creating..." : "Create Organization"}
        </button>
      </div>
    </div>
  );
}
