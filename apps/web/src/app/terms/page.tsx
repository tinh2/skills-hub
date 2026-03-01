import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — skills-hub.ai",
};

export default function TermsPage() {
  return (
    <div className="prose mx-auto max-w-3xl dark:prose-invert">
      <h1>Terms of Service</h1>
      <p className="text-[var(--muted)]">Last updated: February 2026</p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using skills-hub.ai, you agree to be bound by these Terms of Service.
        If you do not agree, do not use the service.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        skills-hub.ai is a marketplace for discovering, sharing, and installing Claude Code skills.
        We provide tools for publishing, versioning, and distributing skill packages.
      </p>

      <h2>3. User Accounts</h2>
      <p>
        You must sign in with a valid GitHub account. You are responsible for all activity under your account.
        Do not share your API keys or access tokens.
      </p>

      <h2>4. Content and Conduct</h2>
      <p>
        You retain ownership of skills you publish. By publishing, you grant skills-hub.ai a license to
        display and distribute your content. You must not publish malicious, harmful, or illegal content.
      </p>

      <h2>5. Intellectual Property</h2>
      <p>
        Skills published on the platform remain the intellectual property of their authors.
        The skills-hub.ai platform, branding, and infrastructure are owned by skills-hub.ai.
      </p>

      <h2>6. Limitation of Liability</h2>
      <p>
        skills-hub.ai is provided &ldquo;as is&rdquo; without warranties. We are not liable for any damages
        arising from the use of skills published on the platform.
      </p>

      <h2>7. Changes to Terms</h2>
      <p>
        We may update these terms at any time. Continued use constitutes acceptance of the updated terms.
      </p>
    </div>
  );
}
