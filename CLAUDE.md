# skills-hub.ai

Claude Code skill marketplace — full-stack TypeScript monorepo.

## Architecture

- **Monorepo:** Turborepo + pnpm workspaces
- **Backend:** `apps/api` — Fastify 5 + Prisma 6 + PostgreSQL 16
- **Frontend:** `apps/web` — Next.js 15 (App Router) + Tailwind 4
- **CLI:** `apps/cli` — Commander.js, published as `skills-hub` on npm
- **Shared:** `packages/shared` — types, Zod schemas, constants
- **Parser:** `packages/skill-parser` — SKILL.md frontmatter parser

## Conventions

- API routes: `/api/v1/` prefix on all endpoints
- Domain-split modules: `apps/api/src/modules/<domain>/` (routes, service, repository)
- Username is immutable after first GitHub login
- Public user API never exposes email (PII separation)
- Cursor-based pagination (not offset)
- Prisma atomic `increment` for denormalized counters
- Tests alongside features (in same module directory)

## Commands

```bash
pnpm install                    # install all deps
pnpm dev                        # start all apps in dev mode
pnpm build                      # build all apps
pnpm test                       # run all tests
pnpm db:migrate                 # run Prisma migrations
pnpm db:seed                    # seed categories
pnpm db:studio                  # open Prisma Studio
docker compose up -d            # start PostgreSQL + Redis
```

## Environment

Copy `.env.example` to `apps/api/.env` and fill in values.
Requires: PostgreSQL 16, Node.js 22+, pnpm 9+.
