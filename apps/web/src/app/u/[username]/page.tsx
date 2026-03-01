"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { users, skills as skillsApi } from "@/lib/api";
import { SkillCard } from "@/components/skill-card";
import Image from "next/image";

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", username],
    queryFn: () => users.getProfile(username),
  });

  const { data: userSkills, isLoading: loadingSkills } = useQuery({
    queryKey: ["user-skills", username],
    queryFn: () => skillsApi.list({ author: username, sort: "newest", limit: 50 }),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="loading-spinner" aria-hidden="true" />
        <span className="ml-3 text-[var(--muted)]">Loading profile...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold">User not found</h1>
        <p className="mb-6 text-[var(--muted)]">This profile may have been removed or the username is incorrect.</p>
        <Link href="/browse" className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90">
          Browse Skills
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-6">
        {user.avatarUrl && (
          <Image
            src={user.avatarUrl}
            alt={`${user.username}'s avatar`}
            width={80}
            height={80}
            className="rounded-full"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">
            {user.displayName || user.username}
          </h1>
          <p className="text-[var(--muted)]">@{user.username}</p>
          {user.bio && <p className="mt-2 text-sm">{user.bio}</p>}
          <div className="mt-2 flex gap-4 text-sm text-[var(--muted)]">
            <span>{user.skillCount} skills</span>
            <span>{user.totalInstalls.toLocaleString()} total installs</span>
            <span>
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <section aria-labelledby="user-skills-heading">
        <h2 id="user-skills-heading" className="mb-4 text-xl font-bold">Published Skills</h2>
        {loadingSkills && (
          <div className="flex items-center justify-center py-8">
            <span className="loading-spinner" aria-hidden="true" />
            <span className="ml-3 text-[var(--muted)]">Loading skills...</span>
          </div>
        )}
        {userSkills && userSkills.data.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {userSkills.data.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        )}
        {userSkills && userSkills.data.length === 0 && (
          <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center">
            <p className="text-[var(--muted)]">No published skills yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
