"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import { auth } from "@/lib/api";

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-[var(--primary)]">
            skills-hub.ai
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-2 sm:flex">
            <Link
              href="/browse"
              className="inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
            >
              Browse
            </Link>
            <Link
              href="/categories"
              className="inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
            >
              Categories
            </Link>
            <Link
              href="/docs/getting-started"
              className="inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
            >
              Docs
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
                  className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90"
                >
                  Publish Skill
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                >
                  Dashboard
                </Link>
                <div ref={menuRef} className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                    aria-expanded={menuOpen}
                    aria-haspopup="true"
                  >
                    {user?.displayName || user?.username}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg">
                      <Link
                        href={`/u/${user?.username}`}
                        className="flex min-h-[44px] items-center px-4 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                        onClick={() => setMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        href="/settings"
                        className="flex min-h-[44px] items-center px-4 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                        onClick={() => setMenuOpen(false)}
                      >
                        Settings
                      </Link>
                      <button
                        onClick={() => {
                          auth.logout().catch(() => {});
                          logout();
                          setMenuOpen(false);
                        }}
                        className="flex min-h-[44px] w-full items-center px-4 text-left text-sm text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={() => {
                  sessionStorage.setItem("auth_redirect", window.location.pathname);
                  auth.githubLogin();
                }}
                className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)] transition-colors hover:opacity-90"
              >
                Sign in with GitHub
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] sm:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
        <nav id="mobile-nav" aria-label="Mobile navigation" className="border-t border-[var(--border)] px-4 py-2 sm:hidden">
          <div className="flex flex-col gap-1">
            <Link href="/browse" className="flex min-h-[44px] items-center rounded-lg px-3 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]" onClick={() => setMobileOpen(false)}>
              Browse
            </Link>
            <Link href="/categories" className="flex min-h-[44px] items-center rounded-lg px-3 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]" onClick={() => setMobileOpen(false)}>
              Categories
            </Link>
            <Link href="/docs/getting-started" className="flex min-h-[44px] items-center rounded-lg px-3 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]" onClick={() => setMobileOpen(false)}>
              Docs
            </Link>
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" className="flex min-h-[44px] items-center rounded-lg px-3 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]" onClick={() => setMobileOpen(false)}>
                  Dashboard
                </Link>
                <Link href="/publish" className="flex min-h-[44px] items-center rounded-lg px-3 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]" onClick={() => setMobileOpen(false)}>
                  Publish Skill
                </Link>
                <Link href={`/u/${user?.username}`} className="flex min-h-[44px] items-center rounded-lg px-3 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]" onClick={() => setMobileOpen(false)}>
                  {user?.displayName || user?.username}
                </Link>
                <Link href="/settings" className="flex min-h-[44px] items-center rounded-lg px-3 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]" onClick={() => setMobileOpen(false)}>
                  Settings
                </Link>
                <button
                  onClick={() => { auth.logout().catch(() => {}); logout(); setMobileOpen(false); }}
                  className="flex min-h-[44px] items-center rounded-lg px-3 text-left text-sm text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
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
                className="flex min-h-[44px] items-center rounded-lg px-3 text-left text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
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
