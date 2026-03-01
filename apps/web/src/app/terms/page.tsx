import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — skills-hub.ai",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl py-12">
      <h1 className="mb-2 text-3xl font-bold">Terms of Service</h1>
      <p className="mb-8 text-sm text-[var(--muted)]">Last updated: February 2026</p>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">1. Acceptance of Terms</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          By accessing or using skills-hub.ai, you agree to be bound by these Terms of Service.
          If you do not agree, do not use the service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">2. Description of Service</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          skills-hub.ai is a marketplace for discovering, sharing, and installing Claude Code skills.
          We provide tools for publishing, versioning, and distributing skill packages.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">3. User Accounts</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          You must sign in with a valid GitHub account. You are responsible for all activity under your account.
          Do not share your API keys or access tokens.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">4. Content and Conduct</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          You retain ownership of skills you publish. By publishing, you grant skills-hub.ai a license to
          display and distribute your content. You must not publish malicious, harmful, or illegal content.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">5. Intellectual Property</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          Skills published on the platform remain the intellectual property of their authors.
          The skills-hub.ai platform, branding, and infrastructure are owned by Team Bearie LLC.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">6. Limitation of Liability</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          skills-hub.ai is provided &ldquo;as is&rdquo; without warranties. We are not liable for any damages
          arising from the use of skills published on the platform.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">7. Changes to Terms</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          We may update these terms at any time. Continued use constitutes acceptance of the updated terms.
        </p>
      </section>
    </div>
  );
}
