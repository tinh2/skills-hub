# @skills-hub-ai/shared

Shared constants, Zod schemas, and TypeScript types for the [skills-hub.ai](https://skills-hub.ai) platform.

This is an internal library used by `@skills-hub-ai/cli`, `@skills-hub-ai/mcp`, and the skills-hub API. You probably don't need to install this directly.

## What's Inside

### Constants

- **Categories** — 13 skill categories (build, test, qa, review, deploy, docs, security, ux, analysis, productivity, integration, combo, meta)
- **Platforms** — CLAUDE_CODE, CURSOR, CODEX_CLI, OTHER
- **Visibility** — PUBLIC, PRIVATE, UNLISTED, ORG
- **Scoring** — Quality score breakdown (schema + instruction scoring)
- **Organization** — Roles, limits, invite expiry
- **Moderation** — Trust levels, report limits
- **Sandbox** — Free/pro tier limits for skill execution
- **Pagination** — Default and max page sizes

### Schemas (Zod)

Validation schemas for all API inputs: skills, versions, reviews, installs, media, organizations, agents, reports, auth, and users.

### Types

TypeScript types for all API responses: users, skills, reviews, sandbox runs, agents, organizations, reports, and pagination.

## Usage

```ts
import { CATEGORIES, PLATFORMS, createSkillSchema } from "@skills-hub-ai/shared";

const result = createSkillSchema.safeParse(input);
```

## Links

- [GitHub](https://github.com/tinh2/skills-hub)
- [skills-hub.ai](https://skills-hub.ai)
