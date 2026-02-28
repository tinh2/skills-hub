# Competitive Gap Analysis: skills-hub.ai

**Date:** 2026-02-28
**Scope:** Claude Code skill sharing platforms, AI prompt marketplaces, agent configuration sharing, MCP directories, IDE plugin marketplaces

---

## 1. Competitor Catalog

### 1.1 Direct Competitors (Claude Code Skills Marketplaces)

#### SkillsMP (skillsmp.com)
- **What it is:** Independent community marketplace for agent skills compatible with Claude Code, Codex CLI, and ChatGPT
- **Scale:** 270,000+ skills indexed
- **Pricing:** Free / open source — all skills sourced from public GitHub repos
- **Key Features:**
  - Smart search with category filtering and quality indicators
  - Skills use the open SKILL.md standard
  - Cross-platform: Claude Code, OpenAI Codex CLI, ChatGPT
  - Automated indexing from GitHub
- **Strengths:**
  - Massive catalog (largest in the space)
  - Multi-platform compatibility (not Claude-only)
  - Free and open-source ethos
- **Weaknesses:**
  - Quantity over quality — 270K skills with inconsistent quality
  - No quality evaluation or rating system visible
  - No desktop app or CLI install tool
  - No user profiles, reviews, or community features
  - No monetization path for skill creators

#### SkillHub (skillhub.club)
- **What it is:** Claude skills marketplace with AI-powered quality evaluation and a desktop app
- **Scale:** 7,000+ AI-evaluated skills
- **Pricing:** Free
- **Key Features:**
  - AI evaluation on 5 dimensions: Practicality, Clarity, Automation, Quality, Impact
  - One-click install via desktop app
  - Cross-platform: Claude Code, Cursor, OpenCode, Windsurf, Cline, Roo Code, Aide, Augment
  - GitHub auto-indexing for contributions
- **Strengths:**
  - Quality scoring gives users confidence
  - Desktop app for management across multiple AI tools
  - Curated feel despite decent catalog size
- **Weaknesses:**
  - Smaller catalog than SkillsMP
  - AI evaluation may not capture real-world effectiveness
  - No user reviews or community ratings
  - No version management or changelogs
  - No monetization for creators

#### Smithery (smithery.ai/skills)
- **What it is:** Unified marketplace and CLI for AI skills and MCP tools
- **Scale:** 100K+ skills, 18,000+ browsable
- **Pricing:** Free
- **Key Features:**
  - CLI for discovery, connection, and invocation
  - Human-authenticated sessions
  - MCP discovery integrated
  - Skill search, install locally, star favorites, update from sources
  - Heartbeat pattern for discovering new skills
- **Strengths:**
  - CLI-first approach appeals to developers
  - Combines skills + MCP in one platform
  - Star/favorite system for personalization
  - Update tracking from sources
- **Weaknesses:**
  - Heavy CLI dependency — less accessible to non-CLI users
  - No web-based preview or testing
  - No community reviews or ratings
  - No monetization model

#### LobeHub Skills (lobehub.com/skills)
- **What it is:** Skills marketplace integrated into the LobeHub ecosystem
- **Scale:** Large catalog (exact number unclear)
- **Pricing:** Free
- **Key Features:**
  - Multi-platform skills: Claude, Codex, ChatGPT
  - Skill creator tool with 4-phase workflow (Discovery, Design, Generation, Review)
  - Agent evolution engine for self-improving agents
  - Security features (prompt injection defense)
