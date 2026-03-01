import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h1 className="mb-2 text-6xl font-bold text-[var(--muted)]">404</h1>
      <p className="mb-2 text-lg text-[var(--muted)]">Page not found</p>
      <p className="mb-6 max-w-md text-sm text-[var(--muted)]">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90"
        >
          Go Home
        </Link>
        <Link
          href="/browse"
          className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-6 py-3 text-sm transition-colors hover:bg-[var(--accent)]"
        >
          Browse Skills
        </Link>
      </div>
    </div>
  );
}
