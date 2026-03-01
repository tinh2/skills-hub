# Feature Ideation: Agent Execution Layer for skills-hub.ai

**Date:** 2026-02-28
**Source:** Competitive gap analysis (OpenFang, AgentOS, agent hosting platforms) + existing skills-hub MVP
**Theme:** Evolving from pure marketplace to marketplace + hosted agent execution

---

## Context

The competitive landscape has shifted. Agent Operating Systems (OpenFang, AgentOS) now offer autonomous skill execution with 24/7 scheduling, multi-channel deployment, and enterprise security. skills-hub.ai has the best marketplace features (quality scoring, reviews, versioning, composition), but no execution layer. The gap is clear: **nobody offers "discover AND run" in one platform.**

This report proposes features that bridge the marketplace-to-execution gap, turning skills-hub.ai into the platform where users find skills, test them, and deploy them as running agents — without ever touching a CLI.

---

## Feature Catalog

### TIER 1: HIGH Priority — Ship These to Stay Competitive

---

#### F-024: Deploy as Agent (One-Click Hosted Execution)

**Priority:** HIGH
**Effort:** XL
**Gap addressed:** GAP 1 (Marketplace + Execution), GAP 2 (Hosted Execution), GAP 5 (Skill-to-Agent Pipeline)

**Description:**
A "Deploy as Agent" button on every skill detail page that provisions a managed, hosted instance of that skill running as an autonomous agent. Users configure triggers (schedule, webhook, channel message), select channels (Telegram, Discord, Slack), and the platform handles all infrastructure.

**Key Requirements:**
- "Deploy as Agent" button on skill detail page
- Configuration wizard: trigger type (schedule/cron, webhook, channel message, manual), channel selection, LLM model, environment variables/secrets
- Execution backend: OpenFang binary as managed service (MIT licensed, can embed)
- Agent dashboard: view running agents, logs, execution history, pause/resume
- Resource limits per tier: free (3 agents, 100 executions/month), pro ($9/mo, 20 agents, 5K executions), team ($29/mo/seat, unlimited)
- Multi-channel deployment via OpenFang's 40 adapters
- Health monitoring with auto-restart on failure
- Secret management (encrypted environment variables, never logged)
- Graceful shutdown and state persistence across restarts

**Revenue model:**
- Free tier: 3 agents, 100 executions/month (loss leader for marketplace adoption)
- Pro: $9/month — 20 agents, 5,000 executions, all channels
- Team: $29/month/seat — unlimited agents, priority execution, SLA
- Enterprise: Custom pricing — dedicated infrastructure, compliance

**Why this is the #1 feature:**
- Transforms skills-hub.ai from "npm" to "npm + Heroku" — discovery AND deployment
- Creates recurring revenue (monthly hosting vs. one-time install)
- Makes skills accessible to non-technical users
- No competitor offers this for SKILL.md-based skills

---

#### F-025: Skill Sandbox / Try Before Deploy

**Priority:** HIGH
**Effort:** L
**Gap addressed:** GAP 3 (Behavioral Testing), original GAP 1 (Skill Testing)

**Description:**
Before deploying as a hosted agent, users can "Try" a skill in a sandboxed environment. They provide sample input, the skill runs against it, and they see the output — all within the browser. This also feeds the behavioral quality scoring system.

**Key Requirements:**
- "Try it" button on skill detail page (next to "Deploy as Agent")
- Sandboxed execution: isolated environment, no persistent state, no external side effects
- User provides sample input (text, file, URL depending on skill type)
- Real-time streaming output display
- Execution time limit (30 seconds for free users, 2 minutes for pro)
- Free tier: 5 sandbox runs per day
- Pro: 50 sandbox runs per day
- Cache results for identical inputs (save compute)
- Creator-defined sample inputs: skill authors can provide 3-5 example inputs
- Quality scoring integration: sandbox results feed into behavioral quality scores

**Why this matters:**
- "Try before you buy/deploy" reduces friction dramatically
- Behavioral testing = the #1 differentiator from all competitors
- Cached sandbox results become social proof (other users can see example outputs)

---

#### F-026: Agent Monitoring Dashboard

**Priority:** HIGH
**Effort:** L
**Gap addressed:** GAP 2 (Hosted Execution), industry trend (Agents-as-a-Service)

**Description:**
Dashboard for managing all deployed agents. View status, execution logs, error rates, costs, and channel activity for each running agent.

