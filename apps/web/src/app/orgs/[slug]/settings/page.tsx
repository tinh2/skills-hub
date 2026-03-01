"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orgs as orgsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function OrgSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: org, isLoading } = useQuery({
    queryKey: ["org", slug],
    queryFn: () => orgsApi.get(slug),
    enabled: isAuthenticated,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [msg, setMsg] = useState("");

  if (org && !initialized) {
    setName(org.name);
    setDescription(org.description ?? "");
    setInitialized(true);
  }

  const updateOrg = useMutation({
    mutationFn: () => orgsApi.update(slug, { name, description: description || undefined }),
    onSuccess: () => {
      setMsg("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["org", slug] });
      setTimeout(() => setMsg(""), 3000);
    },
    onError: (err: Error) => setMsg(err.message),
  });

  // GitHub sync
  const [githubOrgSlug, setGithubOrgSlug] = useState("");
  const [githubMsg, setGithubMsg] = useState("");

  const connectGithub = useMutation({
    mutationFn: () => orgsApi.connectGithub(slug, { githubOrgSlug }),
    onSuccess: (data: any) => {
      setGithubMsg(`Connected! ${data.membersAdded} members added.`);
      setGithubOrgSlug("");
      queryClient.invalidateQueries({ queryKey: ["org", slug] });
    },
    onError: (err: Error) => setGithubMsg(err.message),
  });

  const disconnectGithub = useMutation({
    mutationFn: () => orgsApi.disconnectGithub(slug),
    onSuccess: () => {
      setGithubMsg("Disconnected from GitHub.");
      queryClient.invalidateQueries({ queryKey: ["org", slug] });
    },
  });

  const syncGithub = useMutation({
    mutationFn: () => orgsApi.syncGithub(slug),
    onSuccess: (data: any) => {
      setGithubMsg(`Synced: ${data.synced} members checked, ${data.added} added.`);
    },
    onError: (err: Error) => setGithubMsg(err.message),
  });

  // Danger zone
  const deleteOrg = useMutation({
    mutationFn: () => orgsApi.remove(slug),
    onSuccess: () => router.push("/dashboard"),
  });

  if (!isAuthenticated) {
    router.push("/");
    return null;
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <span className="loading-spinner" aria-hidden="true" />
      <span className="ml-3 text-[var(--muted)]">Loading settings...</span>
    </div>
  );
  if (!org || org.currentUserRole !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold">Access denied</h1>
        <p className="mb-6 text-[var(--muted)]">Admin access is required to view organization settings.</p>
        <Link href={`/orgs/${slug}`} className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90">
          Back to Organization
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/orgs/${slug}`} className="text-sm text-[var(--primary)] hover:underline">
          {org.name}
        </Link>
        <span className="text-[var(--muted)]">/</span>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* General */}
      <section className="mb-8 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-semibold">General</h2>
        <div aria-live="polite" aria-atomic="true">
          {msg && (
            <p role="status" className={`mb-3 text-sm ${msg.includes("saved") ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
              {msg}
            </p>
          )}
        </div>
        <div className="mb-4">
          <label htmlFor="org-name" className="mb-1 block text-sm font-medium">Name</label>
          <input
            id="org-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="org-description" className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            id="org-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            rows={3}
            maxLength={500}
          />
        </div>
        <button
          onClick={() => updateOrg.mutate()}
          disabled={updateOrg.isPending}
          className="min-h-[44px] rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:opacity-90 disabled:opacity-50"
        >
          Save Changes
        </button>
      </section>

      {/* GitHub Integration */}
      <section className="mb-8 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-semibold">GitHub Integration</h2>
        <div aria-live="polite" aria-atomic="true">
          {githubMsg && <p role="status" className="mb-3 text-sm text-[var(--muted)]">{githubMsg}</p>}
        </div>

        {org.githubOrg ? (
          <div>
            <p className="mb-3 text-sm">
              Connected to <span className="font-medium">{org.githubOrg}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => syncGithub.mutate()}
                disabled={syncGithub.isPending}
                className="min-h-[44px] rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-sm transition-colors hover:bg-[var(--accent)] disabled:opacity-50"
              >
                {syncGithub.isPending ? "Syncing..." : "Sync Members"}
              </button>
              <button
                onClick={() => {
                  if (confirm("Disconnect GitHub org?")) disconnectGithub.mutate();
                }}
                disabled={disconnectGithub.isPending}
                className="min-h-[44px] rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <label htmlFor="github-org-slug" className="sr-only">GitHub organization name</label>
            <input
              id="github-org-slug"
              type="text"
              value={githubOrgSlug}
              onChange={(e) => setGithubOrgSlug(e.target.value)}
              placeholder="GitHub org name"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
            <button
              onClick={() => connectGithub.mutate()}
              disabled={connectGithub.isPending || !githubOrgSlug.trim()}
              className="min-h-[44px] rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] transition-colors hover:opacity-90 disabled:opacity-50"
            >
              Connect
            </button>
          </div>
        )}
      </section>

      {/* Danger Zone */}
      <section className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950">
        <h2 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-200">Danger Zone</h2>
        <p className="mb-4 text-sm text-red-700 dark:text-red-300">
          Deleting this organization will archive all its skills and remove all members.
        </p>
        <button
          onClick={() => {
            if (confirm(`Delete ${org.name}? This cannot be undone.`)) deleteOrg.mutate();
          }}
          disabled={deleteOrg.isPending}
          className="min-h-[44px] rounded-lg bg-[var(--error)] px-4 py-2 text-sm text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          Delete Organization
        </button>
      </section>
    </div>
  );
}
