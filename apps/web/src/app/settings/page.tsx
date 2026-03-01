"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { users } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => users.getMe(),
    enabled: isAuthenticated,
  });

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profileInitialized, setProfileInitialized] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  // Initialize form when data loads
  if (me && !profileInitialized) {
    setDisplayName(me.displayName || "");
    setBio(me.bio || "");
    setProfileInitialized(true);
  }

  const updateProfile = useMutation({
    mutationFn: () => users.updateMe({ displayName: displayName || undefined, bio: bio || undefined }),
    onSuccess: () => {
      setProfileMsg("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setTimeout(() => setProfileMsg(""), 3000);
    },
    onError: (err: Error) => setProfileMsg(err.message),
  });

  // API Keys
  const { data: apiKeys } = useQuery({
    queryKey: ["apiKeys"],
    queryFn: () => users.listApiKeys(),
    enabled: isAuthenticated,
  });

  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  const createKey = useMutation({
    mutationFn: () => users.createApiKey({ name: keyName }),
    onSuccess: (data) => {
      setNewKey(data.key);
      setKeyName("");
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
    },
  });

  const deleteKey = useMutation({
    mutationFn: (id: string) => users.deleteApiKey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["apiKeys"] }),
  });

  if (!isAuthenticated) {
    router.push("/");
    return null;
  }

  if (isLoading) return <p className="text-[var(--muted)]">Loading...</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold">Settings</h1>

      {/* Profile */}
      <section className="mb-8 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-semibold">Profile</h2>
        {profileMsg && (
          <p role="status" className={`mb-3 text-sm ${profileMsg.includes("updated") ? "text-green-600" : "text-red-600"}`}>
            {profileMsg}
          </p>
        )}
        <div className="mb-4">
          <label htmlFor="settings-username" className="mb-1 block text-sm font-medium">Username</label>
          <input
            id="settings-username"
            type="text"
            value={me?.username ?? ""}
            disabled
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm opacity-50"
          />
          <p className="mt-1 text-xs text-[var(--muted)]">Username cannot be changed</p>
        </div>
        <div className="mb-4">
          <label htmlFor="settings-display-name" className="mb-1 block text-sm font-medium">Display Name</label>
          <input
            id="settings-display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            placeholder="Your display name"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="settings-bio" className="mb-1 block text-sm font-medium">Bio</label>
          <textarea
            id="settings-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            rows={3}
            placeholder="Tell us about yourself"
            maxLength={500}
          />
        </div>
        <button
          onClick={() => updateProfile.mutate()}
          disabled={updateProfile.isPending}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] disabled:opacity-50"
        >
          {updateProfile.isPending ? "Saving..." : "Save Profile"}
        </button>
      </section>

      {/* API Keys */}
      <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-lg font-semibold">API Keys</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          API keys let you use the CLI and API without browser login.
        </p>

        {newKey && (
          <div role="alert" className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
            <p className="mb-2 text-sm font-medium text-green-800 dark:text-green-200">New API key created — copy it now, it won&apos;t be shown again:</p>
            <code className="block break-all rounded bg-green-100 p-2 text-xs text-green-900 dark:bg-green-900 dark:text-green-100">{newKey}</code>
            <button
              onClick={() => setNewKey(null)}
              className="mt-2 text-xs text-green-700 underline dark:text-green-300"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mb-4 flex gap-2">
          <label htmlFor="api-key-name" className="sr-only">API key name</label>
          <input
            id="api-key-name"
            type="text"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="Key name (e.g., laptop)"
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
          <button
            onClick={() => createKey.mutate()}
            disabled={createKey.isPending || !keyName.trim()}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] disabled:opacity-50"
          >
            Create
          </button>
        </div>

        {apiKeys && apiKeys.length > 0 ? (
          <ul className="divide-y divide-[var(--border)]">
            {apiKeys.map((key) => (
              <li key={key.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{key.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  onClick={() => deleteKey.mutate(key.id)}
                  disabled={deleteKey.isPending}
                  className="px-1 py-1 text-xs text-red-600 hover:underline disabled:opacity-50"
                  aria-label={`Revoke API key ${key.name}`}
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">No API keys yet.</p>
        )}
      </section>
    </div>
  );
}
