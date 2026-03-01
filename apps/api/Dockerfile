# Build context: repository root (.)
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/skill-parser/package.json packages/skill-parser/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/skill-parser/node_modules ./packages/skill-parser/node_modules

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/skill-parser/ packages/skill-parser/
COPY apps/api/ apps/api/

# Build shared packages first
RUN pnpm --filter @skills-hub/shared build
RUN pnpm --filter @skills-hub/skill-parser build

# Generate Prisma client and build API
RUN pnpm --filter @skills-hub/api exec prisma generate
RUN pnpm --filter @skills-hub/api build

# Production image
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser
WORKDIR /app

ENV NODE_ENV=production

# Copy built output and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/skill-parser/node_modules ./packages/skill-parser/node_modules
COPY --from=builder /app/packages/skill-parser/dist ./packages/skill-parser/dist
COPY --from=builder /app/packages/skill-parser/package.json ./packages/skill-parser/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./

EXPOSE 3000

WORKDIR /app/apps/api

COPY --chown=appuser:nodejs apps/api/docker-entrypoint.sh /app/apps/api/docker-entrypoint.sh
RUN chmod +x /app/apps/api/docker-entrypoint.sh

USER appuser

ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
