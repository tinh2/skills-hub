import type { Metadata } from "next";
import "@/styles/globals.css";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "skills-hub.ai — Claude Code Skill Marketplace",
  description:
    "Discover, share, and install Claude Code skills. Browse quality-scored skills from the community.",
  openGraph: {
    title: "skills-hub.ai",
    description: "The marketplace for Claude Code skills",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <Providers>
          <a href="#main-content" className="skip-to-content">
            Skip to main content
          </a>
          <Header />
          <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
