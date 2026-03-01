import type { Metadata } from "next";

const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://skills-hub.ai";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const res = await fetch(`${API_BASE}/api/v1/skills/${slug}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { title: "Skill not found — skills-hub.ai" };

    const skill = await res.json();
    const title = `${skill.name} — skills-hub.ai`;
    const description = skill.description?.slice(0, 160) || `${skill.name} on skills-hub.ai`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        url: `${SITE_URL}/skills/${slug}`,
        siteName: "skills-hub.ai",
      },
    };
  } catch {
    return { title: "skills-hub.ai" };
  }
}

export default function SkillLayout({ children }: Props) {
  return children;
}
