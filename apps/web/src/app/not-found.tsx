import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h1 className="mb-2 text-6xl font-bold text-[var(--muted)]">404</h1>
      <p className="mb-6 text-lg text-[var(--muted)]">Page not found</p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)]"
        >
          Go Home
        </Link>
        <Link
          href="/browse"
          className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm"
        >
          Browse Skills
        </Link>
      </div>
    </div>
  );
}
