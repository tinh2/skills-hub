# skills-hub.ai

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

The marketplace for Claude Code skills. Discover, share, install, and rate quality-scored skills for Claude Code, Cursor, and Codex CLI.

**Web:** [skills-hub.ai](https://skills-hub.ai) | **CLI:** `npx skills-hub install <skill-name>` | **API:** `https://api.skills-hub.ai/api/v1/`

---

## Features

- **Skill Discovery** -- Browse and search skills by category, platform, quality score, tags, and author
- **Quality Scoring** -- Every skill receives an automated 0-100 quality score based on schema completeness, instruction structure, error handling, guardrails, and examples
- **One-Command Install** -- `npx skills-hub install <slug>` downloads any skill to `~/.claude/skills/` with auto-detected platform targeting
- **Version Management** -- Semantic versioning with changelogs, version diffs, and `skills-hub update` to keep installed skills current
- **Ratings & Reviews** -- 1-5 star ratings with text reviews, helpfulness voting, and creator responses
- **Skill Compositions** -- Chain multiple skills into pipelines with sequential or parallel execution ordering
- **Visibility Controls** -- Public, private, and unlisted skill visibility with PII-separated user profiles
- **API Key Auth** -- Generate API keys for CLI and automation workflows alongside GitHub OAuth login
- **13 Skill Categories** -- Build, Test, QA, Review, Deploy, Docs, Security, UX, Analysis, Productivity, Integration, Combo, Meta

---

## Architecture

This is a full-stack TypeScript monorepo managed by [Turborepo](https://turbo.build/) and [pnpm workspaces](https://pnpm.io/workspaces).

```
skills-hub/
├── apps/
│   ├── api/          # Fastify 5 REST API + Prisma 6 ORM
│   ├── web/          # Next.js 15 (App Router) frontend
│   └── cli/          # Commander.js CLI, published as `skills-hub` on npm
├── packages/
│   ├── shared/       # Zod schemas, TypeScript types, constants
│   └── skill-parser/ # SKILL.md frontmatter parser + semver utilities
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

### Backend (`apps/api`)

Fastify 5 with domain-split modules under `src/modules/<domain>/` (routes, service, repository pattern). Prisma 6 as the ORM against PostgreSQL 16. Authentication via GitHub OAuth with JWT access tokens and httpOnly refresh token cookies.

**Key modules:** auth, user, skill, version, review, search, install, category, tag, validation

### Frontend (`apps/web`)

Next.js 15 with App Router, Tailwind CSS 4, React Query (TanStack Query) for server state, and Zustand for client state. Renders skill instructions with react-markdown and remark-gfm.

**Pages:** Home, Browse, Categories, Skill Detail (`/skills/[slug]`), User Profile (`/u/[username]`), Publish, Auth Callback

### CLI (`apps/cli`)

Commander.js-based CLI tool distributed via npm. Supports GitHub OAuth browser flow and API key authentication. Auto-detects install target (Claude Code `~/.claude/skills/` or Cursor `~/.cursor/skills/`).

### Shared Packages

- **`@skills-hub/shared`** -- Zod validation schemas for all API inputs, TypeScript types for API responses, constants (categories, platforms, visibility, pagination, quality scoring)
- **`@skills-hub/skill-parser`** -- Parses SKILL.md files with YAML frontmatter, validates against the schema, provides semver comparison utilities

---

## Getting Started

### Prerequisites

- **Node.js** >= 22.0.0
- **pnpm** >= 9.15
- **Docker** (for PostgreSQL and Redis)
- **GitHub OAuth App** (for authentication)

### Setup

1. **Clone and install dependencies:**

   ```bash
   git clone https://github.com/tinh2/skills-hub.git
   cd skills-hub
   pnpm install
   ```

2. **Start infrastructure:**

   ```bash
   docker compose up -d
   ```

   This starts PostgreSQL 16 on port 5432 and Redis 7 on port 6379.

3. **Configure environment:**

   ```bash
   cp .env.example apps/api/.env
   ```

   Edit `apps/api/.env` and fill in your values:

   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/skillshub?schema=public"
   GITHUB_CLIENT_ID="your_github_client_id"
   GITHUB_CLIENT_SECRET="your_github_client_secret"
   GITHUB_CALLBACK_URL="http://localhost:3001/api/auth/callback"
   JWT_SECRET="your-jwt-secret-at-least-32-characters-long"
   FRONTEND_URL="http://localhost:3001"
   API_URL="http://localhost:3000"
   ```

4. **Run database migrations and seed categories:**

   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

5. **Start all apps in development mode:**

   ```bash
   pnpm dev
   ```

   - **API:** http://localhost:3000
   - **Web:** http://localhost:3001
   - **Health check:** http://localhost:3000/health

---

## Development

### Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode (hot reload) |
| `pnpm build` | Build all apps and packages |
| `pnpm test` | Run all tests (Vitest) |
| `pnpm lint` | Type-check all packages |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed categories into the database |
| `pnpm db:generate` | Regenerate Prisma Client |
| `pnpm db:studio` | Open Prisma Studio (visual database browser) |
| `docker compose up -d` | Start PostgreSQL + Redis |

### Project Conventions

- **API routes** use the `/api/v1/` prefix on all endpoints
- **Domain-split modules** live at `apps/api/src/modules/<domain>/` with routes, service, and repository files
- **Username is immutable** after first GitHub login
- **Public user API never exposes email** (PII separation)
- **Cursor-based pagination** (not offset-based) on all list endpoints
- **Prisma atomic `increment`** for denormalized counters (install count, review count)
- **Tests live alongside features** in the same module directory

### Rate Limiting

Global rate limit: **300 requests/minute**

Granular limits by route group:

| Route Group | Limit |
|-------------|-------|
| Auth endpoints | 20/min |
| Write operations | 30/min |
| Search endpoints | 60/min |

---

## API Reference

All endpoints are prefixed with `/api/v1/`.

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/auth/github` | -- | Redirect to GitHub OAuth |
| `POST` | `/auth/github/callback` | -- | Exchange auth code for JWT tokens |
| `DELETE` | `/auth/session` | -- | Logout (clears refresh token cookie) |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/users/me` | Required | Get authenticated user's private profile |
| `PATCH` | `/users/me` | Required | Update profile (displayName, bio) |
| `POST` | `/users/me/api-keys` | Required | Create a new API key |
| `GET` | `/users/me/api-keys` | Required | List all API keys |
| `DELETE` | `/users/me/api-keys/:id` | Required | Revoke an API key |
| `GET` | `/users/:username` | -- | Get public profile |

### Skills

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/skills` | Optional | List/search skills (cursor-paginated) |
| `GET` | `/skills/:slug` | Optional | Get skill detail with versions and composition |
| `POST` | `/skills` | Required | Create a new skill |
| `PATCH` | `/skills/:slug` | Required | Update skill metadata |
| `POST` | `/skills/:slug/publish` | Required | Publish a draft skill |
| `DELETE` | `/skills/:slug` | Required | Archive a skill |
| `PUT` | `/skills/:slug/composition` | Required | Set skill composition (chain of child skills) |
| `DELETE` | `/skills/:slug/composition` | Required | Remove composition |

**Skill query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Full-text search across name, description, tags |
| `author` | string | Filter by author username |
| `category` | string | Filter by category slug |
| `platform` | string | Filter by platform (`CLAUDE_CODE`, `CURSOR`, `CODEX_CLI`, `OTHER`) |
| `visibility` | string | Filter by visibility (`PUBLIC`, `PRIVATE`, `UNLISTED`) |
| `minScore` | number | Minimum quality score (0-100) |
| `sort` | string | `newest` (default), `most_installed`, `highest_rated`, `recently_updated` |
| `cursor` | string | Cursor for pagination |
| `limit` | number | Results per page (1-100, default 20) |

### Versions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/skills/:slug/versions` | -- | List all versions |
| `GET` | `/skills/:slug/versions/:version` | -- | Get specific version details |
| `POST` | `/skills/:slug/versions` | Required | Create a new version |
| `GET` | `/skills/:slug/versions/:from/diff/:to` | -- | Diff between two versions |

### Reviews

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/skills/:slug/reviews` | Optional | List reviews for a skill |
| `GET` | `/skills/:slug/reviews/stats` | -- | Get review statistics |
| `POST` | `/skills/:slug/reviews` | Required | Create a review (1-5 rating + text) |
| `PATCH` | `/skills/reviews/:id` | Required | Update a review |
| `DELETE` | `/skills/reviews/:id` | Required | Delete a review |
| `POST` | `/skills/reviews/:id/vote` | Required | Vote a review as helpful/unhelpful |
| `POST` | `/skills/reviews/:id/response` | Required | Creator responds to a review |

### Search

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/search` | -- | Search skills (same query params as `/skills`) |
| `GET` | `/search/suggestions?q=` | -- | Autocomplete suggestions (skills + tags) |

### Install Tracking

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/skills/:slug/install` | Optional | Record an installation event |

### Categories & Tags

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/categories` | -- | List all categories (sorted) |
| `GET` | `/categories/:slug` | -- | Get category detail |
| `GET` | `/tags?q=&limit=` | -- | List/search tags with skill counts |

### Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body or query failed validation |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Resource already exists (unique constraint) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## CLI Usage

The CLI is published as `skills-hub` on npm. Use it directly with `npx` or install globally.

### Commands

```bash
# Search for skills
npx skills-hub search "code review"
npx skills-hub search "deploy" --category deploy --sort highest_rated

# Install a skill
npx skills-hub install review-code
npx skills-hub install review-code --version 2.1.0
npx skills-hub install review-code --target cursor

# List installed skills
npx skills-hub list
npx skills-hub ls

# Update installed skills
npx skills-hub update           # Update all skills
npx skills-hub update review-code  # Update a specific skill

# Authenticate
npx skills-hub login             # Opens GitHub OAuth in browser
npx skills-hub login --api-key sk_abc123  # Use an API key
```

### Install Targets

The CLI auto-detects the appropriate install directory:

| Platform | Install Path |
|----------|-------------|
| Claude Code | `~/.claude/skills/<slug>/SKILL.md` |
| Cursor | `~/.cursor/skills/<slug>/SKILL.md` |

Override with `--target cursor` or `--target claude-code`.

### Configuration

CLI config is stored at `~/.skills-hub/config.json`:

```json
{
  "apiUrl": "https://api.skills-hub.ai",
  "accessToken": "..."
}
```

---

## Quality Scoring

Every skill receives an automated quality score from 0 to 100, computed from two dimensions:

### Schema Score (0-25 points)

| Criteria | Points |
|----------|--------|
| All required fields present (name, description, instructions, version) | 10 |
| Description >= 50 characters | 5 |
| Valid semver version | 5 |
| Valid category slug | 5 |

### Instruction Score (0-75 points)

| Criteria | Points |
|----------|--------|
| Instructions >= 500 characters | 10 |
| Instructions >= 2,000 characters | 5 |
| Structured phases/steps detected | 15 |
| Input/output specification present | 10 |
| Error handling instructions | 10 |
| Guardrails / strict rules defined | 10 |
| Examples or code blocks present | 10 |
| Output format specification | 5 |

**Minimum score to publish:** 20

---

## SKILL.md Format

Skills use a YAML frontmatter format:

```markdown
---
name: My Skill
description: What this skill does in one sentence
version: 1.0.0
category: review
platforms:
  - CLAUDE_CODE
  - CURSOR
---

Your skill instructions go here. This is the content that gets
loaded as context when the skill is invoked.

## Phase 1: Analysis
...

## Phase 2: Implementation
...
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Display name (1-100 chars) |
| `description` | Yes | Short description (10-1,000 chars) |
| `version` | Yes | Semver version (e.g., `1.0.0`) |
| `category` | No | Category slug (see Categories below) |
| `platforms` | No | Target platforms array |

### Categories

`build`, `test`, `qa`, `review`, `deploy`, `docs`, `security`, `ux`, `analysis`, `productivity`, `integration`, `combo`, `meta`

### Platforms

`CLAUDE_CODE`, `CURSOR`, `CODEX_CLI`, `OTHER`

---

## Database Schema

The data model uses PostgreSQL 16 with Prisma 6:

- **User** -- GitHub-linked accounts with username, avatar, bio
- **ApiKey** -- Hashed API keys with prefix display and expiry
- **Skill** -- Core entity with slug, quality score, denormalized counters
- **SkillVersion** -- Versioned instructions with changelogs and per-version quality scores
- **Category** -- Curated taxonomy (13 categories, seeded on setup)
- **Tag / SkillTag** -- User-applied freeform tags (many-to-many)
- **Review / ReviewVote / ReviewResponse** -- Ratings, helpfulness voting, creator responses
- **Install** -- Installation tracking by platform and version
- **Composition / CompositionSkill** -- Skill chaining with sort order and parallel execution flags

---

## Deployment

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | -- | PostgreSQL connection string |
| `GITHUB_CLIENT_ID` | Yes | -- | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | Yes | -- | GitHub OAuth app client secret |
| `GITHUB_CALLBACK_URL` | Yes | -- | OAuth callback URL |
| `JWT_SECRET` | Yes | -- | JWT signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | No | `15m` | Access token TTL |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | No | `7` | Refresh token TTL in days |
| `FRONTEND_URL` | No | `http://localhost:3001` | Frontend origin (CORS) |
| `API_URL` | No | `http://localhost:3000` | API base URL |
| `PORT` | No | `3000` | API server port |
| `HOST` | No | `0.0.0.0` | API server bind address |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |

### Production Build

```bash
pnpm build
pnpm --filter @skills-hub/api start   # Start API server
pnpm --filter @skills-hub/web start   # Start Next.js server
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes with tests alongside features
4. Run `pnpm test` and `pnpm lint` to verify
5. Submit a pull request

---

## License

MIT