**Key Requirements:**
- Agent list view: name, skill name, status (running/paused/error), last execution, channel
- Agent detail view: execution history timeline, log viewer, error alerts
- Real-time log streaming (WebSocket/SSE)
- Cost tracking: LLM token usage, compute time, estimated monthly cost
- Pause/resume/restart controls
- Error alerting: email/webhook notification on agent failure
- Usage charts: executions per day, tokens consumed, channel messages processed
- Quick actions: duplicate agent, change schedule, update to latest skill version

---

#### F-027: OpenFang Runtime Integration

**Priority:** HIGH
**Effort:** XL
**Gap addressed:** GAP 1 (Marketplace + Execution), strategic partnership

**Description:**
Integrate OpenFang's Rust binary as the execution backend for skills-hub.ai's hosted agent platform. This isn't building an agent OS — it's using the best existing one (MIT licensed) as infrastructure.

**Key Requirements:**
- Package OpenFang binary as the execution engine for hosted agents
- SKILL.md → HAND.toml translation layer (convert marketplace skills to OpenFang Hands)
- OpenFang API integration for agent lifecycle management (spawn, pause, resume, kill)
- Channel adapter passthrough: expose OpenFang's 40 adapters through skills-hub.ai UI
- LLM provider routing: use skills-hub.ai's model selection (or user's own API keys)
- Security: run each user's agents in isolated containers/namespaces
- Fallback: if OpenFang is unavailable, degrade gracefully to direct LLM API execution
- Version pinning: pin OpenFang binary version per agent for stability

**Why OpenFang (not build from scratch):**
- 137K LOC of battle-tested Rust — would take 6-12 months to replicate
- 16 security layers already built
- 40 channel adapters already working
- MIT license = can embed commercially without restriction
- OpenFang focuses on runtime; we focus on marketplace + UX
- Complementary, not competitive

---

#### F-028: Cross-Platform Skill Registry (Universal Format)

**Priority:** HIGH
**Effort:** L
**Gap addressed:** GAP 4 (Cross-Platform Compatibility)

**Description:**
Position skills-hub.ai as the universal registry for SKILL.md skills that work across Claude Code, Codex CLI, Cursor, OpenFang, and AgentOS. Add platform compatibility metadata and automatic format translation.

**Key Requirements:**
- Platform compatibility field on every skill: `platforms: [claude-code, codex-cli, cursor, openfang, agentos]`
- Auto-detection: analyze skill instructions to infer compatible platforms
- Format translation: "Download for [platform]" button generates platform-specific version
- Compatibility matrix on skill detail page (which platforms, which features supported)
- API endpoint: `GET /api/v1/skills/:slug/download?platform=openfang` returns formatted skill
- OpenFang integration: `openfang install --from skills-hub.ai <skill-name>`
- Cursor plugin format export: bundle SKILL.md into Cursor plugin structure
- Codex CLI format export: wrap for OpenAI Codex compatibility

**Why this matters:**
- SKILL.md is becoming a de facto standard across 5+ platforms
- Being the universal registry = being the npm of agent skills
- Platform-agnostic = immune to any single platform dying or winning

---

### TIER 2: MEDIUM Priority — Differentiation Features

---

#### F-029: Agent Templates (Pre-Configured Agent Blueprints)

**Priority:** MEDIUM
**Effort:** M
**Gap addressed:** GAP 7 (Non-Technical Deployment)

**Description:**
Pre-built agent templates that combine a skill + configuration + channel into a ready-to-deploy package. Non-technical users select a template, fill in their credentials, and click deploy.

**Key Requirements:**
- Template gallery: "Social Media Manager", "Lead Generator", "Code Reviewer", "Research Assistant", "Content Pipeline"
- Each template includes: skill selection, suggested schedule, recommended channels, required secrets (with helper text)
- "Deploy in 60 seconds" flow: select template → enter API keys → pick channel → deploy
- Community-contributed templates (curated/reviewed)
- Template versioning (tied to underlying skill versions)
- Template analytics: which templates are most popular, conversion rate

**Target users:** Marketing teams, solo entrepreneurs, small businesses — people who want AI agents but can't write SKILL.md files.

---

#### F-030: Agent Marketplace (Running Agents, Not Just Skills)

**Priority:** MEDIUM
**Effort:** L
**Gap addressed:** GAP 5 (Skill-to-Agent Pipeline), revenue opportunity

