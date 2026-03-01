import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-3">
          <nav aria-labelledby="footer-product">
            <h3 id="footer-product" className="mb-3 text-sm font-semibold">Product</h3>
            <ul className="space-y-2">
              <li><Link href="/browse" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">Browse Skills</Link></li>
              <li><Link href="/categories" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">Categories</Link></li>
              <li><Link href="/publish" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">Publish a Skill</Link></li>
            </ul>
          </nav>
          <nav aria-labelledby="footer-developers">
            <h3 id="footer-developers" className="mb-3 text-sm font-semibold">Developers</h3>
            <ul className="space-y-2">
              <li><Link href="/docs/getting-started" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">Getting Started</Link></li>
              <li><a href="https://github.com/tinh2/skills-hub" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">GitHub</a></li>
              <li><Link href="/about" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">About</Link></li>
            </ul>
          </nav>
          <nav aria-labelledby="footer-legal">
            <h3 id="footer-legal" className="mb-3 text-sm font-semibold">Legal</h3>
            <ul className="space-y-2">
              <li><Link href="/terms" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">Privacy Policy</Link></li>
            </ul>
          </nav>
        </div>
        <div className="mt-8 border-t border-[var(--border)] pt-6 text-center text-xs text-[var(--muted)]">
          &copy; {new Date().getFullYear()} skills-hub.ai
        </div>
      </div>
    </footer>
  );
}
