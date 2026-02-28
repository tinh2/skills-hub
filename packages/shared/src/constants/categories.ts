export const CATEGORIES = [
  { name: "Build", slug: "build", description: "Project scaffolding and full build pipelines", sortOrder: 0 },
  { name: "Test", slug: "test", description: "Unit tests, E2E tests, integration tests", sortOrder: 1 },
  { name: "QA", slug: "qa", description: "Quality assurance, manual test plans, bug detection", sortOrder: 2 },
  { name: "Review", slug: "review", description: "Code review, architecture review, design review", sortOrder: 3 },
  { name: "Deploy", slug: "deploy", description: "Infrastructure, CI/CD, cloud deployment", sortOrder: 4 },
  { name: "Docs", slug: "docs", description: "README generation, API docs, changelogs", sortOrder: 5 },
  { name: "Security", slug: "security", description: "Audits, vulnerability checks, compliance", sortOrder: 6 },
  { name: "UX", slug: "ux", description: "Accessibility, usability, design systems", sortOrder: 7 },
  { name: "Analysis", slug: "analysis", description: "Domain analysis, competitive analysis, metrics", sortOrder: 8 },
  { name: "Productivity", slug: "productivity", description: "Workflow automation, task management", sortOrder: 9 },
  { name: "Integration", slug: "integration", description: "Third-party service connectors", sortOrder: 10 },
  { name: "Combo", slug: "combo", description: "Multi-skill chains and compositions", sortOrder: 11 },
  { name: "Meta", slug: "meta", description: "Skills about skills — recall, evolve, promote", sortOrder: 12 },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);
