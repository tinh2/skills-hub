# Scalability Audit — skills-hub.ai
Date: 2026-02-28
Score: 6/10

## Executive Summary

The skills-hub codebase has a solid architectural foundation: cursor-based pagination is implemented on core list endpoints, Prisma atomic `increment` is used for denormalized counters, rate limiting covers sensitive routes, and the schema has good index coverage on the Skill model. However, several patterns would cause failures or severe degradation at scale.

The two most critical issues are: (1) the `listReviews` endpoint loads ALL reviews for a skill with no pagination, eagerly fetching every vote for every review (O(reviews * votes) data transfer), and (2) the `getFeaturedSkillPerCategory` endpoint issues N+1 sequential queries — one per category — on every call to `/categories/featured`. Both would cause timeouts or OOM under moderate traffic.

Beyond those, search relies on `ILIKE` (sequential scan) with no full-text index, the `autoJoinGithubOrgs` function issues N+1 membership checks, the `org-analytics` install groupBy is performed on raw timestamps (producing one row per install, not per day), and the PrismaClient is a singleton with no connection pool tuning.

---

## Critical Issues (would fail at 10K users)

### C1. Reviews endpoint is fully unbounded — no pagination, eager vote loading

**File:** `/Users/thole/personal/skills-hub/apps/api/src/modules/review/review.service.ts`, lines 5-44

```typescript
export async function listReviews(
  slug: string,
  currentUserId: string | null,
): Promise<ReviewSummary[]> {
  // ...
  const reviews = await prisma.review.findMany({
    where: { skillId: skill.id },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { username: true, avatarUrl: true } },
      votes: true,        // <-- loads ALL votes for ALL reviews
      response: true,
    },
  });
```

**Impact:** A popular skill with 500 reviews and 10,000 votes would return the entire dataset in a single query. The `votes: true` eager-loads every ReviewVote row. The in-memory `.filter()` on line 23-24 to compute helpfulCount means all vote data is transferred from the database just to count it. At 10K users this endpoint could return megabytes of JSON and take seconds.

**Fix:**
1. Add cursor-based pagination (match the pattern in `listSkills`).
2. Replace `votes: true` with a database-side `_count` aggregation:
   ```typescript
   _count: { select: { votes: { where: { helpful: true } } } }
   ```
   Or use `groupBy` to compute helpful/unhelpful counts.
3. For `userVote`, do a single batch query like `batchHasUserLiked` instead of loading all votes.

---

### C2. getFeaturedSkillPerCategory — N+1 sequential queries

**File:** `/Users/thole/personal/skills-hub/apps/api/src/modules/category/category.service.ts`, lines 57-80

```typescript
export async function getFeaturedSkillPerCategory() {
  const categories = await prisma.category.findMany({ ... });
  const result: Record<string, SkillSummary | null> = {};

  for (const cat of categories) {
    const skill = await prisma.skill.findFirst({   // <-- 1 query PER category
      where: { categoryId: cat.id, status: "PUBLISHED", ... },
      orderBy: { likeCount: "desc" },
      select: summarySelect,   // <-- includes 4 sub-selects (tags, versions, compositionOf, org)
    });
    result[cat.slug] = skill ? toSummary(skill) : null;
  }
  return result;
}
```

**Impact:** With 10 categories, this is 11 queries (1 + 10), each with nested includes. The `summarySelect` includes sub-queries for tags, latest version, composition, and org — so it's really 11 * ~5 = 55 queries. This endpoint is called on every browse page load (via the `featured` query in `browse/page.tsx`). At 10K concurrent users, this will saturate the database connection pool.

**Fix:**
1. Use a single raw SQL query with `DISTINCT ON (categoryId)` or a window function to get the top skill per category in one round-trip.
2. Cache the result for 5-10 minutes (the data changes slowly).

---

### C3. Search uses ILIKE — sequential table scan

**File:** `/Users/thole/personal/skills-hub/apps/api/src/modules/search/search.service.ts`, lines 37-46

```typescript
where.OR = [
  { name: { contains: searchTerm, mode: "insensitive" } },
  { description: { contains: searchTerm, mode: "insensitive" } },
  { tags: { some: { tag: { name: { contains: searchTerm.toLowerCase(), mode: "insensitive" } } } } },
];
```

**Impact:** Prisma's `contains` with `mode: "insensitive"` compiles to `ILIKE '%term%'` in PostgreSQL, which cannot use B-tree indexes and requires a full sequential scan. The same pattern exists in `skill.service.ts` line 271-275 (`listSkills`). At 100K skills, search response times would be 1-5 seconds.

The code comments at line 9 acknowledge this: "Uses ILIKE for v1 — will be replaced with tsvector/GIN index for production scale."

