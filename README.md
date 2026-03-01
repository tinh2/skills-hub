# skills-hub.ai

The marketplace for Claude Code skills -- discover, share, install, and rate quality-scored skills for AI coding assistants.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

## Overview

skills-hub.ai is a full-stack platform where developers publish, discover, and install reusable skills (structured instruction sets) for AI coding assistants. Every skill receives an automated 0--100 quality score. Users authenticate with GitHub, browse a curated category taxonomy, leave star ratings and reviews, organize skills within teams, and install with a single CLI command.

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
| Job Queue | BullMQ + Redis 7 (inline fallback when Redis unavailable) |
| Rate Limiting | @fastify/rate-limit + Redis 7 |
| Testing | Vitest 2 (unit + integration with real PostgreSQL) |

## Architecture

The API follows a domain-driven module structure. Each module under `apps/api/src/modules/` encapsulates routes, a service layer, and co-located tests. Routes handle HTTP concerns (parsing, auth guards, rate limits), services contain business logic, and Prisma handles data access directly in the service layer. All endpoints are prefixed with `/api/v1/` and accept `Authorization: Bearer <jwt>` or `ApiKey <key>` headers.

The frontend uses Next.js 15 App Router with server components for initial page loads and TanStack Query for client-side data fetching. Zustand manages local UI state (auth, toasts). All API types and validation schemas live in `packages/shared`, keeping frontend and backend in sync.

Sandbox and agent execution jobs are dispatched via BullMQ (Redis) with retry and timeout handling. When Redis is unavailable, execution falls back to inline processing. A background sweeper cleans up stuck `RUNNING` records regardless of Redis availability.

```
Browser/CLI --> Next.js 15 (SSR + CSR) --> Fastify API (/api/v1/)
                                               |
                                        Prisma + PostgreSQL 16
                                               |
                                        BullMQ + Redis 7 (optional)
```

Key patterns: cursor-based pagination, Prisma atomic `increment` for denormalized counters, Zod validation on every route, `select` (not `include`) for minimal field fetching, tsvector/GIN indexes for full-text search.

## Project Structure

```
skills-hub/
  apps/
    api/                 Fastify REST API (15 domain modules)
      src/modules/       auth, user, skill, version, review, search,
                         install, like, category, tag, media, org,
                         sandbox, agent, validation
      prisma/            Schema, migrations, seeds
    web/                 Next.js frontend
      src/app/           App Router: browse, skills, dashboard,
                         publish, settings, orgs, categories, docs
    cli/                 CLI tool (15 commands + org subcommands)
      src/commands/      login, search, install, publish, org, etc.
  packages/
    shared/              Zod schemas, TypeScript types, constants
    skill-parser/        SKILL.md frontmatter parser + OpenFang adapter
  infra/terraform/       AWS infrastructure (global, dev, staging, prod)
    global/              S3 state bucket, ECR repo, OIDC provider
    environments/        Per-env configs (dev, staging, prod)
    modules/             app-runner, web-runner, database, cache,
                         network, secrets, storage, monitoring
  docker-compose.yml       Dev: PostgreSQL 16 + Redis 7
  docker-compose.prod.yml  Prod: API + Web + PostgreSQL + Redis
  turbo.json               Turborepo pipeline config
  pnpm-workspace.yaml      Workspace: apps/* + packages/*
```

## Getting Started

### Prerequisites

