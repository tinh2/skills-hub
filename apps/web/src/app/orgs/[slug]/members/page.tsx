"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orgs as orgsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { ORG_ROLES } from "@skills-hub/shared";

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
          <h2 className="mb-3 text-sm font-semibold">Invite Member</h2>
          {inviteError && <p className="mb-2 text-sm text-red-600">{inviteError}</p>}
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              placeholder="GitHub username"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
            <select
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
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] disabled:opacity-50"
            >
              Invite
            </button>
          </div>
        </section>
      )}

      {/* Pending invites */}
      {isAdmin && invitesData && invitesData.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold">Pending Invites ({invitesData.length})</h2>
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
                  className="text-xs text-red-600 hover:underline"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Members list */}
      {isLoading && <p className="text-[var(--muted)]">Loading...</p>}
      {membersData && (
        <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--card-border)] bg-[var(--card)]">
          {membersData.data.map((m) => (
            <div key={m.user.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                {m.user.avatarUrl && (
                  <img src={m.user.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
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
                    className="text-xs text-red-600 hover:underline"
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
