# Feature Ideation: skills-hub.ai MVP

**Date:** 2026-02-28
**Source:** Competitive gap analysis + domain expertise from 100+ production skills

---

## Feature Catalog

### TIER 1: MVP Core (Must Ship)

---

#### F-001: Skill Browsing & Discovery

**Priority:** HIGH
**Effort:** M
**Rationale:** Table stakes. Every competitor has this. Without browsing, there is no marketplace.

**Description:**
Web-based catalog where users can browse skills by category, search by keyword, and filter by platform compatibility, category, author, and quality score.

**Key Requirements:**
- Grid/list view of skill cards showing name, description, category, version, quality score, install count
- Full-text search across skill names, descriptions, and instructions
- Filter by: category (build, test, QA, docs, deploy, combo, meta), platform (Claude Code, Codex, Cursor), quality score range
- Sort by: newest, most installed, highest rated, recently updated
- Skill detail page showing full metadata, instructions preview, version history, reviews, install command
- Responsive design — works on desktop and mobile
- SEO-optimized skill pages for organic discovery

**Differentiator vs. competitors:**
- Category taxonomy based on real-world skill patterns (not generic AI categories)
- Quality score prominently displayed (not hidden)
- Version number and last-updated date visible on cards

---

#### F-002: Skill Upload & Publishing

**Priority:** HIGH
**Effort:** M
**Rationale:** The supply side of the marketplace. Without uploads, there is no catalog growth.

**Description:**
Authenticated users can publish skills by either uploading a SKILL.md file directly or connecting a GitHub repository. Skills go through a validation pipeline before being published.

**Key Requirements:**
- Upload a SKILL.md file via web form or API
- GitHub import: provide a repo URL containing skills, auto-detect SKILL.md files
- Validation pipeline: schema check (name, description, version, category, instructions all present), instruction quality analysis, duplicate detection
- Draft/published states — creators can preview before publishing
- Edit/update published skills (creates new version)
- Bulk import from a GitHub skills directory
- Auto-populate metadata from SKILL.md frontmatter

**Differentiator vs. competitors:**
- Validation pipeline catches broken skills before they are published
- GitHub sync keeps skills up-to-date automatically

---

#### F-003: User Accounts & Profiles

**Priority:** HIGH
**Effort:** M
**Rationale:** Identity enables trust, reputation, and community. Every serious marketplace needs accounts.

**Description:**
User registration and authentication via GitHub OAuth. User profiles show published skills, activity, and reputation.

**Key Requirements:**
- GitHub OAuth login (primary) — developer-first
- Optional email/password registration
- User profile page: avatar, bio, GitHub link, published skills, install count, join date
- Creator badge for users who have published 5+ skills
- Profile settings: notification preferences, display name, bio
- API key management for CLI authentication

**Differentiator vs. competitors:**
- GitHub-connected identity (vs. anonymous aggregators)
- Creator reputation visible (PromptBase model adapted for developers)
- API key management for CLI workflows

---

#### F-004: Skill Installation (CLI + Web)

**Priority:** HIGH
**Effort:** M
**Rationale:** The core value action. Users must be able to go from discovery to installed skill in seconds.

**Description:**
CLI tool (`skills-hub` or `sh`) and web-based "copy install command" for installing skills into Claude Code, Codex CLI, or Cursor.

**Key Requirements:**
- CLI tool: `npx skills-hub install <skill-name>` — downloads SKILL.md to `~/.claude/skills/<name>/`
- CLI: `skills-hub search <query>` — search from terminal
- CLI: `skills-hub list` — list installed skills from this marketplace
- CLI: `skills-hub update` — update all installed skills to latest versions
- CLI: `skills-hub update <skill-name>` — update specific skill
- Web: "Copy install command" button on skill detail page
- Web: "Copy SKILL.md" button for manual install
- Platform detection: auto-detect target directory (Claude Code, Cursor, etc.)
- Installation tracking: record installs for analytics (anonymized)

**Differentiator vs. competitors:**
- Full CLI tool (not just copy-paste like SkillHub)
- Update management built in (nobody does this well)
- Multi-platform install target detection

---

#### F-005: Categories & Tags

**Priority:** HIGH
**Effort:** S
**Rationale:** Organization is critical for discovery. Without good taxonomy, large catalogs become unusable.

**Description:**
Hierarchical category system with user-applied tags for fine-grained classification.

