"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { invites } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [result, setResult] = useState<"accepted" | "declined" | null>(null);
  const [error, setError] = useState("");

  const acceptInvite = useMutation({
    mutationFn: () => invites.accept(token),
    onSuccess: () => setResult("accepted"),
    onError: (err: Error) => setError(err.message),
  });

  const declineInvite = useMutation({
    mutationFn: () => invites.decline(token),
    onSuccess: () => setResult("declined"),
    onError: (err: Error) => setError(err.message),
  });

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-4 text-2xl font-bold">Organization Invite</h1>
        <p className="mb-4 text-[var(--muted)]">
          You need to sign in to accept this invitation.
        </p>
      </div>
    );
  }

  if (result === "accepted") {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-4 text-2xl font-bold">Invite Accepted</h1>
        <p className="mb-4 text-[var(--muted)]">
          You&apos;ve joined the organization.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="min-h-[44px] rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:opacity-90"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (result === "declined") {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-4 text-2xl font-bold">Invite Declined</h1>
        <p className="text-[var(--muted)]">You&apos;ve declined this invitation.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="mb-4 text-2xl font-bold">Organization Invite</h1>
      <p className="mb-6 text-[var(--muted)]">
        You&apos;ve been invited to join an organization.
      </p>

      {error && <p role="alert" className="mb-4 text-sm text-[var(--error)]">{error}</p>}

      <div className="flex justify-center gap-3">
        <button
          onClick={() => acceptInvite.mutate()}
          disabled={acceptInvite.isPending}
          className="min-h-[44px] rounded-lg bg-[var(--primary)] px-6 py-2 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {acceptInvite.isPending ? "Accepting..." : "Accept"}
        </button>
        <button
          onClick={() => declineInvite.mutate()}
          disabled={declineInvite.isPending}
          className="min-h-[44px] rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-6 py-2 text-sm transition-colors hover:bg-[var(--accent)] disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
