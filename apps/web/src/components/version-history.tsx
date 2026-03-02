"use client";

import { useState } from "react";
import { versions as versionsApi } from "@/lib/api";
import type { SkillDetail, VersionDiff } from "@skills-hub-ai/shared";
import { buildSkillMd, triggerFileDownload } from "@/lib/download";

export function VersionHistory({ skill }: { skill: SkillDetail }) {
  const [activeDiff, setActiveDiff] = useState<{ version: string; diff: VersionDiff } | null>(null);
  const [loadingDiff, setLoadingDiff] = useState<string | null>(null);

  async function handleViewDiff(fromVersion: string, toVersion: string) {
    if (activeDiff?.version === toVersion) {
      setActiveDiff(null);
      return;
    }
    setLoadingDiff(toVersion);
    try {
      const diff = await versionsApi.diff(skill.slug, fromVersion, toVersion);
      setActiveDiff({ version: toVersion, diff });
    } catch {
      // silently fail
    } finally {
      setLoadingDiff(null);
    }
  }

  function handleDownloadSkillMd() {
    triggerFileDownload(buildSkillMd(skill), "SKILL.md");
  }

  async function handleDownloadVersion(version: string) {
    try {
      const detail = await versionsApi.get(skill.slug, version);
      const content = buildSkillMd({ ...skill, instructions: detail.instructions, latestVersion: version });
      triggerFileDownload(content, `SKILL-v${version}.md`);
    } catch {
      // version fetch failed — no download triggered
    }
  }

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-5">
      <h3 className="mb-3 text-sm font-medium">Version History</h3>
      <ul className="space-y-2">
        {skill.versions.slice(0, 5).map((v, i) => (
          <li key={v.id} className="text-sm">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-medium">v{v.version}</span>
                <span className="ml-2 text-xs text-[var(--muted)]">
                  {new Date(v.createdAt).toLocaleDateString()}
                </span>
                {v.changelog && (
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {v.changelog}
                  </p>
                )}
              </div>
              <div className="ml-2 flex shrink-0 gap-1">
                {i > 0 && i < skill.versions.length && (
                  <button
                    onClick={() => handleViewDiff(skill.versions[i].version, skill.versions[i - 1].version)}
                    disabled={loadingDiff === skill.versions[i - 1].version}
                    className="min-h-[44px] rounded px-2 py-1 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                    aria-label={`View changes from v${v.version} to v${skill.versions[i - 1].version}`}
                  >
                    {loadingDiff === skill.versions[i - 1].version ? "..." : activeDiff?.version === skill.versions[i - 1].version ? "Hide" : "Changes"}
                  </button>
                )}
                <button
                  onClick={() => i === 0 ? handleDownloadSkillMd() : handleDownloadVersion(v.version)}
                  className="min-h-[44px] rounded px-2 py-1 text-xs text-[var(--primary)] transition-colors hover:bg-[var(--accent)] hover:underline"
                  aria-label={`Download version ${v.version}`}
                  title={`Download v${v.version}`}
                >
                  Download
                </button>
              </div>
            </div>
            {activeDiff !== null && i > 0 && activeDiff.version === skill.versions[i - 1]?.version && (
              <pre className="mt-2 max-h-48 overflow-auto rounded bg-[var(--background)] p-2 text-xs leading-relaxed">
                {activeDiff.diff.diff.split("\n").map((line, j) => (
                  <span
                    key={j}
                    className={
                      line.startsWith("+ ") ? "text-[var(--success)]" :
                      line.startsWith("- ") ? "text-[var(--error)]" :
                      "text-[var(--muted)]"
                    }
                  >
                    {line}{"\n"}
                  </span>
                ))}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
