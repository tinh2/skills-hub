# Build context: repository root (.)
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/skill-parser/package.json packages/skill-parser/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/skill-parser/node_modules ./packages/skill-parser/node_modules

COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/skill-parser/ packages/skill-parser/
COPY apps/web/ apps/web/

# Build shared packages first
RUN pnpm --filter @skills-hub/shared build
RUN pnpm --filter @skills-hub/skill-parser build

# Build Next.js app (standalone output)
RUN pnpm --filter @skills-hub/web build

# Production image
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
