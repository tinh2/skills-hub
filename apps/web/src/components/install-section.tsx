"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { installs } from "@/lib/api";
import type { SkillDetail } from "@skills-hub/shared";
import { buildSkillMd, triggerFileDownload, triggerBlobDownload } from "@/lib/download";
import { skills as skillsApi, versions as versionsApi } from "@/lib/api";
import { zipSync, strToU8 } from "fflate";
import Link from "next/link";

export function InstallSection({ skill }: { skill: SkillDetail }) {
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const trackInstall = useMutation({
    mutationFn: () => installs.record(skill.slug),
  });

  const installCmd = `npx @skills-hub-ai/cli install ${skill.slug}`;

  function handleCopyInstall() {
    navigator.clipboard.writeText(installCmd).catch(() => {});
    trackInstall.mutate();
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }

  function handleDownloadSkillMd() {
    triggerFileDownload(buildSkillMd(skill), "SKILL.md");
  }

  async function handleDownloadBundle() {
    if (!skill.composition) return;
    setIsDownloading(true);
    try {
      const results = await Promise.allSettled(
        skill.composition.children.map((c) => skillsApi.get(c.skill.slug)),
      );

      const children = results
        .filter((r): r is PromiseFulfilledResult<SkillDetail> => r.status === "fulfilled")
        .map((r) => r.value);

      if (children.length === 0) {
        alert("Failed to fetch child skills. Please try again.");
        return;
      }

      const files: Record<string, Uint8Array> = {
        "SKILL.md": strToU8(buildSkillMd(skill)),
      };
      for (const child of children) {
        files[`${child.slug}/SKILL.md`] = strToU8(buildSkillMd(child));
      }

      const zipped = zipSync(files, { level: 6 });
      const buf = new Uint8Array(zipped.length);
      buf.set(zipped);
      const blob = new Blob([buf], { type: "application/zip" });
      triggerBlobDownload(blob, `${skill.slug}.zip`);

      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        alert(`Bundle downloaded but ${failed} child skill(s) could not be fetched.`);
      }
    } catch {
      alert("Download failed. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="mb-8 rounded-lg bg-[var(--accent)] p-4">
      <p className="mb-2 text-sm font-medium">Install</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded bg-[var(--background)] px-3 py-2 text-sm">
          {installCmd}
        </code>
        <button
          onClick={handleCopyInstall}
          aria-label="Copy install command to clipboard"
          className="min-h-[44px] min-w-[44px] rounded bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90"
        >
          {copyFeedback ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-[var(--card-border)] pt-3">
        <span className="text-xs text-[var(--muted)]">Or download directly:</span>
        <button
          onClick={handleDownloadSkillMd}
          className="min-h-[44px] rounded border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--card)]"
        >
          Download SKILL.md
        </button>
        {skill.composition && (
          <button
            onClick={handleDownloadBundle}
            disabled={isDownloading}
            className="min-h-[44px] rounded border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--card)] disabled:opacity-50"
          >
            {isDownloading ? (
              <span className="flex items-center gap-1">
                <span className="loading-spinner" aria-hidden="true" />
                Bundling...
              </span>
            ) : (
              "Download All (.zip)"
            )}
          </button>
        )}
      </div>
      <Link href="/docs/cli" className="mt-2 inline-block text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
        View all CLI commands &rarr;
      </Link>
    </div>
  );
}
