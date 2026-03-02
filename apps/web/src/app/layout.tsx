import type { Metadata } from "next";
import "@/styles/globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "skills-hub.ai — AI Coding Skills Platform",
  description:
    "Discover, publish, test, and deploy reusable AI coding skills for Claude Code, Cursor, Codex CLI, and any MCP-compatible tool.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "skills-hub.ai",
    description: "The open platform for AI coding skills",
    type: "website",
    siteName: "skills-hub.ai",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://skills-hub.ai"),
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
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
