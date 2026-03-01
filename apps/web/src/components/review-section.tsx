"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reviews as reviewsApi } from "@/lib/api";
import type { ReviewSummary } from "@skills-hub/shared";
import { ReviewCard } from "./review-card";

export function ReviewSection({
  slug,
  reviewCount,
  reviewList,
  authUsername,
  skillAuthorUsername,
  isAuthenticated,
  hasMoreReviews = false,
  isFetchingMoreReviews = false,
  onLoadMoreReviews,
}: {
  slug: string;
  reviewCount: number;
  reviewList: ReviewSummary[] | undefined;
  authUsername: string | undefined;
  skillAuthorUsername: string;
  isAuthenticated: boolean;
  hasMoreReviews?: boolean;
  isFetchingMoreReviews?: boolean;
  onLoadMoreReviews?: () => void;
}) {
  const queryClient = useQueryClient();
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

  return (
    <section aria-labelledby="reviews-heading">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="reviews-heading" className="text-xl font-bold">
          Reviews ({reviewCount})
        </h2>
        {isAuthenticated && !showReviewForm && !reviewList?.some((r) => r.author.username === authUsername) && (
          <button
            onClick={() => setShowReviewForm(true)}
            className="min-h-[44px] rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90"
          >
            Write a Review
          </button>
        )}
      </div>

      {/* Review form */}
      {showReviewForm && (
        <div className="mb-6 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          {reviewError && (
            <p role="alert" className="mb-3 text-sm text-red-600">{reviewError}</p>
          )}
          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium" id="rating-label">Rating</label>
            <div className="flex gap-1" role="radiogroup" aria-labelledby="rating-label">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={reviewForm.rating === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onClick={() => setReviewForm({ ...reviewForm, rating: n })}
                  className={`min-h-[44px] min-w-[44px] rounded px-2 py-1 text-xl transition-colors hover:bg-[var(--accent)] ${n <= reviewForm.rating ? "text-yellow-500" : "text-gray-300 dark:text-gray-600"}`}
                >
                  {"\u2605"}
                </button>
              ))}
              <span className="ml-2 self-center text-sm text-[var(--muted)]">{reviewForm.rating}/5</span>
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor="review-title" className="mb-1 block text-sm font-medium">Title (optional)</label>
            <input
              id="review-title"
              type="text"
              value={reviewForm.title}
              onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              placeholder="Summary of your review"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="review-body" className="mb-1 block text-sm font-medium">Review</label>
            <textarea
              id="review-body"
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
              className="min-h-[44px] rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {submitReview.isPending ? "Submitting..." : "Submit Review"}
            </button>
            <button
              onClick={() => { setShowReviewForm(false); setReviewError(""); }}
              className="min-h-[44px] rounded-lg bg-[var(--accent)] px-4 py-2 text-sm transition-colors hover:bg-[var(--border)]"
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
          isReviewAuthor={review.author.username === authUsername}
          isSkillAuthor={skillAuthorUsername === authUsername}
          isAuthenticated={isAuthenticated}
        />
      ))}
      {hasMoreReviews && onLoadMoreReviews && (
        <div className="mt-4 text-center">
          <button
            onClick={onLoadMoreReviews}
            disabled={isFetchingMoreReviews}
            className="min-h-[44px] rounded-lg border border-[var(--border)] px-6 py-2 text-sm transition-colors hover:bg-[var(--accent)] disabled:opacity-50"
          >
            {isFetchingMoreReviews ? "Loading..." : "Load More Reviews"}
          </button>
        </div>
      )}
    </section>
  );
}