**Description:**
Extend the marketplace from skills (static instructions) to agents (running configurations). Creators can publish "agent packages" — a skill + optimal configuration + recommended model — that users can deploy with one click.

**Key Requirements:**
- New listing type: "Agent" (in addition to "Skill")
- Agent listing includes: underlying skill, recommended model, schedule/trigger config, channel suggestions, pricing tier recommendation
- "Deploy this Agent" button (pre-filled configuration from the creator)
- Agent reviews: users review the running agent experience, not just the skill text
- Creator revenue: premium agents at $1.99-$19.99/month or one-time $4.99-$29.99
- Usage-based pricing option: creator sets price per 1000 executions
- Free agents with optional tips/donations

**Revenue model:**
- Platform takes 20% commission on agent sales (creator keeps 80%)
- Hosting fee per agent is separate from marketplace commission
- Bundle deals: skill + hosted agent at discounted rate

---

#### F-031: Webhook & Event Triggers

**Priority:** MEDIUM
**Effort:** M
**Gap addressed:** GAP 2 (Hosted Execution), enterprise integration

**Description:**
Agents can be triggered by external events — webhooks from GitHub, Stripe, Slack, or any HTTP POST — in addition to schedules and manual triggers.

**Key Requirements:**
- Unique webhook URL per agent: `https://agents.skills-hub.ai/hook/<agent-id>`
- Webhook payload passed as context to the skill
- Trigger types: HTTP webhook, cron schedule, channel message, manual, chained (agent A finishes → agent B starts)
- Webhook authentication: HMAC signature verification, API key header, IP allowlist
- Webhook logs: incoming payloads, processing status, response times
- Pre-built integrations: GitHub (PR opened, issue created), Stripe (payment received), Slack (message in channel)
- Webhook testing: send test payload from UI

---

#### F-032: Agent Chaining (Multi-Agent Workflows)

**Priority:** MEDIUM
**Effort:** XL
**Gap addressed:** Original GAP 3 (Skill Composition), GAP 5 (Skill-to-Agent Pipeline)

**Description:**
Chain multiple running agents into a workflow. Agent A's output feeds into Agent B's input. This is skill composition (F-010) but for running agents, not just static instructions.

**Key Requirements:**
- Visual workflow editor: connect agents with arrows showing data flow
- Agent A output → Agent B input (automatic context passing)
- Conditional routing: if Agent A output contains X, route to Agent B; otherwise Agent C
- Parallel execution: run Agent B and C simultaneously, merge results in Agent D
- Error handling: retry failed agent, skip to next, or halt entire chain
- Workflow templates: pre-built multi-agent workflows for common use cases
- Workflow monitoring: see each agent's status in the chain, identify bottlenecks
- Cost estimation: predict total workflow cost before execution

---

#### F-033: Bring Your Own Keys (BYOK) Model

**Priority:** MEDIUM
**Effort:** M
**Gap addressed:** Cost control, trust, enterprise requirements

**Description:**
Users provide their own LLM API keys instead of using platform-provided inference. This reduces hosting costs for skills-hub.ai and gives users cost control.

**Key Requirements:**
- API key vault: encrypted storage for user's Anthropic, OpenAI, Groq, etc. keys
- Key validation: verify key works before saving
- Per-agent key selection: different agents can use different API keys
- Cost tracking: even with BYOK, track token usage for user's awareness
- Platform-provided fallback: if user's key hits rate limits, optionally fall back to platform key (with consent)
- Key rotation: notify user when key is expiring or has errors
- LiteLLM integration: route through LiteLLM proxy for unified interface across providers

---

### TIER 3: LOW Priority — Future Growth

---

#### F-034: Agent Analytics & Intelligence

**Priority:** LOW
**Effort:** L
**Description:** Deep analytics for running agents — not just execution counts but output quality tracking, cost optimization recommendations, and anomaly detection.

**Key Requirements:**
- Output quality trends (based on user feedback/ratings per execution)
- Cost per execution over time
- "This agent could be cheaper with model X" recommendations
- Anomaly detection: alert when agent behavior changes significantly
- A/B testing: run same agent with different models/configs, compare results

---

#### F-035: Agent Collaboration (Multi-Agent Chat)

**Priority:** LOW
**Effort:** XL
**Description:** Multiple agents from different skills can collaborate in a shared context, like a team meeting. A "researcher agent" gathers data, a "writer agent" drafts content, a "reviewer agent" checks quality.

---

#### F-036: White-Label Agent Hosting

