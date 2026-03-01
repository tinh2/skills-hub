"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { media as mediaApi } from "@/lib/api";
import type { MediaItem } from "@skills-hub/shared";

export function MediaGallery({
  mediaItems,
  slug,
  isAuthor,
}: {
  mediaItems: MediaItem[];
  slug: string;
  isAuthor: boolean;
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "SCREENSHOT" as "SCREENSHOT" | "YOUTUBE", url: "", caption: "" });
  const [error, setError] = useState("");

  const addMedia = useMutation({
    mutationFn: () => mediaApi.add(slug, { type: form.type, url: form.url, caption: form.caption || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill", slug] });
      setShowForm(false);
      setForm({ type: "SCREENSHOT", url: "", caption: "" });
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const removeMedia = useMutation({
    mutationFn: (mediaId: string) => mediaApi.remove(slug, mediaId),
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["skill", slug] });
    },
    onError: (err: Error) => setError(err.message),
  });

  if (mediaItems.length === 0 && !isAuthor) return null;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Media</h2>
        {isAuthor && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="min-h-[44px] rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:opacity-90"
          >
            Add Media
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
          <div className="mb-3">
            <label htmlFor="media-type" className="mb-1 block text-sm font-medium">Type</label>
            <select
              id="media-type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as "SCREENSHOT" | "YOUTUBE" })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            >
              <option value="SCREENSHOT">Screenshot</option>
              <option value="YOUTUBE">YouTube Video</option>
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="media-url" className="mb-1 block text-sm font-medium">URL</label>
            <input
              id="media-url"
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              placeholder={form.type === "SCREENSHOT" ? "https://i.imgur.com/example.png" : "https://www.youtube.com/watch?v=..."}
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              {form.type === "SCREENSHOT"
                ? "Allowed: imgur.com, raw.githubusercontent.com, user-images.githubusercontent.com"
                : "Allowed: youtube.com, youtu.be"}
            </p>
          </div>
          <div className="mb-3">
            <label htmlFor="media-caption" className="mb-1 block text-sm font-medium">Caption (optional)</label>
            <input
              id="media-caption"
              type="text"
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              placeholder="Brief description"
              maxLength={200}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => addMedia.mutate()}
              disabled={addMedia.isPending || !form.url}
              className="min-h-[44px] rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {addMedia.isPending ? "Adding..." : "Add Media"}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(""); }}
              className="min-h-[44px] rounded-lg bg-[var(--accent)] px-4 py-2 text-sm transition-colors hover:bg-[var(--border)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mediaItems.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {mediaItems.map((m) => (
            <div key={m.id} className="relative overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card)]">
              {isAuthor && (
                <button
                  onClick={() => {
                    if (confirm("Remove this media item?")) removeMedia.mutate(m.id);
                  }}
                  disabled={removeMedia.isPending}
                  className="absolute right-2 top-2 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-black/50 px-2 py-1 text-xs text-white transition-colors hover:bg-black/70 disabled:opacity-50"
                  aria-label={`Remove ${m.caption || "media item"}`}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M3 3l8 8M11 3l-8 8" />
                  </svg>
                </button>
              )}
              {m.type === "SCREENSHOT" ? (
                <img src={m.url} alt={m.caption || "Skill screenshot"} className="w-full" loading="lazy" />
              ) : (
                <div className="sm:col-span-2">
                  <iframe
                    src={m.url}
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    allowFullScreen
                    title={m.caption || "Skill video"}
                  />
                </div>
              )}
              {m.caption && (
                <p className="p-2 text-xs text-[var(--muted)]">{m.caption}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
