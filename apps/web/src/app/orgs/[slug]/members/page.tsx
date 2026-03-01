"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orgs as orgsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { ORG_ROLES } from "@skills-hub/shared";
import Image from "next/image";

export default function OrgMembersPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: org } = useQuery({
    queryKey: ["org", slug],
    queryFn: () => orgsApi.get(slug),
    enabled: isAuthenticated,
  });

  const { data: membersData, isLoading } = useQuery({
    queryKey: ["orgMembers", slug, "all"],
    queryFn: () => orgsApi.members(slug, { limit: 100 }),
    enabled: !!org?.currentUserRole,
  });

  const { data: invitesData } = useQuery({
    queryKey: ["orgInvites", slug],
    queryFn: () => orgsApi.invites(slug),
    enabled: org?.currentUserRole === "ADMIN",
  });

  // Invite form
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviteError, setInviteError] = useState("");

  const inviteMember = useMutation({
    mutationFn: () => orgsApi.invite(slug, { username: inviteUsername, role: inviteRole }),
    onSuccess: () => {
      setInviteUsername("");
      setInviteError("");
      queryClient.invalidateQueries({ queryKey: ["orgInvites", slug] });
    },
    onError: (err: Error) => setInviteError(err.message),
  });

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      orgsApi.updateMemberRole(slug, userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orgMembers", slug] }),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => orgsApi.removeMember(slug, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orgMembers", slug] }),
  });

  const revokeInvite = useMutation({
    mutationFn: (inviteId: string) => orgsApi.revokeInvite(slug, inviteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orgInvites", slug] }),
  });

  if (!isAuthenticated) {
    router.push("/");
    return null;
  }

  const isAdmin = org?.currentUserRole === "ADMIN";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/orgs/${slug}`} className="text-sm text-[var(--primary)] hover:underline">
          {org?.name ?? slug}
        </Link>
        <span className="text-[var(--muted)]">/</span>
        <h1 className="text-2xl font-bold">Members</h1>
      </div>

      {/* Invite form (admin only) */}
      {isAdmin && (
        <section className="mb-8 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
          <h2 className="mb-3 text-lg font-semibold">Invite Member</h2>
          {inviteError && <p role="alert" className="mb-2 text-sm text-[var(--error)]">{inviteError}</p>}
          <div className="flex gap-2">
            <label htmlFor="invite-username" className="sr-only">GitHub username</label>
            <input
              id="invite-username"
              type="text"
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              placeholder="GitHub username"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
            <label htmlFor="invite-role" className="sr-only">Member role</label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            >
              {ORG_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button
              onClick={() => inviteMember.mutate()}
              disabled={inviteMember.isPending || !inviteUsername.trim()}
              className="min-h-[44px] rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:opacity-90 disabled:opacity-50"
            >
              Invite
            </button>
          </div>
        </section>
      )}

      {/* Pending invites */}
      {isAdmin && invitesData && invitesData.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Pending Invites ({invitesData.length})</h2>
          <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--card-border)] bg-[var(--card)]">
            {invitesData.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{inv.inviteeUsername ?? "Open invite"}</p>
                  <p className="text-xs text-[var(--muted)]">
                    Role: {inv.role} · Invited by {inv.invitedBy} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => revokeInvite.mutate(inv.id)}
                  disabled={revokeInvite.isPending}
                  className="min-h-[44px] min-w-[44px] rounded px-3 py-1 text-xs text-[var(--error)] transition-colors hover:bg-[var(--error-subtle)] hover:underline disabled:opacity-50"
                  aria-label={`Revoke invite for ${inv.inviteeUsername ?? "open invite"}`}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Members list */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <span className="loading-spinner" aria-hidden="true" />
          <span className="ml-3 text-[var(--muted)]">Loading members...</span>
        </div>
      )}
      {membersData && (
        <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--card-border)] bg-[var(--card)]">
          {membersData.data.map((m) => (
            <div key={m.user.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                {m.user.avatarUrl && (
                  <Image src={m.user.avatarUrl} alt={`${m.user.username}'s avatar`} width={32} height={32} className="rounded-full" />
                )}
                <div>
                  <Link href={`/u/${m.user.username}`} className="text-sm font-medium hover:underline">
                    {m.user.username}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">
                    Joined {new Date(m.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <select
                    value={m.role}
                    onChange={(e) => updateRole.mutate({ userId: m.user.id, role: e.target.value })}
                    className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                    aria-label={`Role for ${m.user.username}`}
                  >
                    {ORG_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ) : (
                  <span className="rounded bg-[var(--accent)] px-2 py-0.5 text-xs">{m.role}</span>
                )}
                {isAdmin && (
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${m.user.username}?`)) removeMember.mutate(m.user.id);
                    }}
                    disabled={removeMember.isPending}
                    className="min-h-[44px] min-w-[44px] rounded px-3 py-1 text-xs text-[var(--error)] transition-colors hover:bg-[var(--error-subtle)] hover:underline disabled:opacity-50"
                    aria-label={`Remove ${m.user.username}`}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
