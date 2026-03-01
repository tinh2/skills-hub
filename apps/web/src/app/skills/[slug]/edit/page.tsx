"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { skills as skillsApi, versions } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { CATEGORIES, PLATFORMS, PLATFORM_LABELS } from "@skills-hub/shared";
import type { Platform } from "@skills-hub/shared";

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

  if (isLoading) return <p className="text-[var(--muted)]">Loading...</p>;
  if (!skill) return <p className="text-red-600">Skill not found.</p>;

  const isOwner = skill.author.username === authUser?.username;
  if (!isOwner) return <p className="text-red-600">You can only edit your own skills.</p>;

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit: {skill.name}</h1>
        <div className="flex gap-2">
          {skill.status === "DRAFT" && (
            <button
              onClick={() => publishSkill.mutate()}
              disabled={publishSkill.isPending}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Publish
            </button>
          )}
          <button
            onClick={() => router.push(`/skills/${slug}`)}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm"
          >
            View Skill
          </button>
        </div>
      </div>

      {msg && (
        <p className={`mb-4 text-sm ${msg.includes("updated") || msg.includes("created") || msg.includes("published") ? "text-green-600" : "text-red-600"}`}>
          {msg}
        </p>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b border-[var(--border)]">
        <button
          onClick={() => setTab("metadata")}
          className={`border-b-2 pb-2 text-sm font-medium ${tab === "metadata" ? "border-[var(--primary)] text-[var(--foreground)]" : "border-transparent text-[var(--muted)]"}`}
        >
          Metadata
        </button>
        <button
          onClick={() => setTab("version")}
          className={`border-b-2 pb-2 text-sm font-medium ${tab === "version" ? "border-[var(--primary)] text-[var(--foreground)]" : "border-transparent text-[var(--muted)]"}`}
        >
          New Version
        </button>
      </div>

      {/* Metadata Tab */}
      {tab === "metadata" && (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              rows={3}
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Category</label>
            <select
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
            <label className="mb-1 block text-sm font-medium">Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            >
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
              <option value="UNLISTED">Unlisted</option>
            </select>
          </div>

          <button
            onClick={() => updateSkill.mutate()}
            disabled={updateSkill.isPending}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] disabled:opacity-50"
          >
            {updateSkill.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {/* Version Tab */}
      {tab === "version" && (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
          <p className="mb-4 text-sm text-[var(--muted)]">
            Current version: <span className="font-medium">v{skill.latestVersion}</span>
          </p>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Version Number</label>
            <input
              type="text"
              value={versionNum}
              onChange={(e) => setVersionNum(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              placeholder="1.1.0"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-mono"
              rows={12}
              placeholder="Skill instructions (Markdown)"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Changelog (optional)</label>
            <textarea
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
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] disabled:opacity-50"
          >
            {createVersion.isPending ? "Creating..." : "Create Version"}
          </button>
        </div>
      )}
    </div>
  );
}