**Key Requirements:**
- Primary categories derived from real skill patterns:
  - **Build** — Project scaffolding, full build pipelines
  - **Test** — Unit tests, E2E tests, integration tests
  - **QA** — Quality assurance, manual test plans, bug detection
  - **Review** — Code review, architecture review, design review
  - **Deploy** — Infrastructure, CI/CD, AWS/GCP/Azure
  - **Docs** — README generation, API docs, changelogs
  - **Security** — Audits, vulnerability checks, compliance
  - **UX** — Accessibility, usability, design systems
  - **Analysis** — Domain analysis, competitive analysis, metrics
  - **Productivity** — Workflow automation, task management
  - **Integration** — Third-party service connectors
  - **Combo** — Multi-skill chains and compositions
  - **Meta** — Skills about skills (recall, evolve, promote)
- User-applied tags (freeform, with autocomplete from existing tags)
- Tag-based filtering on browse page
- Category icons for visual distinction

**Differentiator vs. competitors:**
- Taxonomy derived from production skill usage patterns (not generic AI categories)
- "Combo" and "Meta" categories are unique to skill ecosystems

---

#### F-006: Search & Filtering

**Priority:** HIGH
**Effort:** M
**Rationale:** Users need to find the right skill quickly. Good search is the difference between a useful platform and a dumping ground.

**Description:**
Full-text search with filtering, faceted results, and relevance ranking.

