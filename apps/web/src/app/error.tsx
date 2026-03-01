"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h1 className="mb-2 text-4xl font-bold">Something went wrong</h1>
      <p className="mb-6 max-w-md text-[var(--muted)]">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="min-h-[44px] min-w-[44px] rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90"
        >
          Try Again
        </button>
        <a
          href="/"
          className="inline-flex min-h-[44px] min-w-[44px] items-center rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-6 py-3 text-sm font-medium transition-colors hover:bg-[var(--accent)]"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
