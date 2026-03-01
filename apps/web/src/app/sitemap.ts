import type { MetadataRoute } from "next";

// Server components use API_INTERNAL_URL for Docker service-to-service calls,
// falling back to NEXT_PUBLIC_API_URL for local development
const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://skills-hub.ai";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/browse`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/categories`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.2 },
  ];

  try {
    const allSkills: MetadataRoute.Sitemap = [];
    let cursor: string | undefined;

    // Paginate through all published skills
    for (let page = 0; page < 100; page++) {
      const params = new URLSearchParams({ limit: "200", sort: "recently_updated" });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`${API_BASE}/api/v1/skills?${params}`, {
        next: { revalidate: 3600 },
      });
      if (!res.ok) break;

      const data = await res.json();
      for (const skill of data.data || []) {
        allSkills.push({
          url: `${SITE_URL}/skills/${skill.slug}`,
          lastModified: new Date(skill.updatedAt),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        });
      }

      if (!data.hasMore || !data.cursor) break;
      cursor = data.cursor;
    }

    return [...staticPages, ...allSkills];
  } catch {
    return staticPages;
  }
}
