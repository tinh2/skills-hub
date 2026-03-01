import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — skills-hub.ai",
};

export default function PrivacyPage() {
  return (
    <div className="prose mx-auto max-w-3xl dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p className="text-[var(--muted)]">Last updated: February 2026</p>

      <h2>1. Information We Collect</h2>
      <p>
        When you sign in with GitHub, we collect your username, display name, avatar URL,
        and public profile information. We do not collect or store your GitHub password.
      </p>

      <h2>2. How We Use Your Information</h2>
      <p>
        We use your information to provide the service: displaying your profile,
        attributing skills you publish, and enabling community features like reviews.
      </p>

      <h2>3. Data Storage</h2>
      <p>
        Your data is stored in secure, encrypted databases. API keys are hashed before storage.
        GitHub access tokens are encrypted at rest.
      </p>

      <h2>4. Data Sharing</h2>
      <p>
        We do not sell your personal information. Your public profile (username, avatar, bio)
        is visible to other users. Your email is never exposed publicly.
      </p>

      <h2>5. Cookies</h2>
      <p>
        We use essential cookies for authentication (session tokens). We do not use
        tracking or advertising cookies.
      </p>

      <h2>6. Your Rights</h2>
      <p>
        You can request deletion of your account and associated data by contacting us.
        You can update your profile information at any time through the Settings page.
      </p>

      <h2>7. Contact</h2>
      <p>
        For privacy questions, open an issue on our GitHub repository or email the maintainers.
      </p>
    </div>
  );
}
