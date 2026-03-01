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

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/skill-parser/ packages/skill-parser/
COPY apps/web/ apps/web/

# Build shared packages first
RUN pnpm --filter @skills-hub/shared build
RUN pnpm --filter @skills-hub/skill-parser build

# Build Next.js app (NEXT_PUBLIC_* vars must be set at build time)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN pnpm --filter @skills-hub/web build

# Production image
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

ENV NODE_ENV=production

# Copy full build output and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/apps/web/next.config.ts ./apps/web/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/skill-parser/dist ./packages/skill-parser/dist
COPY --from=builder /app/packages/skill-parser/package.json ./packages/skill-parser/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./

EXPOSE 3001

WORKDIR /app/apps/web

CMD ["pnpm", "next", "start", "-p", "3001", "-H", "0.0.0.0"]
