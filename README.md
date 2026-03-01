# skills-hub.ai

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

The marketplace for Claude Code skills. Discover, share, install, and rate quality-scored skills for Claude Code, Cursor, and Codex CLI.

**Web:** [skills-hub.ai](https://skills-hub.ai) | **CLI:** `npx skills-hub install <skill-name>` | **API:** `https://api.skills-hub.ai/api/v1/`

---

## Overview

skills-hub.ai is a full-stack platform where developers publish, discover, and install reusable skills (structured instruction sets) for AI coding assistants. Every skill receives an automated 0-100 quality score. Users authenticate with GitHub, browse a curated 13-category taxonomy, leave star ratings and reviews, organize skills within teams, and install with a single CLI command.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm 9 workspaces |
| Backend | Fastify 5 + Prisma 6 + PostgreSQL 16 |
| Frontend | Next.js 15 (App Router) + Tailwind CSS 4 + React 19 |
| CLI | Commander.js + Chalk + Ora |
| Auth | GitHub OAuth + JWT (jose) + httpOnly refresh cookies |
| Validation | Zod (shared across all layers) |
| State | TanStack Query (server) + Zustand (client) |
| Rate Limiting | @fastify/rate-limit + Redis 7 |

## Project Structure

```
skills-hub/
├── apps/
│   ├── api/            Fastify REST API (15 domain modules)
│   ├── web/            Next.js frontend (12 route groups)
│   └── cli/            CLI tool (15 commands)
├── packages/
│   ├── shared/         Zod schemas, types, constants
│   └── skill-parser/   SKILL.md parser + OpenFang adapter
├── docker-compose.yml  PostgreSQL 16 + Redis 7
├── turbo.json          Build pipeline
└── pnpm-workspace.yaml
```

**API modules:** auth, user, skill, version, review, search, install, like, category, tag, media, org, sandbox, agent, validation

**Web pages:** Home, Browse, Categories, Skill Detail/Edit, User Profile, Dashboard, Publish, Settings, Org Management, Invites

**CLI commands:** login, logout, whoami, search, install, uninstall, list, update, publish, unpublish, version-create, info, categories, diff, org

## Key Features

- **Skill Discovery** -- Browse and search by category, platform, quality score, tags, and author with cursor-based pagination
- **Quality Scoring** -- Automated 0-100 score: schema completeness (25 pts) + instruction quality (75 pts); minimum 20 to publish
- **One-Command Install** -- `npx skills-hub install <slug>` with auto-detected platform targeting
- **Version Management** -- Semver versioning, changelogs, version diffs, and bulk update
- **Ratings and Reviews** -- 1-5 star ratings, text reviews, helpfulness voting, creator responses
- **Skill Compositions** -- Chain multiple skills into pipelines with sequential or parallel execution
- **Organizations** -- Team workspaces with GitHub org sync, roles (Admin/Publisher/Member), skill templates, and analytics
- **Media Showcase** -- Screenshots and YouTube embeds with URL allowlisting and reorder support
- **Sandbox Testing** -- Run skills in sandboxed environments with test cases and cached results
- **Agent Deployment** -- Deploy skills as persistent agents with manual, scheduled, or webhook triggers
- **Visibility Controls** -- Public, Private, Unlisted, and Organization-scoped skills
- **API Key Auth** -- Named API keys with optional expiry for CLI and automation

---

## Getting Started

### Prerequisites

- Node.js >= 22.0.0, pnpm >= 9.15, Docker, and a [GitHub OAuth App](https://github.com/settings/developers)

### Setup

```bash
git clone <repo-url>
cd skills-hub
pnpm install
docker compose up -d                          # PostgreSQL 16 + Redis 7
cp .env.example apps/api/.env                 # then edit with your values
pnpm db:migrate                               # run Prisma migrations
pnpm db:seed                                  # seed 13 categories
pnpm dev                                      # API :3000, Web :3001
```

Required environment variables in `apps/api/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/skillshub?schema=public"
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"
GITHUB_CALLBACK_URL="http://localhost:3001/api/auth/callback"
JWT_SECRET="your-jwt-secret-at-least-32-characters-long"
```

Optional: `FRONTEND_URL` (default `http://localhost:3001`), `API_URL` (default `http://localhost:3000`), `PORT` (default `3000`), `HOST` (default `0.0.0.0`), `JWT_EXPIRES_IN` (default `15m`), `REFRESH_TOKEN_EXPIRES_IN_DAYS` (default `7`), `GITHUB_TOKEN_ENCRYPTION_KEY`.

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps (hot reload) |
| `pnpm build` | Build all apps and packages |
| `pnpm test` | Run all unit tests (Vitest) |
| `pnpm lint` | Type-check all packages |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed categories |
| `pnpm db:generate` | Regenerate Prisma Client |
| `pnpm db:studio` | Open Prisma Studio |
| `docker compose up -d` | Start PostgreSQL + Redis |

Integration tests run against a real PostgreSQL database (`skillshub_test`):

```bash
pnpm --filter @skills-hub/api test:integration
```

### Conventions

- `/api/v1/` prefix on all API endpoints
- Domain-split modules: `apps/api/src/modules/<domain>/` (routes + service + repository)
- Zod validation on all inputs; cursor-based pagination on all list endpoints
- Prisma atomic `increment` for denormalized counters
- Tests alongside features in the same module directory
- Username immutable after first login; public API never exposes email

---

## API Overview

All endpoints prefixed with `/api/v1/`. Auth via `Authorization: Bearer <jwt>` or `X-API-Key: <key>`.

### Auth
`GET /auth/github` | `POST /auth/github/callback` | `POST /auth/refresh` | `DELETE /auth/session`

### Users
`GET /users/me` | `PATCH /users/me` | `POST /users/me/api-keys` | `GET /users/me/api-keys` | `DELETE /users/me/api-keys/:id` | `GET /users/:username`

### Skills
`GET /skills` | `GET /skills/:slug` | `POST /skills` | `PATCH /skills/:slug` | `POST /skills/:slug/publish` | `DELETE /skills/:slug` | `PUT /skills/:slug/composition` | `DELETE /skills/:slug/composition`

Query params: `q`, `author`, `category`, `platform`, `visibility`, `minScore`, `sort` (newest/most_installed/highest_rated/recently_updated), `cursor`, `limit`

### Versions
`GET /skills/:slug/versions` | `GET /skills/:slug/versions/:v` | `POST /skills/:slug/versions` | `GET /skills/:slug/versions/:from/diff/:to`

### Reviews
`GET /skills/:slug/reviews` | `GET /skills/:slug/reviews/stats` | `POST /skills/:slug/reviews` | `PATCH /skills/reviews/:id` | `DELETE /skills/reviews/:id` | `POST /skills/reviews/:id/vote` | `POST /skills/reviews/:id/response`

### Likes, Installs, Media
`POST /skills/:slug/like` | `POST /skills/:slug/install` | `POST /skills/:slug/media` | `DELETE /skills/:slug/media/:id` | `PUT /skills/:slug/media/reorder`

### Sandbox and Test Cases
`POST /skills/:slug/sandbox` | `GET /skills/:slug/sandbox` | `GET /skills/:slug/test-cases` | `POST /skills/:slug/test-cases` | `PATCH /skills/:slug/test-cases/:id` | `DELETE /skills/:slug/test-cases/:id`

### Agents
`POST /agents` | `GET /agents` | `GET /agents/:id` | `PATCH /agents/:id` | `POST /agents/:id/execute` | `POST /agents/:id/pause` | `POST /agents/:id/resume` | `DELETE /agents/:id`

### Search
`GET /search` | `GET /search/suggestions?q=`

### Categories and Tags
`GET /categories` | `GET /categories/featured` | `GET /categories/:slug` | `GET /tags?q=&limit=`

### Organizations
`POST /orgs` | `GET /orgs` | `GET /orgs/:slug` | `PATCH /orgs/:slug` | `DELETE /orgs/:slug` | Members, invites, templates, GitHub sync, and analytics endpoints under `/orgs/:slug/...`

### Error Format

```json
{ "error": { "code": "NOT_FOUND", "message": "Resource not found" } }
```

Codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `INTERNAL_ERROR` (500)

### Rate Limits

Global: 300/min. Auth: 20/min. Writes: 30/min. Search: 60/min. Sandbox: 10/min. Agents: 20/min.

---

## CLI Usage

```bash
npx skills-hub search "code review"                   # search skills
npx skills-hub install review-code                     # install a skill
npx skills-hub install review-code --target cursor     # install for Cursor
npx skills-hub list                                    # list installed
npx skills-hub update                                  # update all installed
npx skills-hub info review-code                        # skill details
npx skills-hub diff review-code 1.0.0 2.0.0            # version diff
npx skills-hub publish ./SKILL.md                      # publish a skill
npx skills-hub login                                   # GitHub OAuth
npx skills-hub org list                                # list organizations
npx skills-hub categories                              # browse categories
```

Install targets: Claude Code (`~/.claude/skills/`), Cursor (`~/.cursor/skills/`). Override with `--target`.

Config stored at `~/.skills-hub/config.json`.

---

## SKILL.md Format

```markdown
---
name: My Skill
description: What this skill does in one sentence
version: 1.0.0
category: review
platforms:
  - CLAUDE_CODE
---

Skill instructions go here...
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Display name (1-100 chars) |
| `description` | Yes | Short description (10-1,000 chars) |
| `version` | Yes | Semver version |
| `category` | No | One of: build, test, qa, review, deploy, docs, security, ux, analysis, productivity, integration, combo, meta |
| `platforms` | No | `CLAUDE_CODE`, `CURSOR`, `CODEX_CLI`, `OTHER` |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make changes with tests alongside features
4. Run `pnpm test` and `pnpm lint`
5. Submit a pull request

## License

MIT