- **Strengths:**
  - Integrated ecosystem play (LobeHub's broader platform)
  - Skill creation tools built in
  - Security-conscious features
- **Weaknesses:**
  - Tied to LobeHub ecosystem
  - Discovery UX is cluttered
  - No standalone value proposition for Claude Code users

#### ClaudeSkills.info
- **What it is:** Claude-specific skills directory
- **Scale:** Unknown (claims "largest Claude skills marketplace")
- **Pricing:** Free
- **Key Features:**
  - Browse, discover, and download Claude Code skills
  - Simple installation commands
  - Managed updates
- **Strengths:**
  - Claude-focused simplicity
- **Weaknesses:**
  - Minimal features
  - No quality evaluation
  - No community features
  - Appears to be a simple directory/aggregator

#### ClaudeSkills.ai
- **What it is:** Curated Claude skills marketplace
- **Scale:** Unknown
- **Pricing:** Unknown
- **Key Features:**
  - Tasks from content generation to data analysis
- **Strengths:**
  - Curated approach
- **Weaknesses:**
  - Limited information available
  - Appears early-stage

#### Anthropic Official (github.com/anthropics/skills)
- **What it is:** Official repository of example skills from Anthropic
- **Scale:** Dozens of reference skills
- **Pricing:** Free (open source)
- **Key Features:**
  - Reference implementations
  - Creative + technical + enterprise skills
  - Already available to paid Claude.ai plans
  - Skills API integration
- **Strengths:**
  - Official, authoritative
  - High quality reference implementations
  - API-level integration
- **Weaknesses:**
  - Small catalog — examples only, not a marketplace
  - No community contributions
  - No discovery, search, or social features

---

### 1.2 Adjacent Competitors (Prompt Marketplaces)

#### PromptBase (promptbase.com)
- **What it is:** The #1 marketplace for AI prompts (buy/sell)
- **Scale:** 260,000+ prompts
- **Pricing:** Pay-per-prompt ($1.99-$9.99), free to browse, 2,300+ free prompts
- **Revenue model:** 80/20 split (creators keep 80%), referral sales 90-100%
- **Key Features:**
  - Multi-model: ChatGPT, Midjourney, DALL-E, Stable Diffusion, GPT-4
  - App Builder (no-code tool for AI mini-apps)
  - Hiring system for custom prompt development
  - Personal storefronts for sellers
  - Review process for paid prompts
- **Strengths:**
  - Proven monetization model
  - Large creator ecosystem
  - Quality control via review process
  - No-code app builder adds value
- **Weaknesses:**
  - Prompts are static text, not executable skills
  - No version management
  - No execution/testing environment
  - Focused on creative/marketing, not developer workflows

#### FlowGPT (flowgpt.com)
- **What it is:** Community-driven platform for sharing and discovering AI prompts/chatbots
- **Scale:** 1M+ characters and bots
- **Pricing:** Free core access, token-based AI usage (buy "bits")
- **Key Features:**
  - Multi-model: OpenAI, Claude, Gemini
  - Social features: upvoting, commenting, remixing
  - In-app currency ("bits") for monetization
  - Discord integration
  - Prompt remix feature
- **Strengths:**
  - Strong community and social features
  - Free access drives adoption
  - Remix/fork feature encourages iteration
  - Multi-model flexibility
- **Weaknesses:**
  - Heavy NSFW content dilutes professional use
  - Quality varies enormously
  - Token-based pricing is confusing
  - Not focused on developer skills/workflows

---

### 1.3 Platform Marketplaces (IDE/Tool Integrated)

#### OpenAI GPT Store
- **What it is:** Official marketplace for Custom GPTs
- **Scale:** 3M+ GPTs created, ~159K public/active
- **Pricing:** Free for ChatGPT Plus/Team/Enterprise users ($20+/mo subscription)
- **Revenue model:** Revenue sharing (~$0.03/conversation, soft ceiling $100-500/mo)
- **Key Features:**
  - Categories, trending, staff picks
  - Builder Profile verification
  - Privacy controls (private, link-only, public, org-only)
- **Strengths:**
  - Massive distribution (ChatGPT's user base)
  - Official platform backing
  - Built-in monetization
- **Weaknesses:**
  - Revenue sharing is poor ($0.03/conversation)
  - Flooded with low-quality prompt wrappers
  - No developer skill focus
  - Walled garden (OpenAI only)

#### Cursor Marketplace (cursor.com/marketplace)
- **What it is:** Plugin marketplace for Cursor IDE
- **Scale:** New (launched Feb 2026), 10+ verified launch partners
- **Pricing:** Free plugins, Cursor Pro $20/mo
- **Key Features:**
  - Bundles MCP servers, skills, subagents, hooks, rules into single installs
  - One-click install from web or `/add-plugin` in editor
  - Verified launch partners: Figma, Linear, Stripe, AWS, Cloudflare, Vercel, etc.
  - Community submissions accepted
  - Private team marketplaces planned
- **Strengths:**
  - Deep IDE integration
  - Enterprise partners give credibility
  - Plugin bundles are more powerful than individual skills
  - Team/org features planned
- **Weaknesses:**
  - Cursor-only (vendor lock-in)
  - Very new — small catalog
  - No monetization for community creators
  - Controlled ecosystem limits openness

---

### 1.4 MCP Server Directories

#### Official MCP Registry (registry.modelcontextprotocol.io)
- **What it is:** Official registry for publicly-available MCP servers
- **Pricing:** Free
- **Strengths:** Authoritative, vendor-neutral
- **Weaknesses:** Registry only, no skills focus

#### PulseMCP (pulsemcp.com/servers)
- **What it is:** MCP server directory, updated daily
- **Scale:** 8,600+ servers
- **Strengths:** Large catalog, daily updates

#### mcp.so
- **What it is:** Community-driven MCP server directory
- **Strengths:** Good community engagement

---

### 1.5 GitHub-Based Approaches

#### awesome-cursorrules (GitHub)
- **What it is:** Community-curated configuration files for Cursor
- **Model:** Git repo, pull requests for contributions
- **Strengths:** Simple, developer-friendly, version controlled
- **Weaknesses:** No search, no quality evaluation, manual discovery

#### AI Dotfiles Movement
- **What it is:** Treating AI config as first-class dotfiles
- **Key tools:** ai-dotfiles, openskills (npm i -g openskills)
- **Strengths:** Developer-native, version controlled, familiar workflow
- **Weaknesses:** Fragmented, no central discovery, no quality control

---

## 2. Feature Comparison Matrix

| Feature | SkillsMP | SkillHub | Smithery | LobeHub | PromptBase | FlowGPT | GPT Store | Cursor MP | skills-hub.ai |
|---------|----------|----------|----------|---------|------------|---------|-----------|-----------|---------------|
| **Catalog size** | 270K | 7K | 100K | Large | 260K | 1M+ | 159K | Small | -- |
| **Claude Code native** | Yes | Yes | Yes | Yes | No | No | No | Partial | YES |
| **Multi-platform** | Yes | Yes | Yes | Yes | Yes | Yes | No | No | YES |
| **Quality scoring** | No | AI-scored | No | No | Review | Community | No | Verified | PLANNED |
| **User reviews/ratings** | No | No | Stars | No | Yes | Upvotes | No | No | PLANNED |
| **Search & filter** | Yes | Yes | CLI | Yes | Yes | Yes | Yes | Yes | PLANNED |
| **One-click install** | No | Desktop | CLI | No | N/A | N/A | N/A | Yes | PLANNED |
| **CLI tool** | No | No | Yes | No | No | No | No | Yes | PLANNED |
| **Version management** | No | No | Update | No | No | No | No | No | PLANNED |
| **Skill preview/test** | No | No | No | No | No | Run | GPT chat | No | PLANNED |
| **Creator monetization** | No | No | No | No | 80/20 | Bits | Rev share | No | PLANNED |
| **User profiles** | No | No | No | No | Yes | Yes | Builder | No | PLANNED |
| **Skill composition** | No | No | No | No | No | Remix | No | Bundles | PLANNED |
| **Community features** | No | No | No | No | Hiring | Social | No | No | PLANNED |
| **Desktop app** | No | Yes | No | No | No | No | No | N/A | MAYBE |
| **Private/team sharing** | No | No | No | No | No | No | Org-only | Planned | PLANNED |
| **Fork/remix skills** | No | No | No | No | No | Yes | No | No | PLANNED |
| **Analytics/usage data** | No | No | No | No | No | No | Yes | No | PLANNED |
| **Skill validation** | No | AI | No | No | Review | No | No | Verified | PLANNED |

---

## 3. Gap Analysis

### 3.1 Critical Gaps (No competitor does this well)

**GAP 1: Skill Testing & Validation**
- No platform lets you test a skill before installing it
- SkillHub's AI evaluation is passive (scores the SKILL.md text, not actual behavior)
- A sandbox where users can see a skill in action before committing would be transformative
- **Opportunity:** Live skill preview/playground with sample inputs/outputs

**GAP 2: Version Management & Changelogs**
- Skills evolve (the user's catalog shows v2, v3, v4, v7, v8 across skills)
- No marketplace tracks skill versions, diffs between versions, or notifies users of updates
- Smithery has basic "update from source" but no proper versioning
- **Opportunity:** Semantic versioning, changelogs, update notifications, rollback

**GAP 3: Skill Composition & Chaining**
- The user's skill catalog demonstrates powerful composition (combo skills like `/research` = `/compete` + `/new-features`)
- No marketplace represents or enables skill composition
- Cursor's "bundles" are closest but are static packaging, not dynamic chaining
- **Opportunity:** Visual skill composition builder, dependency graph, combo skill creation

**GAP 4: Quality Assurance with Behavioral Testing**
- SkillHub does AI text analysis; PromptBase does human review
- Nobody tests whether a skill actually works correctly
- **Opportunity:** Automated testing pipeline — run skill against test scenarios, measure output quality

**GAP 5: Creator Monetization for Developer Skills**
- PromptBase proves monetization works for prompts ($1.99-$9.99)
- No developer skill marketplace has monetization
- All existing Claude skill marketplaces are free/open-source only
- **Opportunity:** Freemium model — free community skills + premium curated/tested skills with revenue sharing

### 3.2 Strategic Gaps (Some competitors partially address)

**GAP 6: Rich User Profiles & Creator Identity**
- PromptBase and FlowGPT have profiles; skill marketplaces do not
- Developer skill creators have no reputation, portfolio, or identity
- **Opportunity:** GitHub-connected profiles showing skills created, usage stats, specialization areas

**GAP 7: Usage Analytics & Insights**
- GPT Store has basic analytics; no skill marketplace offers creator analytics
- Creators cannot see how their skills are used, which instructions users struggle with
- **Opportunity:** Install counts, usage frequency, error rates, user feedback

**GAP 8: Private/Team Skill Sharing**
- Cursor is planning this; nobody else offers it
- Enterprise teams need private skill repositories
- **Opportunity:** Team workspaces, private skill registries, role-based access

**GAP 9: Skill Discovery via AI Recommendation**
- All platforms use keyword search or categories
- No platform uses AI to recommend skills based on user's existing workflow, project type, or codebase
- **Opportunity:** "Skills for your stack" — analyze user's project and recommend relevant skills

**GAP 10: Cross-Tool Skill Portability**
- SkillHub and SkillsMP work across tools but don't translate between formats
- A skill written for Claude Code might need adaptation for Cursor or Codex
- **Opportunity:** Automatic format translation, compatibility layer

### 3.3 Existing Features to Match (Table stakes)

These features exist across competitors and are expected:
1. **Search and filtering** by category, platform, keyword
2. **Category taxonomy** (build, test, QA, docs, deploy, etc.)
3. **One-click or one-command install**
4. **Skill detail pages** with description, instructions, metadata
5. **GitHub integration** for sourcing skills
6. **Free tier** with large open catalog

---

## 4. Market Positioning

### Where skills-hub.ai Should Sit

The market has two clusters:
1. **Volume aggregators** (SkillsMP, Smithery) — index everything, no curation
2. **Prompt marketplaces** (PromptBase, FlowGPT) — social + monetization but not developer-focused

**skills-hub.ai should occupy the gap:** a **developer-first, quality-focused skill marketplace** with:
- Curated quality (not just aggregation)
- Behavioral testing (not just text analysis)
- Version management (skills evolve)
- Skill composition (skills chain together)
- Creator monetization (sustainable ecosystem)
- CLI-native workflow (install from terminal)

### Closest Analog
The closest successful analog is the **VS Code Extension Marketplace** or **npm registry** — a place developers trust because of quality signals, version management, and rich metadata. No Claude Code skill marketplace has achieved this level of developer trust.

### Differentiation Summary

| Differentiator | Why it matters |
|----------------|----------------|
| Behavioral skill testing | Users trust that skills work before installing |
| Semantic versioning + changelogs | Skills evolve; users need update confidence |
| Skill composition builder | Power users chain skills; this is invisible today |
| Creator analytics | Creators improve skills based on real usage data |
| AI-powered recommendation | "Right skill for your project" vs. keyword search |
| CLI + web parity | Developers install from terminal; browse on web |
| Freemium monetization | Sustainable creator ecosystem |

---

## 5. Threat Assessment

### Biggest Threat: Anthropic Official Marketplace
Anthropic already has `github.com/anthropics/skills` and Skills API integration. If Anthropic launches an official marketplace (similar to GPT Store), it could commoditize third-party platforms overnight.

**Mitigation:** Focus on features Anthropic won't build:
- Cross-platform compatibility (Codex, Cursor, etc.)
- Community monetization
- Skill composition tools
- Deep analytics

### Second Threat: Cursor Marketplace Expansion
Cursor's plugin marketplace bundles skills + MCP + subagents. If Cursor expands beyond IDE-native to support Claude Code, it could absorb this space.

**Mitigation:** Stay platform-agnostic and developer-first. Cursor's strength is IDE integration; ours is the open ecosystem.

### Third Threat: SkillsMP / SkillHub Scaling
These already exist and have catalogs. If either adds quality scoring + monetization + version management, they could dominate.

**Mitigation:** Move fast on quality differentiation. Behavioral testing and version management are engineering-heavy features that are hard to bolt on.

---

## 6. Key Takeaways

1. **The market is early and fragmented** — no dominant player, no clear winner
2. **Volume without quality is the norm** — 270K skills means nothing if 95% are junk
3. **Developer workflow integration is weak** — CLI tools exist (Smithery) but are basic
4. **Nobody does versioning, testing, or composition** — these are green field
5. **Monetization exists for prompts but not for developer skills** — proven model, untapped market
6. **Cross-platform is table stakes** — Claude Code, Codex CLI, Cursor, and more all use SKILL.md
7. **The Anthropic official play is a wild card** — build features they won't
