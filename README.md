# skills-hub.ai

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![CI](https://github.com/tinh2/skills-hub/actions/workflows/ci.yml/badge.svg)](https://github.com/tinh2/skills-hub/actions/workflows/ci.yml)

The marketplace for Claude Code skills. Discover, share, install, and rate quality-scored skills for Claude Code, Cursor, and Codex CLI.

**Web:** [skills-hub.ai](https://skills-hub.ai) | **CLI:** `npx skills-hub install <skill-name>` | **API:** `https://api.skills-hub.ai/api/v1/`

---

## Overview

skills-hub.ai is a full-stack platform where developers publish, discover, and install reusable skills (structured instruction sets) for AI coding assistants. Every skill receives an automated 0--100 quality score. Users authenticate with GitHub, browse a curated 13-category taxonomy, leave star ratings and reviews, organize skills within teams, and install with a single CLI command.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo 2 + pnpm 9 workspaces |
| Backend | Fastify 5 + Prisma 6 + PostgreSQL 16 |
| Frontend | Next.js 15 (App Router) + Tailwind CSS 4 + React 19 |
| CLI | Commander.js 12 + Chalk + Ora |
| Auth | GitHub OAuth + JWT (jose) + httpOnly refresh cookies |
| Validation | Zod 3 (shared across all layers) |
| State | TanStack Query 5 (server) + Zustand 5 (client) |
| Rate Limiting | @fastify/rate-limit + Redis 7 |
| Testing | Vitest 2 (unit + integration with real PostgreSQL) |

## Project Structure

```
skills-hub/
├── apps/
│   ├── api/            Fastify REST API (15 domain modules)
│   ├── web/            Next.js frontend (14 route groups, 20 pages)
│   └── cli/            CLI tool (15 commands + 7 org subcommands)
├── packages/
│   ├── shared/         Zod schemas, types, constants
│   └── skill-parser/   SKILL.md frontmatter parser + OpenFang adapter
├── docker-compose.yml      Dev: PostgreSQL 16 + Redis 7
├── docker-compose.prod.yml Prod: API + Web + PostgreSQL + Redis
├── turbo.json              Build pipeline config
└── pnpm-workspace.yaml
```

### API Modules

`auth` `user` `skill` `version` `review` `search` `install` `like` `category` `tag` `media` `org` `sandbox` `agent` `validation`

Each module follows the pattern: `apps/api/src/modules/<domain>/` with routes, service, and tests co-located.

### Web Pages

Home, Browse, Categories, Skill Detail, Skill Edit, User Profiles, Dashboard, Publish, Settings, Organizations (overview, members, analytics, settings, create), Invites, Docs, About, Privacy, Terms

### CLI Commands

`login` `logout` `whoami` `search` `install` `uninstall` `list` `update` `publish` `unpublish` `version-create` `info` `categories` `diff` `org` (create, list, info, invite, remove, leave, sync)

## Key Features

- **Skill Discovery** -- Browse and search by category, platform, quality score, tags, and author with cursor-based pagination
- **Quality Scoring** -- Automated 0--100 score: schema completeness (25 pts) + instruction quality (75 pts); minimum 20 to publish
- **One-Command Install** -- `npx skills-hub install <slug>` with auto-detected platform targeting
- **Version Management** -- Semver versioning, changelogs, version diffs, and bulk update
- **Ratings and Reviews** -- 1--5 star ratings, text reviews, helpfulness voting, creator responses
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

- Node.js >= 22.0.0
- pnpm >= 9.15
- Docker (for PostgreSQL and Redis)
- A [GitHub OAuth App](https://github.com/settings/developers) (for authentication)

### Setup

```bash
git clone https://github.com/tinh2/skills-hub.git
cd skills-hub
pnpm install
docker compose up -d                          # PostgreSQL 16 + Redis 7
cp .env.example apps/api/.env                 # then fill in your values
pnpm db:generate                              # generate Prisma client
pnpm db:migrate                               # run Prisma migrations
pnpm db:seed                                  # seed 13 categories
pnpm dev                                      # API :3000, Web :3001
```

### Environment Variables

Copy `.env.example` to `apps/api/.env` and fill in the required values:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth App client secret |
| `GITHUB_CALLBACK_URL` | Yes | OAuth callback URL (e.g. `http://localhost:3001/auth/callback`) |
| `JWT_SECRET` | Yes | Signing secret, minimum 32 characters |
| `GITHUB_TOKEN_ENCRYPTION_KEY` | No | 64-char hex key for encrypting stored GitHub tokens |
| `JWT_EXPIRES_IN` | No | Access token TTL (default `15m`) |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | No | Refresh token TTL in days (default `7`) |
| `FRONTEND_URL` | No | Frontend origin (default `http://localhost:3001`) |
| `API_URL` | No | API origin (default `http://localhost:3000`) |
| `PORT` | No | API server port (default `3000`) |
| `HOST` | No | API server host (default `0.0.0.0`) |
| `REDIS_URL` | No | Redis URL for rate limiting |
| `NEXT_PUBLIC_API_URL` | No | API URL exposed to the browser |
| `NEXT_PUBLIC_SITE_URL` | No | Public site URL for SEO/meta tags |

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps with hot reload |
| `pnpm build` | Build all apps and packages |
| `pnpm test` | Run all unit tests (Vitest) |
| `pnpm lint` | Type-check all packages |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:generate` | Regenerate Prisma Client |
| `pnpm db:seed` | Seed the 13 skill categories |
| `pnpm db:seed:registry` | Seed the skill registry |
| `pnpm db:studio` | Open Prisma Studio GUI |
| `docker compose up -d` | Start PostgreSQL + Redis |

### Testing

Unit tests run in-memory with mocked dependencies:

```bash
pnpm test
```

Integration tests run against a real PostgreSQL database (`skillshub_test`):

```bash
pnpm --filter @skills-hub/api test:integration
```

Integration tests use serialized forks (single database) with a 30-second timeout per test.

### Conventions

- `/api/v1/` prefix on all API endpoints
- Domain-split modules: `apps/api/src/modules/<domain>/` (routes + service + tests)
- Zod validation on every route input; cursor-based pagination on all list endpoints
- Prisma atomic `increment` for denormalized counters (installs, likes, reviews)
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
| `name` | Yes | Display name (1--100 chars) |
| `description` | Yes | Short description (10--1,000 chars) |
| `version` | Yes | Semver version |
| `category` | No | One of: build, test, qa, review, deploy, docs, security, ux, analysis, productivity, integration, combo, meta |
| `platforms` | No | `CLAUDE_CODE`, `CURSOR`, `CODEX_CLI`, `OTHER` |

---

## Deployment

Production Docker Compose is provided in `docker-compose.prod.yml`. It builds and runs all services:

```bash
# Build and start all services
docker compose -f docker-compose.prod.yml up -d --build
```

This starts four containers:
- **api** -- Fastify server on port 3000 (runs Prisma migrations on startup)
- **web** -- Next.js standalone server on port 3001
- **postgres** -- PostgreSQL 16 with health checks
- **redis** -- Redis 7 for rate limiting

Both `apps/api/Dockerfile` and `apps/web/Dockerfile` use multi-stage builds with Node.js 22 Alpine for minimal image size.

---

## Architecture

The API follows a domain-driven module structure. Each module under `apps/api/src/modules/` encapsulates its own routes, service layer, and tests. Routes handle HTTP concerns (parsing, auth guards, rate limits), services contain business logic, and Prisma handles data access directly in the service layer.

The frontend uses Next.js 15 App Router with server components for initial page loads and TanStack Query for client-side data fetching. Zustand manages local UI state (auth, toasts). All API types and validation schemas are shared from `packages/shared` to keep the frontend and backend in sync.

The skill-parser package handles parsing `SKILL.md` frontmatter files with YAML headers and markdown instruction bodies. It includes an OpenFang adapter for potential agent execution integration.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make changes with tests alongside features
4. Run `pnpm test` and `pnpm lint`
5. Submit a pull request

CI runs on every push and PR to `main`: builds all packages, runs unit tests, applies migrations, and runs integration tests against a real PostgreSQL instance.

## License

MIT
