"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { skills as skillsApi, versions as versionsApi, reviews as reviewsApi, installs, likes } from "@/lib/api";
import { ReviewCard } from "@/components/review-card";
import { MediaGallery } from "@/components/media-gallery";
import { useAuthStore } from "@/lib/auth-store";
import { PLATFORM_LABELS } from "@skills-hub/shared";
import type { Platform, SkillDetail } from "@skills-hub/shared";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { zipSync, strToU8 } from "fflate";
import { buildSkillMd, triggerFileDownload, triggerBlobDownload } from "@/lib/download";

export default function SkillDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated, user: authUser } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: skill, isLoading } = useQuery({
    queryKey: ["skill", slug],
    queryFn: () => skillsApi.get(slug),
  });

  const { data: reviewList } = useQuery({
    queryKey: ["reviews", slug],
    queryFn: () => reviewsApi.list(slug),
    enabled: !!skill,
  });

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", body: "" });
  const [reviewError, setReviewError] = useState("");

  const submitReview = useMutation({
    mutationFn: () => reviewsApi.create(slug, reviewForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", slug] });
      queryClient.invalidateQueries({ queryKey: ["skill", slug] });
      setShowReviewForm(false);
      setReviewForm({ rating: 5, title: "", body: "" });
      setReviewError("");
    },
    onError: (err: Error) => setReviewError(err.message),
  });

  // Like toggle
  const toggleLike = useMutation({
    mutationFn: () => likes.toggle(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill", slug] });
    },
  });

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);

  // Install tracking
  const trackInstall = useMutation({
    mutationFn: () => installs.record(slug),
  });

  function handleCopyInstall() {
    const cmd = `npx skills-hub install ${skill?.slug}`;
    navigator.clipboard.writeText(cmd);
    trackInstall.mutate();
  }

  function handleDownloadSkillMd() {
    if (!skill) return;
    triggerFileDownload(buildSkillMd(skill), "SKILL.md");
  }

  async function handleDownloadVersion(version: string) {
    if (!skill) return;
    const detail = await versionsApi.get(slug, version);
    const content = buildSkillMd({ ...skill, instructions: detail.instructions, latestVersion: version });
    triggerFileDownload(content, `SKILL-v${version}.md`);
  }

  async function handleDownloadBundle() {
    if (!skill?.composition) return;
    setIsDownloading(true);
    try {
      // Fetch all child skills in parallel
      const children = await Promise.all(
        skill.composition.children.map((c) => skillsApi.get(c.skill.slug)),
      );

      // Build zip: root SKILL.md + each child in its own folder
      const files: Record<string, Uint8Array> = {
        "SKILL.md": strToU8(buildSkillMd(skill)),
      };
      for (const child of children) {
        files[`${child.slug}/SKILL.md`] = strToU8(buildSkillMd(child));
      }

      const zipped = zipSync(files, { level: 6 });
      const buf = new Uint8Array(zipped.length);
      buf.set(zipped);
      const blob = new Blob([buf], { type: "application/zip" });
      triggerBlobDownload(blob, `${skill.slug}.zip`);
    } finally {
      setIsDownloading(false);
    }
  }

  if (isLoading) {
    return <p className="text-[var(--muted)]">Loading skill...</p>;
  }

  if (!skill) {
    return <p className="text-[var(--error)]">Skill not found.</p>;
  }

  const installCmd = `npx skills-hub install ${skill.slug}`;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Main content */}
      <div className="lg:col-span-2">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{skill.name}</h1>
              {skill.isComposition && (
                <span className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                  Composition
                </span>
              )}
              {skill.visibility !== "PUBLIC" && (
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                  {skill.visibility === "PRIVATE" ? "Private" : "Unlisted"}
                </span>
              )}
            </div>
            <p className="mt-1 text-[var(--muted)]">
              by{" "}
              <Link
                href={`/u/${skill.author.username}`}
                className="text-[var(--primary)] hover:underline"
              >
                {skill.author.username}
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {skill.author.username === authUser?.username && (
              <Link
                href={`/skills/${slug}/edit`}
                className="rounded-full border border-[var(--card-border)] px-3 py-1 text-sm hover:bg-[var(--accent)]"
              >
                Edit
              </Link>
            )}
            {isAuthenticated && (
              <button
                onClick={() => toggleLike.mutate()}
                disabled={toggleLike.isPending}
                className="flex items-center gap-1 rounded-full border border-[var(--card-border)] px-3 py-1 text-sm hover:bg-[var(--accent)] disabled:opacity-50"
                aria-label={skill.userLiked ? "Unlike skill" : "Like skill"}
              >
                <span className={skill.userLiked ? "text-red-500" : ""}>{skill.userLiked ? "\u2665" : "\u2661"}</span>
                <span>{skill.likeCount}</span>
              </button>
            )}
            {!isAuthenticated && (
              <span className="flex items-center gap-1 rounded-full border border-[var(--card-border)] px-3 py-1 text-sm text-[var(--muted)]">
                {"\u2661"} {skill.likeCount}
              </span>
            )}
            {skill.qualityScore !== null && (
              <div
                className={`rounded-full px-3 py-1 text-sm font-bold ${
                  skill.qualityScore >= 70
                    ? "bg-green-100 text-green-800"
                    : skill.qualityScore >= 40
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                Quality: {skill.qualityScore}/100
              </div>
            )}
          </div>
        </div>

        <p className="mb-6 text-lg text-[var(--muted)]">{skill.description}</p>

        {/* Install command */}
        <div className="mb-8 rounded-lg bg-[var(--accent)] p-4">
          <p className="mb-2 text-sm font-medium">Install</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-[var(--background)] px-3 py-2 text-sm">
              {installCmd}
            </code>
            <button
              onClick={handleCopyInstall}
              aria-label="Copy install command to clipboard"
              className="rounded bg-[var(--primary)] px-3 py-2 text-sm text-[var(--primary-foreground)]"
            >
              Copy
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-[var(--card-border)] pt-3">
            <span className="text-xs text-[var(--muted)]">Or download directly:</span>
            <button
              onClick={handleDownloadSkillMd}
              className="rounded border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--card)]"
            >
              Download SKILL.md
            </button>
            {skill.composition && (
              <button
                onClick={handleDownloadBundle}
                disabled={isDownloading}
                className="rounded border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--card)] disabled:opacity-50"
              >
                {isDownloading ? "Bundling..." : "Download All (.zip)"}
              </button>
            )}
          </div>
        </div>

        {/* Composition */}
        {skill.composition && (
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-bold">Composed Skills</h2>
            {skill.composition.description && (
              <p className="mb-3 text-sm text-[var(--muted)]">
                {skill.composition.description}
              </p>
            )}
            <div className="space-y-2">
              {skill.composition.children.map((child) => (
                <div
                  key={child.skill.slug}
                  className="flex items-center gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-medium">
                    {child.sortOrder + 1}
                  </span>
                  <Link
                    href={`/skills/${child.skill.slug}`}
                    className="font-medium text-[var(--primary)] hover:underline"
                  >
                    {child.skill.name}
                  </Link>
                  {child.isParallel && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                      parallel
                    </span>
                  )}
                  {child.skill.qualityScore !== null && (
                    <span className="ml-auto text-xs text-[var(--muted)]">
                      Score: {child.skill.qualityScore}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Instructions */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-bold">Instructions</h2>
          <div className="prose max-w-none rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {skill.instructions}
            </ReactMarkdown>
          </div>
        </section>

        {/* Media */}
        <MediaGallery
          mediaItems={skill.media}
          slug={slug}
          isAuthor={skill.author.username === authUser?.username}
        />

        {/* Reviews */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">
              Reviews ({skill.reviewCount})
            </h2>
            {isAuthenticated && !showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)]"
              >
                Write a Review
              </button>
            )}
          </div>

          {/* Review form */}
          {showReviewForm && (
            <div className="mb-6 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
              {reviewError && (
                <p className="mb-3 text-sm text-red-600">{reviewError}</p>
              )}
              <div className="mb-3">
                <label className="mb-1 block text-sm font-medium">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: n })}
                      className={`px-2 py-1 text-lg ${n <= reviewForm.rating ? "text-yellow-500" : "text-gray-300"}`}
                    >
                      *
                    </button>
                  ))}
                  <span className="ml-2 self-center text-sm text-[var(--muted)]">{reviewForm.rating}/5</span>
                </div>
              </div>
              <div className="mb-3">
                <label className="mb-1 block text-sm font-medium">Title (optional)</label>
                <input
                  type="text"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  placeholder="Summary of your review"
                />
              </div>
              <div className="mb-3">
                <label className="mb-1 block text-sm font-medium">Review</label>
                <textarea
                  value={reviewForm.body}
                  onChange={(e) => setReviewForm({ ...reviewForm, body: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  rows={4}
                  placeholder="Share your experience with this skill..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => submitReview.mutate()}
                  disabled={submitReview.isPending}
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] disabled:opacity-50"
                >
                  {submitReview.isPending ? "Submitting..." : "Submit Review"}
                </button>
                <button
                  onClick={() => { setShowReviewForm(false); setReviewError(""); }}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {reviewList?.length === 0 && (
            <p className="text-[var(--muted)]">No reviews yet. Be the first to review this skill.</p>
          )}
          {reviewList?.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              slug={slug}
              isReviewAuthor={review.author.username === authUser?.username}
              isSkillAuthor={skill.author.username === authUser?.username}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </section>
      </div>

      {/* Sidebar */}
      <aside className="space-y-6">
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Version</dt>
              <dd className="font-medium">v{skill.latestVersion}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Category</dt>
              <dd>
                <Link
                  href={`/browse?category=${skill.category.slug}`}
                  className="text-[var(--primary)] hover:underline"
                >
                  {skill.category.name}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Installs</dt>
              <dd className="font-medium">
                {skill.installCount.toLocaleString()}
              </dd>
            </div>
            {skill.avgRating !== null && (
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">Rating</dt>
                <dd className="font-medium">
                  {skill.avgRating.toFixed(1)}/5 ({skill.reviewCount} reviews)
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Platforms</dt>
              <dd>
                {skill.platforms
                  .map((p) => PLATFORM_LABELS[p as Platform])
                  .join(", ")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Visibility</dt>
              <dd>{skill.visibility}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Published</dt>
              <dd>{new Date(skill.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        {/* Tags */}
        {skill.tags.length > 0 && (
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
            <h3 className="mb-3 text-sm font-medium">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {skill.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/browse?q=${tag}`}
                  className="rounded bg-[var(--accent)] px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Version history */}
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
          <h3 className="mb-3 text-sm font-medium">Version History</h3>
          <ul className="space-y-2">
            {skill.versions.slice(0, 5).map((v, i) => (
              <li key={v.id} className="flex items-start justify-between text-sm">
                <div>
                  <span className="font-medium">v{v.version}</span>
                  <span className="ml-2 text-xs text-[var(--muted)]">
                    {new Date(v.createdAt).toLocaleDateString()}
                  </span>
                  {v.changelog && (
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {v.changelog}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => i === 0 ? handleDownloadSkillMd() : handleDownloadVersion(v.version)}
                  className="ml-2 shrink-0 text-xs text-[var(--primary)] hover:underline"
                  aria-label={`Download version ${v.version}`}
                  title={`Download v${v.version}`}
                >
                  .md
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* GitHub link */}
        {skill.githubRepoUrl && (
          <a
            href={skill.githubRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 text-center text-sm text-[var(--primary)] hover:underline"
          >
            View on GitHub
          </a>
        )}
      </aside>
    </div>
  );
}
