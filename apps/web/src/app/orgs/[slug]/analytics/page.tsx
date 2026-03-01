"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { orgs as orgsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function OrgAnalyticsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  const { data: org } = useQuery({
    queryKey: ["org", slug],
    queryFn: () => orgsApi.get(slug),
    enabled: isAuthenticated,
  });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["orgAnalytics", slug],
    queryFn: () => orgsApi.analytics(slug),
    enabled: !!org?.currentUserRole,
  });

  if (!isAuthenticated) {
    router.push("/");
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/orgs/${slug}`} className="text-sm text-[var(--primary)] hover:underline">
          {org?.name ?? slug}
        </Link>
        <span className="text-[var(--muted)]">/</span>
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      {isLoading && (
        <div className="flex items-center py-8">
          <span className="loading-spinner" aria-hidden="true" />
          <span className="ml-3 text-[var(--muted)]">Loading analytics...</span>
        </div>
      )}

      {analytics && (
        <>
          {/* Overview */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
              <p className="text-2xl font-bold">{analytics.totalSkills}</p>
              <p className="text-sm text-[var(--muted)]">Total Skills</p>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
              <p className="text-2xl font-bold">{analytics.totalInstalls.toLocaleString()}</p>
              <p className="text-sm text-[var(--muted)]">Total Installs</p>
            </div>
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
              <p className="text-2xl font-bold">{analytics.activeMembers}</p>
              <p className="text-sm text-[var(--muted)]">Active Members (30d)</p>
            </div>
          </div>

          {/* Skills by Category */}
          {analytics.skillsByCategory.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-semibold">Skills by Category</h2>
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)]">
                {analytics.skillsByCategory.map((cat, i) => (
                  <div
                    key={cat.category}
                    className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-[var(--border)]" : ""}`}
                  >
                    <span className="text-sm">{cat.category}</span>
                    <span className="text-sm font-medium">{cat.count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Top Skills */}
          {analytics.topSkills.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-semibold">Top Skills by Installs</h2>
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)]">
                {analytics.topSkills.map((skill, i) => (
                  <div
                    key={skill.slug}
                    className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-[var(--border)]" : ""}`}
                  >
                    <Link href={`/skills/${skill.slug}`} className="text-sm hover:underline">
                      {skill.name}
                    </Link>
                    <span className="text-sm text-[var(--muted)]">{skill.installs.toLocaleString()} installs</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent Install Activity */}
          {analytics.recentInstalls.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Install Activity (Last 30 Days)</h2>
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
                <div className="flex items-end gap-1" role="img" aria-label={`Bar chart showing install activity over the last 30 days, total ${analytics.recentInstalls.reduce((s, d) => s + d.count, 0)} installs`} style={{ height: 120 }}>
                  {analytics.recentInstalls.map((day) => {
                    const maxCount = Math.max(...analytics.recentInstalls.map((d) => d.count));
                    const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                    return (
                      <div
                        key={day.date}
                        className="flex-1 rounded-t bg-[var(--primary)]"
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${day.date}: ${day.count} installs`}
                        aria-hidden="true"
                      />
                    );
                  })}
                </div>
                <div className="mt-2 flex justify-between text-xs text-[var(--muted)]">
                  <span>{analytics.recentInstalls[0]?.date}</span>
                  <span>{analytics.recentInstalls[analytics.recentInstalls.length - 1]?.date}</span>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
