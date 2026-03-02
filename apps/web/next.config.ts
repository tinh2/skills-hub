import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@skills-hub-ai/shared", "@skills-hub-ai/skill-parser"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  async headers() {
    const connectSrc = [
      "'self'",
      apiUrl,
      "https://*.sentry.io",
      ...(isDev ? ["http://localhost:*"] : []),
    ].join(" ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(!isDev
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://avatars.githubusercontent.com",
              "font-src 'self'",
              `connect-src ${connectSrc}`,
              "frame-src https://www.youtube.com https://youtube.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
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