**Priority:** LOW
**Effort:** XL
**Description:** Businesses can white-label the agent hosting platform — their customers see their brand, not skills-hub.ai. Revenue model: platform fee per white-label instance.

---

#### F-037: Agent Marketplace API (Platform-as-a-Service)

**Priority:** LOW
**Effort:** L
**Description:** Public API that lets other platforms (IDEs, chat apps, no-code tools) search, install, and deploy agents from skills-hub.ai. Embed the marketplace anywhere.

**Key Requirements:**
- REST API: search, browse, install, deploy agents
- Embed widget: `<skills-hub-marketplace>` web component for embedding in any app
- SDK: TypeScript/Python SDKs for integration
- OAuth app system: third-party apps can act on behalf of users
- Rate limiting and API key management

---

#### F-038: Self-Hosted Agent Runtime

**Priority:** LOW
**Effort:** L
**Description:** For enterprises that can't use cloud hosting, provide a self-hosted version of the agent runtime that connects back to skills-hub.ai for skill discovery and updates.

**Key Requirements:**
- Docker image with OpenFang runtime + skills-hub.ai agent
- Pulls skills from skills-hub.ai registry
- Reports anonymized usage metrics back to marketplace (opt-in)
- Air-gapped mode for regulated environments
- License: per-seat enterprise pricing

---

## Updated Build Order (Incorporating Agent Execution)

### Phase 1: Deploy the Marketplace (Now → Week 2)
- Ship current skills-hub.ai MVP to production
- Vercel (frontend) + Railway (backend) + Neon (DB)
- Launch with existing features: browse, search, install, reviews, versions

### Phase 2: Behavioral Testing (Week 3-4)
- F-025: Skill Sandbox / Try Before Deploy
- Sandboxed execution for quality scoring
- This is still the #1 differentiator

### Phase 3: Hosted Execution MVP (Week 5-8)
- F-027: OpenFang Runtime Integration
- F-024: Deploy as Agent (basic — schedule + Telegram/Discord)
- F-026: Agent Monitoring Dashboard (basic — status + logs)
- Launch with 3 free agents per user

### Phase 4: Cross-Platform & Templates (Week 9-12)
- F-028: Cross-Platform Skill Registry
- F-029: Agent Templates
- F-033: BYOK Model
- F-031: Webhook & Event Triggers

### Phase 5: Agent Marketplace & Monetization (Month 4-5)
- F-030: Agent Marketplace (running agents for sale)
- F-014: Creator Monetization (from original plan)
- F-032: Agent Chaining

### Phase 6: Enterprise & Growth (Month 6+)
- F-034-F-038: Analytics, collaboration, white-label, API, self-hosted

---

## Revenue Projections

| Revenue Stream | Free Tier | Pro ($9/mo) | Team ($29/seat/mo) | Enterprise |
|----------------|-----------|-------------|---------------------|------------|
| Agent hosting | 3 agents, 100 exec/mo | 20 agents, 5K exec/mo | Unlimited | Dedicated infra |
| Marketplace commission | — | 20% on premium sales | 20% on premium sales | Custom |
| BYOK discount | — | -$2/mo if BYOK | -$5/seat/mo if BYOK | — |
| White-label | — | — | — | $499+/mo |
| API access | 100 req/day | 10K req/day | 100K req/day | Unlimited |

**Target:** 1,000 pro users by end of Year 1 = $108K ARR from hosting alone, plus marketplace commissions.

---

## Summary

| Metric | Count |
|--------|-------|
| New features proposed | 15 (F-024 through F-038) |
| HIGH priority | 5 |
| MEDIUM priority | 5 |
| LOW priority | 5 |
| Features addressing agent execution | 8 |
| Features addressing marketplace improvement | 4 |
| Features addressing enterprise | 3 |
| Estimated time to hosted execution MVP | 8 weeks |

**Top 5 features to build (in order):**
1. **F-025: Skill Sandbox** — behavioral testing + try-before-deploy (the #1 differentiator)
2. **F-027: OpenFang Integration** — don't build a runtime, use the best one (MIT)
3. **F-024: Deploy as Agent** — the killer feature that turns marketplace into platform
4. **F-028: Cross-Platform Registry** — be the npm for all agent skills
5. **F-026: Agent Dashboard** — manage running agents in one place

**The thesis:** Don't build an agent OS. Build the **agent marketplace + hosting platform** on top of existing agent OS infrastructure. You're not Docker — you're Docker Hub + Heroku.
