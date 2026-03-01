"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reviews as reviewsApi } from "@/lib/api";

export function ReviewCard({
  review,
  slug,
  isReviewAuthor,
  isSkillAuthor,
  isAuthenticated,
}: {
  review: any;
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
    <div className="mb-4 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">{review.author.username}</span>
          <span className="text-sm text-[var(--muted)]">{review.rating}/5</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted)]">
            {new Date(review.createdAt).toLocaleDateString()}
          </span>
          {isReviewAuthor && (
            <button
              onClick={() => {
                if (confirm("Delete your review?")) deleteReview.mutate();
              }}
              className="text-xs text-red-600 hover:underline"
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
        <div className="mt-2 flex items-center gap-3 text-xs text-[var(--muted)]">
          <span>Helpful?</span>
          <button onClick={() => voteReview.mutate(true)} className="hover:text-green-600">
            Yes{review.helpfulCount > 0 ? ` (${review.helpfulCount})` : ""}
          </button>
          <button onClick={() => voteReview.mutate(false)} className="hover:text-red-600">
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
          className="mt-2 text-xs text-[var(--primary)] hover:underline"
        >
          Respond to review
        </button>
      )}
      {showResponse && (
        <div className="mt-3">
          <textarea
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
              className="rounded bg-[var(--primary)] px-3 py-1 text-xs text-[var(--primary-foreground)] disabled:opacity-50"
            >
              Submit
            </button>
            <button
              onClick={() => setShowResponse(false)}
              className="rounded bg-[var(--accent)] px-3 py-1 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