**Key Requirements:**
- Full-text search across name, description, instructions, tags
- Faceted filters: category, platform, quality score, free/premium
- Search result relevance ranking (name matches > description > instructions)
- Search suggestions / autocomplete
- "Similar skills" recommendations on skill detail pages
- Zero-result handling with suggestions
- Search analytics (what people search for but don't find)

**Differentiator vs. competitors:**
- Instruction-level search (search within the actual skill instructions, not just metadata)
- Search analytics to identify supply gaps

---

### TIER 2: Quality & Trust (Ship Soon After MVP)

---

#### F-007: Skill Validation & Quality Scoring

**Priority:** HIGH
**Effort:** L
**Rationale:** Critical gap #1 from competitive analysis. Quality scoring is the top differentiator.

**Description:**
Automated validation pipeline that tests skills for correctness, completeness, and quality. Produces a composite quality score displayed on every skill card.

**Key Requirements:**
- **Schema validation:** Verify SKILL.md has all required frontmatter fields (name, description, version, category, instructions)
- **Instruction quality analysis:**
  - Instruction length and detail level
  - Presence of structured phases/steps
  - Clear input/output specification
  - Error handling instructions
  - Strict rules / guardrails defined
- **Behavioral testing (Phase 2):**
  - Run skill against sample prompts in a sandboxed Claude environment
  - Measure output quality, instruction following, error handling
  - Detect skills that produce no meaningful output
- **Composite score:** 0-100 scale combining schema, instruction quality, behavioral test results
- **Score breakdown visible:** Users can see why a skill scored what it did
- **Re-scoring on updates:** Automatically re-evaluate when a skill is updated

**Differentiator vs. competitors:**
- Behavioral testing is unprecedented (SkillHub does text analysis only)
- Transparent scoring breakdown builds trust
- Re-scoring on updates encourages improvement

---

#### F-008: Ratings & Reviews

**Priority:** HIGH
**Effort:** M
**Rationale:** Community quality signals complement automated scoring. Trust requires social proof.

**Description:**
Users can rate skills (1-5 stars) and write text reviews. Reviews are moderated and displayed on skill detail pages.

**Key Requirements:**
- 1-5 star rating system
- Text review with optional structured fields (what they used it for, what worked, what didn't)
- Review moderation (spam detection, profanity filter)
- Helpful/not helpful voting on reviews
- Average rating displayed on skill cards
- Creator can respond to reviews
- Rating aggregation: overall score + breakdown by category (usefulness, documentation, reliability)

**Differentiator vs. competitors:**
- No skill marketplace has user reviews (only PromptBase does for prompts)
- Structured review fields generate useful feedback for creators

---

#### F-009: Version Management

**Priority:** HIGH
**Effort:** L
**Rationale:** Critical gap #2. Skills evolve significantly over time. The user's own catalog has skills at v3, v7, v8.

**Description:**
Full semantic versioning for skills with changelogs, update notifications, and rollback capability.

**Key Requirements:**
- Semantic versioning (major.minor.patch) displayed on skill pages
- Version history with diffs between versions
- Changelog entries (creator-written or auto-generated from diffs)
- Update notifications: when an installed skill has a new version, CLI shows notification
- Rollback: install a previous version if the update breaks something
- Breaking change detection: major version bump when instructions change significantly
- GitHub webhook: auto-create new version when source repo is updated

**Differentiator vs. competitors:**
- No competitor does skill versioning (Smithery has basic "update from source")
- Rollback capability is unique
- Breaking change detection prevents surprise breakage

---

### TIER 3: Differentiation Features (Build After Core)

---

#### F-010: Skill Composition Builder

**Priority:** MEDIUM
**Effort:** XL
**Rationale:** Critical gap #3. The user's catalog demonstrates powerful skill chaining (/research = /compete + /new-features). No platform enables this.

**Description:**
Visual builder for creating combo skills that chain multiple skills together, with a dependency graph showing execution order.

**Key Requirements:**
- Visual skill chain editor (drag-and-drop skills into a pipeline)
- Dependency graph: which skills depend on which
- Sequential vs. parallel execution markers
- Data flow between skills (output of skill A feeds into skill B)
- Auto-generate combo SKILL.md from visual composition
- Validate composition: detect circular dependencies, missing skills
- Share compositions as first-class skills in the marketplace
- "Composition view" on combo skills showing the chain

**Differentiator vs. competitors:**
- Nobody does this. FlowGPT has "remix" but that's editing, not composing.
- Cursor bundles are static packaging. This is dynamic orchestration.

---

#### F-011: Skill Preview / Playground

**Priority:** MEDIUM
**Effort:** XL
**Rationale:** Critical gap #1 deeper implementation. Let users try a skill before installing.

**Description:**
Sandboxed environment where users can test a skill with sample inputs and see the output, without installing it locally.

**Key Requirements:**
- "Try it" button on skill detail page
- Sandboxed Claude API call with the skill's instructions loaded
- User provides sample input/context
- Shows skill output in real-time
- Usage limits (3 free previews per day for free users)
- Preview results cached for the same input
- Creator can define sample inputs for their skills

**Differentiator vs. competitors:**
- No skill marketplace offers this
- FlowGPT lets you run prompts but not in a skills context
- Reduces "install and hope" friction dramatically

---

#### F-012: Creator Analytics Dashboard

**Priority:** MEDIUM
**Effort:** L
**Rationale:** Strategic gap #7. Creators need data to improve their skills and stay motivated.

**Description:**
Dashboard for skill creators showing install counts, usage patterns, review trends, and version adoption.

**Key Requirements:**
- Install count over time (daily/weekly/monthly chart)
- Active installs (how many users currently have this skill installed)
- Version adoption: what percentage of users are on each version
- Review summary: average rating trend, recent reviews
- Search impressions: how often the skill appears in search results
- Click-through rate: impressions to detail page views
- Geographic distribution of installs (anonymized)
- Revenue dashboard (if monetization enabled)

**Differentiator vs. competitors:**
- No skill marketplace offers creator analytics
- GPT Store has basic metrics but not this detailed
- Data-driven creators produce better skills

---

#### F-013: AI-Powered Skill Recommendations

**Priority:** MEDIUM
**Effort:** L
**Rationale:** Strategic gap #9. Keyword search is the norm; intelligent recommendation is the opportunity.

**Description:**
AI system that analyzes a user's installed skills, project type, and browsing history to recommend relevant skills.

**Key Requirements:**
- "Recommended for you" section on homepage
- "Users who installed X also installed Y" collaborative filtering
- "Skills for your stack" — analyze connected GitHub repos or CLI context to recommend
- "Complete your pipeline" — if user has /build but not /qa, recommend /qa
- Recommendation explanations: "Recommended because you use [X]"
- Opt-out: users can dismiss recommendations

**Differentiator vs. competitors:**
- No competitor does AI-powered skill recommendation
- "Complete your pipeline" is unique to skills that compose

---

#### F-014: Creator Monetization (Freemium)

**Priority:** MEDIUM
**Effort:** XL
**Rationale:** Critical gap #5. PromptBase proves the model. Sustainable creator ecosystem needs revenue sharing.

**Description:**
Freemium model where most skills are free, but creators can publish premium skills with a revenue-sharing model.

**Key Requirements:**
- Free tier: unlimited free skills, community contributions
- Premium skills: creator sets price ($1.99-$19.99)
- Revenue split: 80/20 (creator keeps 80%, same as PromptBase)
- Stripe integration for payments
- Creator payout management (monthly payouts, $25 minimum)
- Premium skill badge on cards
- Free trial: 1 free preview for premium skills
- Subscription option: $9.99/mo for unlimited premium skill access
- Enterprise licensing: bulk purchase for teams

**Differentiator vs. competitors:**
- No developer skill marketplace has monetization
- PromptBase model proven but adapted for executable skills (higher value = higher price ceiling)
- Subscription option doesn't exist in the prompt marketplace space

---

#### F-015: Private/Team Skill Sharing

**Priority:** MEDIUM
**Effort:** L
**Rationale:** Strategic gap #8. Enterprise teams need private skill repos. Cursor is planning this; we should ship first.

**Description:**
Team workspaces where organizations can share skills internally with role-based access.

**Key Requirements:**
- Team/organization accounts
- Private skill registries (not visible in public marketplace)
- Role-based access: admin, publisher, member
- Invite system: invite by email or GitHub org
- Team CLI: `skills-hub install --team <team-name> <skill-name>`
- Team analytics: see skill adoption across team members
- SSO integration (GitHub org, Google Workspace, Okta)
- Skill templates: team-wide defaults for new skills

**Differentiator vs. competitors:**
- Cursor is planning this but hasn't shipped
- No skill marketplace offers private registries
- Enterprise revenue opportunity

---

#### F-016: Fork & Remix Skills

**Priority:** MEDIUM
**Effort:** M
**Rationale:** FlowGPT's remix feature drives engagement. Forking enables the open-source improvement model.

**Description:**
Users can fork any public skill, modify it, and publish their version. Attribution chain tracks the lineage.

**Key Requirements:**
- "Fork" button on skill detail page
- Forked skill links back to original (attribution chain)
- Diff view: show what changed from the original
- Fork count displayed on original skill
- "Forks" tab on skill detail page showing all derivatives
- Creator notification when their skill is forked
- Merge suggestions: forked improvements can be proposed back to original
- Fork graph visualization for popular skills

**Differentiator vs. competitors:**
- GitHub-style forking model applied to skills
- Merge suggestions create a collaborative improvement loop
- Fork graph shows skill evolution (unique visualization)

---

### TIER 4: Growth & Ecosystem (Future)

---

#### F-017: Skill Collections / Curated Lists

**Priority:** LOW
**Effort:** S
**Rationale:** Curated lists improve discovery and tell a story (e.g., "Complete Flutter Pipeline").

**Description:**
Users and staff can create curated collections of skills, like playlists.

**Key Requirements:**
- Create named collections with descriptions
- Add/remove skills to collections
- Public/private collections
- Staff-curated "Featured Collections"
- Follow collections for updates
- "Add to collection" button on skill cards

---

#### F-018: Skill Dependency Graph Visualization

**Priority:** LOW
**Effort:** M
**Rationale:** Complex skill ecosystems have dependencies. Visualizing them aids understanding.

**Description:**
Interactive visualization showing how skills depend on and chain with each other.

**Key Requirements:**
- Graph view showing skill-to-skill dependencies
- Highlight a skill to see its upstream and downstream connections
- Click to navigate to any skill in the graph
- Filter by category or author
- "Your installed skills" graph view

---

#### F-019: GitHub App / Integration

**Priority:** LOW
**Effort:** M
**Rationale:** Developers live in GitHub. Deep integration reduces friction.

**Description:**
GitHub App that syncs skills between GitHub repos and skills-hub.ai.

**Key Requirements:**
- Install GitHub App on repos containing skills
- Auto-publish new skills when pushed to GitHub
- Auto-create new versions on tag/release
- Pull request integration: preview skill changes before publishing
- Badge: "Available on skills-hub.ai" for repo READMEs

---

#### F-020: Webhook & API for Integrations

**Priority:** LOW
**Effort:** M
**Rationale:** Platform extensibility enables ecosystem growth.

**Description:**
Public API and webhook system for integrating with CI/CD, team tools, and other platforms.

**Key Requirements:**
- REST API for all marketplace operations (search, install, publish, review)
- Webhook events: skill published, skill updated, review posted, milestone reached
- API documentation with Swagger/OpenAPI
- Rate limiting and API key authentication
- Webhook delivery with retry logic

---

#### F-021: Leaderboards & Gamification

**Priority:** LOW
**Effort:** S
**Rationale:** Engagement mechanic. FlowGPT uses bits/upvotes; PromptBase has sales rankings.

**Description:**
Leaderboards for top skills, most active creators, and trending skills.

**Key Requirements:**
- Top skills by installs (weekly, monthly, all-time)
- Top creators by total installs, skills published, average rating
- Trending skills (install velocity)
- "Rising" skills (new skills gaining traction quickly)
- Creator badges: "Top 10 Creator", "100K Installs", etc.

---

#### F-022: Notification System

**Priority:** LOW
**Effort:** M
**Rationale:** Keep users engaged and informed about updates to skills they use.

**Description:**
In-app and email notifications for relevant events.

**Key Requirements:**
- Skill update notifications (new version available)
- Review notifications (for creators)
- Fork notifications (for creators)
- Collection update notifications (for followers)
- Weekly digest email: trending skills, new in your categories
- Notification preferences: granular control per notification type

---

#### F-023: Cross-Platform Format Translation

**Priority:** LOW
**Effort:** L
**Rationale:** Strategic gap #10. As more tools adopt skills, format translation adds value.

**Description:**
Automatic translation of skills between different tool formats (Claude Code SKILL.md, Cursor plugin format, etc.).

**Key Requirements:**
- Detect source format
- Translate to target format
- Highlight incompatible features
- "Download for [platform]" button on skill pages
- Format compatibility matrix

---

## Tech Stack Recommendation

### Backend
- **Runtime:** Node.js 22+
- **Language:** TypeScript (strict mode)
- **Framework:** Fastify 5
- **ORM:** Prisma 6
- **Database:** PostgreSQL 16
- **Cache:** Redis (for search, sessions, rate limiting)
- **Search:** Meilisearch or PostgreSQL full-text search (start simple, migrate later)
- **Auth:** GitHub OAuth via Passport.js + JWT sessions
- **File Storage:** S3-compatible (for SKILL.md files, user avatars)
- **Validation:** Zod
- **Testing:** Vitest
- **API Docs:** Swagger via @fastify/swagger
- **Background Jobs:** BullMQ + Redis (for skill validation pipeline, notifications)

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Component Library:** shadcn/ui
- **State Management:** React Query (TanStack Query) for server state, Zustand for client state
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts (for analytics dashboards)
- **Testing:** Vitest + React Testing Library + Playwright (E2E)
- **Markdown Rendering:** react-markdown + remark-gfm (for skill instructions preview)

### CLI Tool
- **Language:** TypeScript
- **Runtime:** Node.js (distributed via npm)
- **CLI Framework:** Commander.js
- **Package Name:** `skills-hub` (npm)
- **Commands:** `install`, `search`, `list`, `update`, `publish`, `login`

### Infrastructure
- **Hosting:** Vercel (frontend) + Railway or Fly.io (backend)
- **Database:** Neon (serverless PostgreSQL) or Supabase
- **CDN:** Cloudflare
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry (errors) + PostHog (analytics)
- **Email:** Resend

### Why This Stack
- **Fastify + Prisma + PostgreSQL:** Proven backend from the user's `/build` skill — consistent with existing conventions
- **Next.js + Tailwind + shadcn:** Modern React stack with excellent developer experience and SEO support
- **Meilisearch:** Instant search with typo tolerance — critical for skill discovery UX
- **GitHub OAuth:** Developer-first auth, no password management needed
- **BullMQ:** Async skill validation pipeline without blocking uploads

---

## Recommended MVP Build Order

### Phase 1: Foundation (Week 1-2)
1. F-003: User accounts (GitHub OAuth)
2. F-005: Categories & tags (data model)
3. F-002: Skill upload & publishing (basic)
4. F-001: Skill browsing & discovery
5. F-006: Search & filtering

### Phase 2: Quality & Distribution (Week 3-4)
6. F-004: Skill installation (CLI + web)
7. F-007: Skill validation & quality scoring (schema + instruction analysis)
8. F-009: Version management (basic)

### Phase 3: Community (Week 5-6)
9. F-008: Ratings & reviews
10. F-016: Fork & remix skills
11. F-012: Creator analytics dashboard (basic)

### Phase 4: Differentiation (Week 7-10)
12. F-013: AI-powered recommendations
13. F-010: Skill composition builder
14. F-014: Creator monetization
15. F-015: Private/team sharing

### Phase 5: Growth (Ongoing)
16-23: Remaining features based on user feedback and traction

---

## Summary

| Metric | Count |
|--------|-------|
| Total features identified | 23 |
| HIGH priority | 9 |
| MEDIUM priority | 7 |
| LOW priority | 7 |
| MVP features (Phase 1-2) | 8 |
| Estimated MVP timeline | 4 weeks |

**Top 5 features to build first:**
1. **Skill Browsing & Discovery (F-001)** — the core experience
2. **Skill Upload & Publishing (F-002)** — supply side of the marketplace
3. **User Accounts & Profiles (F-003)** — identity and trust
4. **Skill Installation CLI (F-004)** — developer-native distribution
5. **Skill Validation & Quality Scoring (F-007)** — the key differentiator
