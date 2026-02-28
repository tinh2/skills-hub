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
        router.push("/");
      })
      .catch(() => {
        router.push("/?error=auth_failed");
      });
  }, [searchParams, router, login]);

  return (
    <div className="py-16 text-center">
      <p className="text-[var(--muted)]">Signing you in...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center">
          <p className="text-[var(--muted)]">Loading...</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
