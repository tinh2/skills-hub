"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { skills as skillsApi, versions } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { CATEGORIES, PLATFORMS, PLATFORM_LABELS } from "@skills-hub-ai/shared";
import type { Platform } from "@skills-hub-ai/shared";

export default function EditSkillPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated, user: authUser } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: skill, isLoading } = useQuery({
    queryKey: ["skill", slug],
    queryFn: () => skillsApi.get(slug),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [visibility, setVisibility] = useState("PUBLIC");
  const [tags, setTags] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<"metadata" | "version">("metadata");

  // Version form
  const [versionNum, setVersionNum] = useState("");
  const [instructions, setInstructions] = useState("");
  const [changelog, setChangelog] = useState("");

  if (skill && !initialized) {
    setName(skill.name);
    setDescription(skill.description);
    setCategorySlug(skill.category.slug);
    setSelectedPlatforms(skill.platforms);
    setVisibility(skill.visibility);
    setTags(skill.tags?.join(", ") || "");
    setInstructions(skill.instructions);
    setInitialized(true);
  }

  const updateSkill = useMutation({
    mutationFn: () => skillsApi.update(slug, {
      name: name !== skill?.name ? name : undefined,
      description: description !== skill?.description ? description : undefined,
      categorySlug: categorySlug !== skill?.category.slug ? categorySlug : undefined,
      platforms: selectedPlatforms,
      visibility,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      setMsg("Skill updated");
      queryClient.invalidateQueries({ queryKey: ["skill", slug] });
      setTimeout(() => setMsg(""), 3000);
    },
    onError: (err: Error) => setMsg(err.message),
  });

  const createVersion = useMutation({
    mutationFn: () => versions.create(slug, {
      version: versionNum,
      instructions,
      changelog: changelog || undefined,
    }),
    onSuccess: () => {
      setMsg("New version created");
      setVersionNum("");
      setInstructions("");
      setChangelog("");
      queryClient.invalidateQueries({ queryKey: ["skill", slug] });
      setTimeout(() => setMsg(""), 3000);
    },
    onError: (err: Error) => setMsg(err.message),
  });

  const publishSkill = useMutation({
    mutationFn: () => skillsApi.publish(slug),
    onSuccess: () => {
      setMsg("Skill published");
      queryClient.invalidateQueries({ queryKey: ["skill", slug] });
    },
    onError: (err: Error) => setMsg(err.message),
  });

  if (!isAuthenticated) {
    router.push("/");
    return null;
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <span className="loading-spinner" aria-hidden="true" />
      <span className="ml-3 text-[var(--muted)]">Loading skill...</span>
    </div>
  );
  if (!skill) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h1 className="mb-2 text-2xl font-bold">Skill not found</h1>
      <p className="mb-6 text-[var(--muted)]">This skill may have been removed or the URL is incorrect.</p>
      <Link href="/browse" className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90">
        Browse Skills
      </Link>
    </div>
  );

  const isOwner = skill.author.username === authUser?.username;
  if (!isOwner) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h1 className="mb-2 text-2xl font-bold">Access denied</h1>
      <p className="mb-6 text-[var(--muted)]">You can only edit skills you have authored.</p>
      <Link href={`/skills/${slug}`} className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90">
        View Skill
      </Link>
    </div>
  );

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit: {skill.name}</h1>
        <div className="flex gap-2">
          {skill.status === "DRAFT" && (
            <button
              onClick={() => publishSkill.mutate()}
              disabled={publishSkill.isPending}
              className="min-h-[44px] rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              Publish
            </button>
          )}
          <button
            onClick={() => router.push(`/skills/${slug}`)}
            className="min-h-[44px] rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm transition-colors hover:bg-[var(--accent)]"
          >
            View Skill
          </button>
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {msg && (
          <p role="status" className={`mb-4 text-sm ${msg.includes("updated") || msg.includes("created") || msg.includes("published") ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
            {msg}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Edit skill sections" className="mb-6 flex gap-4 border-b border-[var(--border)]">
        <button
          role="tab"
          aria-selected={tab === "metadata"}
          aria-controls="panel-metadata"
          id="tab-metadata"
          onClick={() => setTab("metadata")}
          className={`min-h-[44px] border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${tab === "metadata" ? "border-[var(--primary)] text-[var(--foreground)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}
        >
          Metadata
        </button>
        <button
          role="tab"
          aria-selected={tab === "version"}
          aria-controls="panel-version"
          id="tab-version"
          onClick={() => setTab("version")}
          className={`min-h-[44px] border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${tab === "version" ? "border-[var(--primary)] text-[var(--foreground)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}
        >
          New Version
        </button>
      </div>

      {/* Metadata Tab */}
      {tab === "metadata" && (
        <div role="tabpanel" id="panel-metadata" aria-labelledby="tab-metadata">
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
          <div className="mb-4">
            <label htmlFor="edit-name" className="mb-1 block text-sm font-medium">Name</label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="edit-description" className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              rows={3}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="edit-category" className="mb-1 block text-sm font-medium">Category</label>
            <select
              id="edit-category"
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <label key={p} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(p)}
                    onChange={() => togglePlatform(p)}
                    className="rounded"
                  />
                  {PLATFORM_LABELS[p as Platform]}
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="edit-visibility" className="mb-1 block text-sm font-medium">Visibility</label>
            <select
              id="edit-visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            >
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
              <option value="UNLISTED">Unlisted</option>
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="edit-tags" className="mb-1 block text-sm font-medium">Tags (comma-separated)</label>
            <input
              id="edit-tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              placeholder="testing, automation, flutter"
            />
          </div>

          <button
            onClick={() => updateSkill.mutate()}
            disabled={updateSkill.isPending}
            className="min-h-[44px] rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {updateSkill.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
        </div>
      )}

      {/* Version Tab */}
      {tab === "version" && (
        <div role="tabpanel" id="panel-version" aria-labelledby="tab-version">
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
          <p className="mb-4 text-sm text-[var(--muted)]">
            Current version: <span className="font-medium">v{skill.latestVersion}</span>
          </p>

          <div className="mb-4">
            <label htmlFor="version-number" className="mb-1 block text-sm font-medium">Version Number</label>
            <input
              id="version-number"
              type="text"
              pattern="^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$"
              title="Semver format required (e.g. 1.1.0)"
              value={versionNum}
              onChange={(e) => setVersionNum(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              placeholder="1.1.0"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="version-instructions" className="mb-1 block text-sm font-medium">Instructions</label>
            <textarea
              id="version-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-mono"
              rows={12}
              placeholder="Skill instructions (Markdown)"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="version-changelog" className="mb-1 block text-sm font-medium">Changelog (optional)</label>
            <textarea
              id="version-changelog"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              rows={3}
              placeholder="What changed in this version?"
            />
          </div>

          <button
            onClick={() => createVersion.mutate()}
            disabled={createVersion.isPending || !versionNum.trim() || !instructions.trim()}
            className="min-h-[44px] rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {createVersion.isPending ? "Creating..." : "Create Version"}
          </button>
        </div>
        </div>
      )}
    </div>
  );
}