**Fix:**
1. Add a generated `tsvector` column to the Skill model (via a Prisma migration + raw SQL).
2. Create a GIN index on it.
3. Use `$queryRaw` for search queries with `ts_rank` ordering.

---

### C4. PrismaClient singleton with no connection pool configuration

**File:** `/Users/thole/personal/skills-hub/apps/api/src/common/db.ts`, lines 1-3

```typescript
export const prisma = new PrismaClient();
```

**Impact:** The default Prisma connection pool size is `num_cpus * 2 + 1`, typically 5-9 connections. With concurrent requests hitting database-heavy endpoints (featured, search, reviews), the pool will be exhausted. Prisma queues requests when the pool is full, leading to cascading timeouts.

**Fix:**
1. Configure the connection pool via the DATABASE_URL parameter: `?connection_limit=20&pool_timeout=10`.
2. Or set it explicitly in the Prisma schema: `url = env("DATABASE_URL")` with `connectionLimit` in the datasource.
3. Add connection pool logging to monitor saturation.

---

### C5. org-analytics recentInstalls groupBy produces one row per install, not per day

**File:** `/Users/thole/personal/skills-hub/apps/api/src/modules/org/org-analytics.service.ts`, lines 54-68

```typescript
const recentInstalls = await prisma.install.groupBy({
  by: ["createdAt"],   // <-- groups by exact timestamp, not date
  where: {
    skill: { orgId: org.id },
    createdAt: { gte: thirtyDaysAgo },
  },
  _count: true,
});
```

**Impact:** `createdAt` is a `DateTime` (timestamp with time zone). Grouping by exact timestamp means every install gets its own group — the groupBy returns as many rows as there are installs. The subsequent JavaScript aggregation into `dateCountMap` masks this, but the database still returns and transfers every row. For an org with 100K installs in 30 days, this returns 100K rows.

**Fix:** Use `$queryRaw` with `DATE(created_at)` truncation:
```sql
SELECT DATE(created_at) as date, COUNT(*) as count
FROM "Install"
WHERE skill_id IN (SELECT id FROM "Skill" WHERE org_id = $1)
  AND created_at >= $2
GROUP BY DATE(created_at)
ORDER BY date
```

---

## Warning Issues (would degrade at 100K users)

### W1. autoJoinGithubOrgs — N+1 membership existence checks

**File:** `/Users/thole/personal/skills-hub/apps/api/src/modules/org/github-sync.service.ts`, lines 105-143

```typescript
for (const org of connectedOrgs) {
  // ...
  const existing = await prisma.orgMembership.findUnique({  // <-- 1 query per org
    where: { orgId_userId: { orgId: org.id, userId } },
  });
  if (existing) continue;

  await prisma.orgMembership.create({ ... });  // <-- 1 more query per org
}
```

**Impact:** This runs on EVERY login (`exchangeGithubCode` calls `autoJoinGithubOrgs`). If there are 50 GitHub-connected orgs, that's up to 100 additional queries during authentication. At scale this adds 200-500ms to every login.

**Fix:** Batch the existence check:
```typescript
const existingMemberships = await prisma.orgMembership.findMany({
  where: { userId, orgId: { in: matchingOrgIds } },
  select: { orgId: true },
});
const existingOrgIds = new Set(existingMemberships.map(m => m.orgId));
// Then createMany for the missing ones
```

---

### W2. doSync (GitHub sync) — N+1 membership checks for matched users

**File:** `/Users/thole/personal/skills-hub/apps/api/src/modules/org/github-sync.service.ts`, lines 186-197

```typescript
for (const user of matchedUsers) {
  const existing = await prisma.orgMembership.findUnique({  // <-- 1 query per user
    where: { orgId_userId: { orgId, userId: user.id } },
  });
  if (!existing) {
    await prisma.orgMembership.create({ ... });  // <-- 1 more query per user
  }
}
```

**Impact:** A GitHub org with 500 members who are also skills-hub users triggers 500-1000 sequential queries during manual sync. This could timeout for large organizations.

**Fix:** Same batch pattern — fetch all existing memberships in one query, then `createMany` for the missing ones.

---

### W3. API key auth updates lastUsedAt on every request

**File:** `/Users/thole/personal/skills-hub/apps/api/src/common/auth.ts`, lines 61-63

```typescript
await prisma.apiKey.update({
  where: { id: apiKey.id },
  data: { lastUsedAt: new Date() },
});
```

**Impact:** Every API-key-authenticated request writes to the database. For CLI users and automated consumers, this means high-frequency writes to the ApiKey table. At 100K API calls/day this creates unnecessary write load and row-level lock contention.

