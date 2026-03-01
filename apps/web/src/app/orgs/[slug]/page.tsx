"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { orgs as orgsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { SkillCard } from "@/components/skill-card";
import Image from "next/image";

export default function OrgDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuthStore();

  const { data: org, isLoading } = useQuery({
    queryKey: ["org", slug],
    queryFn: () => orgsApi.get(slug),
  });

  const { data: skillsData } = useQuery({
    queryKey: ["orgSkills", slug],
    queryFn: () => orgsApi.skills(slug, { limit: 50 }),
    enabled: !!org?.currentUserRole,
  });

  const { data: membersData } = useQuery({
    queryKey: ["orgMembers", slug],
    queryFn: () => orgsApi.members(slug, { limit: 10 }),
    enabled: !!org?.currentUserRole,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <span className="loading-spinner" aria-hidden="true" />
      <span className="ml-3 text-[var(--muted)]">Loading organization...</span>
    </div>
  );
  if (!org) return <p className="text-red-600">Organization not found.</p>;

  const isAdmin = org.currentUserRole === "ADMIN";
  const isMember = !!org.currentUserRole;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            {org.avatarUrl && (
              <Image src={org.avatarUrl} alt={`${org.name} logo`} width={48} height={48} className="rounded-full" />
            )}
            <div>
              <h1 className="text-3xl font-bold">{org.name}</h1>
              <p className="text-sm text-[var(--muted)]">@{org.slug}</p>
            </div>
          </div>
          {org.description && (
            <p className="mt-3 text-[var(--muted)]">{org.description}</p>
          )}
          {org.githubOrg && (
            <p className="mt-1 text-sm text-[var(--muted)]">
              GitHub: {org.githubOrg}
            </p>
          )}
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Link
              href={`/orgs/${slug}/settings`}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm"
            >
              Settings
            </Link>
            <Link
              href={`/orgs/${slug}/analytics`}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm"
            >
              Analytics
            </Link>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 text-center">
          <p className="text-xl font-bold">{org.memberCount}</p>
          <p className="text-xs text-[var(--muted)]">Members</p>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 text-center">
          <p className="text-xl font-bold">{org.skillCount}</p>
          <p className="text-xs text-[var(--muted)]">Skills</p>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 text-center">
          <p className="text-xl font-bold">{org.totalInstalls.toLocaleString()}</p>
          <p className="text-xs text-[var(--muted)]">Total Installs</p>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 text-center">
          <p className="text-xl font-bold">{org.currentUserRole ?? "—"}</p>
          <p className="text-xs text-[var(--muted)]">Your Role</p>
        </div>
      </div>

      {/* Members preview */}
      {isMember && membersData && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Members</h2>
            <Link href={`/orgs/${slug}/members`} className="text-sm text-[var(--primary)] hover:underline">
              View all
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {membersData.data.map((m) => (
              <div
                key={m.user.id}
                className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-1.5"
              >
                {m.user.avatarUrl && (
                  <Image src={m.user.avatarUrl} alt={`${m.user.username}'s avatar`} width={20} height={20} className="rounded-full" />
                )}
                <Link href={`/u/${m.user.username}`} className="text-sm hover:underline">
                  {m.user.username}
                </Link>
                <span className="rounded bg-[var(--accent)] px-1 py-0.5 text-xs">{m.role}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Org Skills */}
      {isMember && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Organization Skills</h2>
          {skillsData && skillsData.data.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {skillsData.data.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center">
              <p className="text-[var(--muted)]">No organization skills yet.</p>
            </div>
          )}
        </section>
      )}

      {!isMember && !isAuthenticated && (
        <p className="text-[var(--muted)]">Sign in to view organization content.</p>
      )}
    </div>
  );
}
