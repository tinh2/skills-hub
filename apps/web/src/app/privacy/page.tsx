import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — skills-hub.ai",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl py-12">
      <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-8 text-sm text-[var(--muted)]">Last updated: February 2026</p>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">1. Information We Collect</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          When you sign in with GitHub, we collect your username, display name, avatar URL,
          and public profile information. We do not collect or store your GitHub password.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">2. How We Use Your Information</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          We use your information to provide the service: displaying your profile,
          attributing skills you publish, and enabling community features like reviews.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">3. Data Storage</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          Your data is stored in secure databases. GitHub access tokens are encrypted
          at rest using AES-256-GCM. API keys are hashed before storage and cannot be
          retrieved in plaintext.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">4. Data Sharing</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          We do not sell your personal information. Your public profile (username, avatar, bio)
          is visible to other users. Your email is never exposed publicly.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">5. Cookies</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          We use essential cookies for authentication (session tokens). We do not use
          tracking or advertising cookies.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">6. Your Rights</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          You can request deletion of your account and associated data by contacting us.
          You can update your profile information at any time through the Settings page.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">7. Contact</h2>
        <p className="leading-relaxed text-[var(--muted)]">
          For privacy questions, contact us at{" "}
          <a href="mailto:privacy@skills-hub.ai" className="text-[var(--primary)] hover:underline">
            privacy@skills-hub.ai
          </a>.
        </p>
      </section>
    </div>
  );
}
