import * as Sentry from "@sentry/node";
import { getEnv } from "../config/env.js";

let initialized = false;

export function initSentry(): void {
  const env = getEnv();
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: env.NODE_ENV,
    release: process.env.SENTRY_RELEASE || `api@${process.env.npm_package_version || "0.0.0"}`,
    tracesSampleRate: env.NODE_ENV === "production" ? 0.2 : 1.0,

    // Strip PII — never send user emails
    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });

  initialized = true;
}

export function captureException(error: unknown, hint?: { extra?: Record<string, unknown> }): void {
  if (initialized) {
    Sentry.captureException(error, hint);
  }
}

export function isSentryEnabled(): boolean {
  return initialized;
}
