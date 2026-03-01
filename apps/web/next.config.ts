import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@skills-hub/shared", "@skills-hub/skill-parser"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/v1/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress Sentry build logs when no DSN/auth token is configured
  silent: true,
  // Disable source map upload (requires SENTRY_AUTH_TOKEN which we don't configure yet)
  sourcemaps: {
    disable: true,
  },
  // Disable telemetry to Sentry
  telemetry: false,
});
