"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth as authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!code || !state) {
      router.push("/?error=auth_failed");
      return;
    }

    authApi
      .callback(code, state)
      .then((result) => {
        login(result.user, result.accessToken);
        const redirect = sessionStorage.getItem("auth_redirect");
        sessionStorage.removeItem("auth_redirect");
        const safePath = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
        router.push(safePath);
      })
      .catch(() => {
        router.push("/?error=auth_failed");
      });
  }, [searchParams, router, login]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
      <span className="loading-spinner mb-4" aria-hidden="true" style={{ width: 32, height: 32 }} />
      <p className="text-lg font-medium">Signing you in...</p>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Please wait while we complete your GitHub authentication.
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
          <span className="loading-spinner mb-4" aria-hidden="true" style={{ width: 32, height: 32 }} />
          <p className="text-lg font-medium">Loading...</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
