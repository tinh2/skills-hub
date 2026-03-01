"use client";

import { useParams } from "next/navigation";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { skills as skillsApi, reviews as reviewsApi, likes } from "@/lib/api";
import { MediaGallery } from "@/components/media-gallery";
import { InstallSection } from "@/components/install-section";
import { ReviewSection } from "@/components/review-section";
import { SkillSidebar } from "@/components/skill-sidebar";
import { useAuthStore } from "@/lib/auth-store";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeSanitize from "rehype-sanitize";

export default function SkillDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated, user: authUser } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: skill, isLoading, error: skillError } = useQuery({
    queryKey: ["skill", slug],
    queryFn: () => skillsApi.get(slug),
  });

  const {
    data: reviewPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["reviews", slug],
    queryFn: ({ pageParam }) => reviewsApi.list(slug, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
    enabled: !!skill,
  });

  const reviewList = reviewPages?.pages.flatMap((p) => p.data);

  const toggleLike = useMutation({
    mutationFn: () => likes.toggle(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill", slug] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="loading-spinner" aria-hidden="true" />
        <span className="ml-3 text-[var(--muted)]">Loading skill...</span>
      </div>
    );
  }

  if (skillError) {
    const is404 = skillError.message?.includes("not found") || skillError.message?.includes("404");
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold">{is404 ? "Skill not found" : "Something went wrong"}</h1>
        <p className="mb-6 text-[var(--muted)]">
          {is404
            ? "This skill may have been removed or the URL is incorrect."
            : "We couldn't load this skill. Please try again."}
        </p>
        <div className="flex gap-3">
          <Link href="/browse" className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90">
            Browse Skills
          </Link>
          {!is404 && (
            <button
              onClick={() => window.location.reload()}
              className="min-h-[44px] rounded-lg border border-[var(--border)] px-4 py-2 text-sm transition-colors hover:bg-[var(--accent)]"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold">Skill not found</h1>
        <p className="mb-6 text-[var(--muted)]">This skill may have been removed or the URL is incorrect.</p>
        <Link href="/browse" className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90">
          Browse Skills
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Main content */}
      <div className="lg:col-span-2">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{skill.name}</h1>
              {skill.isComposition && (
                <span className="rounded bg-[var(--primary)]/10 px-2 py-1 text-xs font-medium text-[var(--primary)]">
                  Composition
                </span>
              )}
              {skill.visibility !== "PUBLIC" && (
                <span className="rounded bg-[var(--accent)] px-2 py-1 text-xs font-medium text-[var(--muted)]">
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
                className="inline-flex min-h-[44px] items-center rounded-full border border-[var(--card-border)] px-4 py-2 text-sm transition-colors hover:bg-[var(--accent)]"
              >
                Edit
              </Link>
            )}
            {isAuthenticated && (
              <button
                onClick={() => toggleLike.mutate()}
                disabled={toggleLike.isPending}
                className="flex min-h-[44px] items-center gap-1 rounded-full border border-[var(--card-border)] px-4 py-2 text-sm transition-colors hover:bg-[var(--accent)] disabled:opacity-50"
                aria-label={skill.userLiked ? "Unlike skill" : "Like skill"}
              >
                <span className={skill.userLiked ? "text-red-500" : ""}>{skill.userLiked ? "\u2665" : "\u2661"}</span>
                <span>{skill.likeCount}</span>
              </button>
            )}
            {!isAuthenticated && (
              <span className="flex items-center gap-1 rounded-full border border-[var(--card-border)] px-3 py-1 text-sm text-[var(--muted)]" aria-label={`${skill.likeCount} likes`}>
                <span aria-hidden="true">{"\u2661"}</span> {skill.likeCount}
              </span>
            )}
            {skill.qualityScore !== null && (
              <div
                className={`rounded-full px-3 py-1 text-sm font-bold ${
                  skill.qualityScore >= 70
                    ? "bg-[var(--success-subtle)] text-[var(--success)]"
                    : skill.qualityScore >= 40
                      ? "bg-[var(--warning-subtle)] text-[var(--warning)]"
                      : "bg-[var(--error-subtle)] text-[var(--error)]"
                }`}
                aria-label={`Quality score: ${skill.qualityScore} out of 100`}
              >
                Quality: {skill.qualityScore}/100
              </div>
            )}
          </div>
        </div>

        <p className="mb-6 text-lg text-[var(--muted)]">{skill.description}</p>

        <InstallSection skill={skill} />

        {/* Composition */}
        {skill.composition && (
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold">Composed Skills</h2>
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
                    <span className="rounded bg-[var(--info-subtle)] px-1.5 py-0.5 text-xs text-[var(--info)]">
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
        <section aria-labelledby="instructions-heading" className="mb-8">
          <h2 id="instructions-heading" className="mb-4 text-lg font-semibold">Instructions</h2>
          <div className="prose max-w-none rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeSanitize]}>
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
        <ReviewSection
          slug={slug}
          reviewCount={skill.reviewCount}
          reviewList={reviewList}
          authUsername={authUser?.username}
          skillAuthorUsername={skill.author.username}
          isAuthenticated={isAuthenticated}
          hasMoreReviews={!!hasNextPage}
          isFetchingMoreReviews={isFetchingNextPage}
          onLoadMoreReviews={() => fetchNextPage()}
        />
      </div>

      {/* Sidebar */}
      <SkillSidebar skill={skill} />
    </div>
  );
}
