import type { MetadataRoute } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
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
    const res = await fetch(`${API_BASE}/api/v1/skills?limit=500&sort=recently_updated`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return staticPages;

    const data = await res.json();
    const skills: MetadataRoute.Sitemap = (data.data || []).map((skill: { slug: string; updatedAt: string }) => ({
      url: `${SITE_URL}/skills/${skill.slug}`,
      lastModified: new Date(skill.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    return [...staticPages, ...skills];
  } catch {
    return staticPages;
  }
}
