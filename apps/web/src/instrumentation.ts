import * as Sentry from "@sentry/nextjs";

export function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (dsn) {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

      // Strip PII — never send user emails
      beforeSend(event) {
        if (event.user) {
          delete event.user.email;
          delete event.user.ip_address;
        }
        return event;
      },
    });
  }
}

// Capture errors from nested React Server Components
export const onRequestError = Sentry.captureRequestError;