- Node.js >= 22.0.0
- pnpm >= 9.15
- Docker (for PostgreSQL and Redis)
- A [GitHub OAuth App](https://github.com/settings/developers) (for authentication)

### Setup

```bash
git clone git@github.com:tinh2/skills-hub.git
cd skills-hub
pnpm install
docker compose up -d                          # PostgreSQL 16 + Redis 7
cp .env.example apps/api/.env                 # then fill in your values
pnpm db:generate                              # generate Prisma client
pnpm db:migrate                               # run database migrations
pnpm db:seed                                  # seed categories
pnpm dev                                      # API on :3000, Web on :3001
```

### Environment Variables

Copy `.env.example` to `apps/api/.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth App client secret |
| `GITHUB_CALLBACK_URL` | Yes | OAuth callback (e.g. `http://localhost:3001/auth/callback`) |
| `JWT_SECRET` | Yes | Signing secret, minimum 32 characters |
| `GITHUB_TOKEN_ENCRYPTION_KEY` | Yes | 64-char hex key for encrypting stored GitHub tokens |
| `JWT_EXPIRES_IN` | No | Access token TTL (default `15m`) |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | No | Refresh token TTL in days (default `7`) |
| `FRONTEND_URL` | No | Frontend origin for CORS (default `http://localhost:3001`) |
| `REDIS_URL` | No | Redis URL for rate limiting + job queue (optional) |
| `NEXT_PUBLIC_API_URL` | No | API URL exposed to the browser |
| `NEXT_PUBLIC_SITE_URL` | No | Public site URL for SEO metadata |

Generate an encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps with hot reload |
| `pnpm build` | Build all apps and packages |
| `pnpm test` | Run all unit tests (Vitest) |
| `pnpm lint` | Type-check all packages |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:generate` | Regenerate Prisma Client |
| `pnpm db:seed` | Seed skill categories |
| `pnpm db:seed:registry` | Seed the skill registry |
| `pnpm db:studio` | Open Prisma Studio GUI |
| `docker compose up -d` | Start PostgreSQL + Redis |

Filter to a single app:

```bash
pnpm --filter @skills-hub/api dev
pnpm --filter @skills-hub/web dev
pnpm --filter @skills-hub/cli dev
```

## Testing

Unit tests run in-memory with mocked dependencies:

```bash
pnpm test
```

Integration tests run against a real PostgreSQL database (`skillshub_test`):

```bash
pnpm --filter @skills-hub/api test:integration
```

Integration tests use serialized forks (single database) with a 30-second timeout per test. CI runs both suites on every push and PR to `main` via GitHub Actions with a PostgreSQL 16 service container.

## Building for Production

```bash
pnpm build        # builds all packages and apps via Turborepo
```

This produces:
- `apps/api/dist/` -- compiled Fastify server
- `apps/web/.next/` -- Next.js build
- `packages/shared/dist/` -- compiled types and schemas
- `packages/skill-parser/dist/` -- compiled parser

Both apps have multi-stage Dockerfiles (`apps/api/Dockerfile`, `apps/web/Dockerfile`) based on Node.js 22 Alpine. Build context is the repository root:

```bash
docker build -t skills-hub-api -f apps/api/Dockerfile .
docker build -t skills-hub-web -f apps/web/Dockerfile .
```

The API container runs `prisma migrate deploy` on startup before starting the server.

## Deployment

### Docker Compose (self-hosting)

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Starts four containers: API (port 3000), Web (port 3001), PostgreSQL 16, and Redis 7. PostgreSQL includes a health check; the API waits for it before starting. All services restart automatically unless explicitly stopped.

### AWS + Terraform

Production infrastructure is managed by Terraform under `infra/terraform/`, organized into reusable modules (app-runner, web-runner, database, cache, network, secrets, storage, monitoring) and per-environment configurations (dev, staging, prod).

Bootstrap (one-time):

```bash
cd infra/terraform/global && terraform init && terraform apply
```

Deploy an environment:

```bash
cd infra/terraform/environments/prod
terraform init && terraform apply -var-file=secrets.tfvars
```

CI/CD: Pushes to `main` trigger GitHub Actions to build, test, push Docker images to Amazon ECR, and deploy. Set `AWS_DEPLOY_ROLE_ARN` as a GitHub Actions secret.

## Key Features

- **Skill Discovery** -- Browse and search by category, platform, quality score, tags, and author
- **Quality Scoring** -- Automated 0--100 score based on schema completeness and instruction quality
- **One-Command Install** -- `npx skills-hub install <slug>` with platform targeting
- **Version Management** -- Semver versioning, changelogs, and version diffs
- **Ratings and Reviews** -- Star ratings, text reviews, helpfulness voting, creator responses
- **Skill Compositions** -- Chain multiple skills into pipelines with sequential or parallel execution
- **Organizations** -- Team workspaces with GitHub org sync, roles (admin/publisher/member), templates, and analytics
- **Media Showcase** -- Screenshots and YouTube embeds with URL allowlisting
- **Sandbox Testing** -- Run skills in sandboxed environments with test cases
- **Agent Deployment** -- Deploy skills as persistent agents with manual, scheduled, webhook, or channel triggers
- **AI-Powered Skill Generation** -- Describe what you want on the publish page and generate name, description, category, tags, and instructions via OpenRouter (supports Claude Sonnet 4, Claude Haiku 4, GPT-4o, Gemini 2.0 Flash). Per-field "Suggest" buttons for targeted regeneration. Client-side only -- your API key stays in the browser
- **Visibility Controls** -- Public, Private, Unlisted, and Organization-scoped skills
- **API Key Auth** -- Named API keys with optional expiry for CLI and programmatic access

## CLI Usage

```bash
npx skills-hub login                             # GitHub OAuth
npx skills-hub search "code review"              # search skills
npx skills-hub install review-code               # install a skill
npx skills-hub install review-code --target cursor  # install for Cursor
npx skills-hub list                              # list installed skills
npx skills-hub update                            # update all installed
npx skills-hub publish ./SKILL.md                # publish a skill
npx skills-hub info review-code                  # skill details
npx skills-hub diff review-code 1.0.0 2.0.0     # version diff
npx skills-hub categories                        # browse categories
npx skills-hub org list                          # list organizations
```

Config is stored at `~/.skills-hub/config.json`.

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

Fields: `name` (required, 1--100 chars), `description` (required, 10--1,000 chars), `version` (required, semver), `category` (required), `platforms` (`CLAUDE_CODE`, `CURSOR`, `CODEX_CLI`, `OTHER`).

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make changes with tests alongside features
4. Run `pnpm test` and `pnpm lint`
5. Submit a pull request

CI runs on every push and PR to `main`: builds all packages, runs unit tests, applies migrations, and runs integration tests against a real PostgreSQL instance.

## License

MIT