**Fix:** Debounce the update — only write `lastUsedAt` if the current value is more than N minutes old:
```typescript
if (!apiKey.lastUsedAt || Date.now() - apiKey.lastUsedAt.getTime() > 5 * 60 * 1000) {
  await prisma.apiKey.update({ ... });
}
```

---

### W4. getPublicProfile and getPrivateProfile load all user skills to compute totalInstalls

**File:** `/Users/thole/personal/skills-hub/apps/api/src/modules/user/user.service.ts`, lines 6-30

```typescript
const user = await prisma.user.findUnique({
  where: { username },
  include: {
    skills: {
      where: { status: "PUBLISHED" },
      select: { installCount: true },   // <-- fetches every published skill row
    },
  },
});
// ...
totalInstalls: user.skills.reduce((sum, s) => sum + s.installCount, 0),
```

**Impact:** A prolific author with 500 published skills would transfer 500 rows just to sum one column. This runs on every profile view.

**Fix:** Use Prisma's `aggregate` instead:
```typescript
const installAgg = await prisma.skill.aggregate({
  where: { authorId: user.id, status: "PUBLISHED" },
  _sum: { installCount: true },
});
```

---

### W5. listVersions has no pagination

**File:** `/Users/thole/personal/skills-hub/apps/api/src/modules/version/version.service.ts`, lines 7-23

```typescript
export async function listVersions(slug: string): Promise<VersionSummary[]> {
  // ...
  const versions = await prisma.skillVersion.findMany({
    where: { skillId: skill.id },
    orderBy: { createdAt: "desc" },
    // no take/limit
  });
```

**Impact:** A skill with hundreds of versions (possible with automated CI/CD publishing) would return all of them. The frontend (`skills/[slug]/page.tsx` line 468) does `.slice(0, 5)` client-side, but the API still transfers the full list.

**Fix:** Add `take: 20` or support cursor-based pagination. The frontend only shows 5.

---

### W6. listInvites and listTemplates have no pagination

**File:** `/Users/thole/personal/skills-hub/apps/api/src/modules/org/org.service.ts`

- `listInvites` (line 414-418): Returns ALL pending invites with no limit.
- `listTemplates` (line 463-468): Returns ALL templates with no limit.

**Impact:** Low risk today (ORG_LIMITS caps pending invites and templates), but the endpoints don't enforce a `take` limit at the database level.

**Fix:** Add `take` limits matching the business constraints.

---

### W7. Tag endpoint missing SkillTag index

**File:** `/Users/thole/personal/skills-hub/apps/api/prisma/schema.prisma`, lines 162-169

```prisma
model SkillTag {
  skillId String
  tagId   String
  // ...
  @@id([skillId, tagId])
}
```

**Impact:** The composite primary key `[skillId, tagId]` supports lookups by skillId but NOT efficient lookups by tagId alone. The tag autocomplete endpoint (`tag.routes.ts`) includes `_count: { select: { skills: true } }`, which requires scanning the SkillTag table by tagId. Without an index on `tagId`, this becomes a sequential scan at scale.

**Fix:** Add `@@index([tagId])` to the SkillTag model.

---

### W8. Global rate limit of 300/min is generous for unauthenticated traffic

**File:** `/Users/thole/personal/skills-hub/apps/api/src/server.ts`, lines 39-42

```typescript
await app.register(rateLimit, {
  max: 300,
  timeWindow: "1 minute",
});
```

**Impact:** 300 requests/minute per IP is generous. A single bad actor could make 5 requests/second to expensive endpoints (search, featured, reviews). Authenticated write endpoints have granular limits (20-60/min), but read endpoints (list reviews, search suggestions, version diffs) use only the global 300/min limit.

**Fix:**
1. Lower the global limit to 100/min for unauthenticated users.
2. Add specific rate limits to expensive read endpoints (version diff, analytics, featured).

---

### W9. No Redis caching despite Redis being in docker-compose

**File:** `/Users/thole/personal/skills-hub/docker-compose.yml`

```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
```

**Impact:** Redis is provisioned but never referenced in the API code. There is no caching layer. Every request hits PostgreSQL directly. The `getFeaturedSkillPerCategory` result, category lists, and popular search results are excellent caching candidates.

**Fix:**
1. Add `@fastify/redis` or `ioredis` to the API.
2. Cache `getFeaturedSkillPerCategory` (5-10 min TTL).
3. Cache category list (30 min TTL).
4. Cache search suggestions (2 min TTL).

---

## Info (best practices)

### I1. Denormalized counter drift is mitigated but not fully covered

The `likeCount` and `installCount` use atomic `increment`/`decrement` inside transactions, and race conditions are caught via unique constraint errors. However, the `reviewCount` and `avgRating` are recomputed via `aggregate` in the review transaction — this is correct and drift-resistant.

