"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reviews as reviewsApi } from "@/lib/api";
import type { ReviewSummary } from "@skills-hub/shared";

export function ReviewCard({
  review,
  slug,
  isReviewAuthor,
  isSkillAuthor,
  isAuthenticated,
}: {
  review: ReviewSummary;
  slug: string;
  isReviewAuthor: boolean;
  isSkillAuthor: boolean;
  isAuthenticated: boolean;
}) {
  const queryClient = useQueryClient();
  const [showResponse, setShowResponse] = useState(false);
  const [responseBody, setResponseBody] = useState("");

  const voteReview = useMutation({
    mutationFn: (helpful: boolean) => reviewsApi.vote(review.id, helpful),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reviews", slug] }),
  });

  const deleteReview = useMutation({
    mutationFn: () => reviewsApi.remove(review.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reviews", slug] }),
  });

  const respondToReview = useMutation({
    mutationFn: () => reviewsApi.respond(review.id, responseBody),
    onSuccess: () => {
      setShowResponse(false);
      setResponseBody("");
      queryClient.invalidateQueries({ queryKey: ["reviews", slug] });
    },
  });

  return (
    <article className="mb-4 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">{review.author.username}</span>
          <span className="text-sm text-[var(--muted)]" aria-label={`Rating: ${review.rating} out of 5`}>
            <span aria-hidden="true">
              {"*".repeat(review.rating).split("").map((_, i) => (
                <span key={i} className="text-yellow-500">{"\u2605"}</span>
              ))}
              {"*".repeat(5 - review.rating).split("").map((_, i) => (
                <span key={i} className="text-gray-300 dark:text-gray-600">{"\u2605"}</span>
              ))}
            </span>
            <span className="ml-1">{review.rating}/5</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <time className="text-xs text-[var(--muted)]" dateTime={review.createdAt}>
            {new Date(review.createdAt).toLocaleDateString()}
          </time>
          {isReviewAuthor && (
            <button
              onClick={() => {
                if (confirm("Delete your review?")) deleteReview.mutate();
              }}
              disabled={deleteReview.isPending}
              className="min-h-[44px] min-w-[44px] rounded px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 hover:underline disabled:opacity-50 dark:hover:bg-red-950"
              aria-label="Delete your review"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      {review.title && <p className="mb-1 font-medium">{review.title}</p>}
      {review.body && <p className="text-sm text-[var(--muted)]">{review.body}</p>}

      {/* Vote buttons */}
      {isAuthenticated && !isReviewAuthor && (
        <div className="mt-2 flex items-center gap-1 text-xs text-[var(--muted)]">
          <span className="mr-1">Helpful?</span>
          <button
            onClick={() => voteReview.mutate(true)}
            disabled={voteReview.isPending}
            className="min-h-[44px] min-w-[44px] rounded px-3 py-1 transition-colors hover:bg-green-50 hover:text-green-600 disabled:opacity-50 dark:hover:bg-green-950"
            aria-label="Mark review as helpful"
          >
            Yes{review.helpfulCount > 0 ? ` (${review.helpfulCount})` : ""}
          </button>
          <button
            onClick={() => voteReview.mutate(false)}
            disabled={voteReview.isPending}
            className="min-h-[44px] min-w-[44px] rounded px-3 py-1 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950"
            aria-label="Mark review as not helpful"
          >
            No
          </button>
        </div>
      )}

      {/* Author response */}
      {review.response && (
        <div className="mt-3 rounded bg-[var(--accent)] p-3">
          <p className="text-xs font-medium">Author response:</p>
          <p className="text-sm text-[var(--muted)]">{review.response.body}</p>
        </div>
      )}

      {/* Respond button for skill author */}
      {isSkillAuthor && !review.response && !showResponse && (
        <button
          onClick={() => setShowResponse(true)}
          className="mt-2 min-h-[44px] rounded px-2 py-1 text-xs text-[var(--primary)] transition-colors hover:bg-[var(--accent)] hover:underline"
        >
          Respond to review
        </button>
      )}
      {showResponse && (
        <div className="mt-3">
          <label htmlFor={`response-${review.id}`} className="sr-only">Your response</label>
          <textarea
            id={`response-${review.id}`}
            value={responseBody}
            onChange={(e) => setResponseBody(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            rows={2}
            placeholder="Your response..."
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => respondToReview.mutate()}
              disabled={respondToReview.isPending || !responseBody.trim()}
              className="min-h-[44px] rounded bg-[var(--primary)] px-4 py-2 text-xs text-[var(--primary-foreground)] transition-colors hover:opacity-90 disabled:opacity-50"
            >
              Submit
            </button>
            <button
              onClick={() => setShowResponse(false)}
              className="min-h-[44px] rounded bg-[var(--accent)] px-4 py-2 text-xs transition-colors hover:bg-[var(--border)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
