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
      <p className="mb-6 text-[var(--muted)]">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)]"
      >
        Try Again
      </button>
    </div>
  );
}
