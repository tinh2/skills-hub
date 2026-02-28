"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import { auth } from "@/lib/api";

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-[var(--primary)]">
            skills-hub.ai
          </Link>
          <nav className="hidden items-center gap-6 sm:flex">
            <Link
              href="/browse"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Browse
            </Link>
            <Link
              href="/categories"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Categories
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/browse"
            className="hidden text-sm text-[var(--muted)] hover:text-[var(--foreground)] sm:block"
          >
            Search
          </Link>
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link
                href="/publish"
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)]"
              >
                Publish Skill
              </Link>
              <Link
                href={`/u/${user?.username}`}
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                {user?.username}
              </Link>
              <button
                onClick={() => {
                  auth.logout();
                  logout();
                }}
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => auth.githubLogin()}
              className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)]"
            >
              Sign in with GitHub
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
