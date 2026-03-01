"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import { auth } from "@/lib/api";

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-[var(--primary)]">
            skills-hub.ai
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-6 sm:flex">
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
          {/* Desktop nav */}
          <div className="hidden items-center gap-4 sm:flex">
            {isAuthenticated ? (
              <>
                <Link
                  href="/publish"
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)]"
                >
                  Publish Skill
                </Link>
                <Link
                  href="/dashboard"
                  className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings"
                  className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Settings
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
              </>
            ) : (
              <button
                onClick={() => {
                  sessionStorage.setItem("auth_redirect", window.location.pathname);
                  auth.githubLogin();
                }}
                className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)]"
              >
                Sign in with GitHub
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded p-2 text-[var(--muted)] hover:text-[var(--foreground)] sm:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav id="mobile-nav" className="border-t border-[var(--border)] px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-3">
            <Link href="/browse" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]" onClick={() => setMobileOpen(false)}>
              Browse
            </Link>
            <Link href="/categories" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]" onClick={() => setMobileOpen(false)}>
              Categories
            </Link>
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]" onClick={() => setMobileOpen(false)}>
                  Dashboard
                </Link>
                <Link href="/publish" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]" onClick={() => setMobileOpen(false)}>
                  Publish Skill
                </Link>
                <Link href={`/u/${user?.username}`} className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]" onClick={() => setMobileOpen(false)}>
                  Profile
                </Link>
                <Link href="/settings" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]" onClick={() => setMobileOpen(false)}>
                  Settings
                </Link>
                <button
                  onClick={() => { auth.logout(); logout(); setMobileOpen(false); }}
                  className="text-left text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  sessionStorage.setItem("auth_redirect", window.location.pathname);
                  auth.githubLogin();
                  setMobileOpen(false);
                }}
                className="text-left text-sm font-medium text-[var(--foreground)]"
              >
                Sign in with GitHub
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
