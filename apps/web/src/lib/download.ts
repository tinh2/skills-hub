import type { SkillDetail } from "@skills-hub/shared";

export function buildSkillMd(s: SkillDetail | { name: string; latestVersion: string; category: { slug: string }; platforms: string[]; tags: string[]; description: string; instructions: string }) {
  const frontmatter = [
    "---",
    `name: ${s.name}`,
    `version: ${s.latestVersion}`,
    `category: ${s.category.slug}`,
    `platforms: [${s.platforms.join(", ")}]`,
  ];
  if (s.tags.length > 0) {
    frontmatter.push(`tags: [${s.tags.join(", ")}]`);
  }
  frontmatter.push(`description: |`);
  frontmatter.push(`  ${s.description}`);
  frontmatter.push("---", "");
  return frontmatter.join("\n") + s.instructions;
}

export function triggerFileDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  triggerBlobDownload(blob, filename);
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