One edge case: if the `toggleLike` like-path catches a P2002 (duplicate), it falls through to the "liked" return but the `increment` in the transaction was never executed. The `likeCount` would be correct because the transaction was rolled back. This is fine.

### I2. Missing database index for search autocomplete suggestions

`getSearchSuggestions` queries `name: { contains: q, mode: "insensitive" }` on Skill and `name: { contains: q.toLowerCase() }` on Tag. The Tag model has `@@index([name])` but it won't help with `ILIKE '%q%'` patterns. This is a subset of issue C3.

### I3. Skill query `contains` on description can't use the existing index

The `@@index([qualityScore(sort: Desc)])` and other Skill indexes won't help with `description: { contains: ... }`. This is again part of C3.

### I4. The skill detail page fetches reviews separately without staleTime override

**File:** `/Users/thole/personal/skills-hub/apps/web/src/app/skills/[slug]/page.tsx`, line 28-32

```typescript
const { data: reviewList } = useQuery({
  queryKey: ["reviews", slug],
  queryFn: () => reviewsApi.list(slug),
  enabled: !!skill,
});
```

The global `staleTime` of 60 seconds is set in providers.tsx, which is reasonable. No action needed — this is well-configured.

### I5. Frontend bundle size: ReactMarkdown + fflate imported on skill detail page

**File:** `/Users/thole/personal/skills-hub/apps/web/src/app/skills/[slug]/page.tsx`

```typescript
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { zipSync, strToU8 } from "fflate";
```

These are loaded for every visitor to any skill detail page. `react-markdown` is ~60KB gzipped, `remark-gfm` is ~15KB, and `fflate` is ~13KB. Only composition skills need `fflate`, and only the instructions section needs markdown rendering.

**Fix:** Lazy-load `fflate` with dynamic import when the user clicks "Download All." Consider rendering markdown server-side for the instructions section.

### I6. Dashboard fetches skills with limit: 50 — no pagination

**File:** `/Users/thole/personal/skills-hub/apps/web/src/app/dashboard/page.tsx`, line 19

```typescript
queryFn: () => skillsApi.list({ author: user!.username, sort: "recently_updated", limit: 50 }),
```

Same on line 25 for drafts. A prolific user with 200+ skills would never see them all. Should add infinite scroll pagination like the browse page.

### I7. User profile page fetches skills with limit: 50

**File:** `/Users/thole/personal/skills-hub/apps/web/src/app/u/[username]/page.tsx`, line 19

```typescript
queryFn: () => skillsApi.list({ author: username, sort: "newest", limit: 50 }),
```

Same issue as I6.

### I8. GitHub access token stored in plaintext

**File:** `/Users/thole/personal/skills-hub/apps/api/prisma/schema.prisma`, line 19

```prisma
githubAccessToken String?
```

The token is stored unencrypted. While `GITHUB_TOKEN_ENCRYPTION_KEY` exists as an optional env var in `env.ts` (line 21), it is not used anywhere in the codebase. At scale, a database breach would expose all user GitHub tokens.

---

## Recommendations

### Priority 1 — Fix before launch (Critical)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| C1 | Paginate reviews + aggregate vote counts | Medium | Prevents OOM on popular skills |
| C2 | Replace N+1 featured query with single SQL + cache | Medium | Prevents DB saturation on browse page |
| C3 | Add tsvector/GIN index for search | Medium | Search remains usable beyond 10K skills |
| C4 | Configure Prisma connection pool | Low | Prevents connection exhaustion under load |
| C5 | Fix analytics groupBy to use DATE() | Low | Prevents returning 100K rows for analytics |

### Priority 2 — Fix before 100K users (Warning)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| W1-W2 | Batch GitHub sync membership checks | Low | Login latency, sync timeout prevention |
| W3 | Debounce API key lastUsedAt writes | Low | Reduces write amplification |
| W4 | Use aggregate for totalInstalls | Low | Profile page response time |
| W7 | Add tagId index on SkillTag | Trivial | Tag autocomplete performance |
| W8 | Tighten rate limits for expensive endpoints | Low | DoS resilience |
| W9 | Wire up Redis caching | Medium | Overall response times, DB load reduction |

### Priority 3 — Best practices

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| I5 | Lazy-load fflate and consider SSR markdown | Low | Reduces JS bundle by ~90KB |
| I6-I7 | Add pagination to dashboard and user profile | Low | UX for prolific authors |
| I8 | Encrypt GitHub tokens at rest | Medium | Security posture |
| W5-W6 | Add limits to listVersions, listInvites, listTemplates | Low | Defensive bounds |
