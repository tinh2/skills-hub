# New Features: Pricing, LLM Billing & BYOK

**Date:** 2026-02-28
**Decision:** Flat-tier pricing at launch. Platform pays for LLM token costs with built-in margin. BYOK as discount option.

---

## Pricing Model: Flat Tiers with Platform-Managed LLM Keys

### Why Flat Tiers (Not Usage-Based)

- Users prefer predictable monthly bills
- Simpler to build (no metering/billing pipeline)
- Higher conversion — "$9/month" is easier to say yes to than "pay per token"
- We absorb token cost variance and make margin on the spread
- Usage-based pricing can be added later for power users

### Tier Structure

| | Free | Pro | Team | Enterprise |
|---|---|---|---|---|
| **Price** | $0 | $9/month | $29/month per seat | Custom |
| **Running agents** | 3 | 20 | Unlimited | Unlimited |
| **Executions/month** | 100 | 5,000 | 25,000/seat | Unlimited |
| **Sandbox tries/day** | 5 | 50 | 200 | Unlimited |
| **Channels** | Webhook only | All (Telegram, Discord, Slack, etc.) | All + priority | All + dedicated |
| **Agent logs retention** | 24 hours | 30 days | 90 days | 1 year |
| **Support** | Community | Email | Priority email | Dedicated |
| **SLA** | None | None | 99.5% uptime | 99.9% uptime |

### LLM Cost Economics (Platform-Paid Keys)

The platform provides LLM API keys to all users. Token costs are absorbed into the tier price with a healthy margin.

**Estimated cost per execution (average):**

| Model tier | Our cost | Notes |
|---|---|---|
| Fast (Haiku/GPT-4o-mini) | ~$0.002 | Short tasks, simple skills |
| Standard (Sonnet/GPT-4o) | ~$0.01 | Most skills |
| Heavy (Opus/o4-mini) | ~$0.05 | Complex reasoning, long outputs |

**Margin analysis per tier:**

| Tier | Price | Max execs | Worst-case cost (all Standard) | Margin |
|---|---|---|---|---|
| Free | $0 | 100 | $1.00 | -$1.00 (acquisition cost) |
| Pro | $9/mo | 5,000 | $50.00 | **Negative if all Standard** |
| Team | $29/seat/mo | 25,000 | $250.00 | **Negative if all Standard** |

**How to stay profitable:**

1. **Smart model routing** — Default to cheapest model that works for the skill. Most skills don't need Opus.
   - Simple skills → Haiku ($0.002/exec) — Pro tier cost = $10 at max usage, margin = ~breakeven
   - Medium skills → Sonnet ($0.01/exec) — need to cap or use cheaper models
   - Complex skills → route to user's own keys or charge premium

2. **Soft execution limits with throttling** — Free/Pro users hit fair-use throttle before hard cap
   - Free: 100 execs/mo hard cap
   - Pro: 5,000 execs/mo, throttled to 1 exec/min after 3,000
   - Team: 25,000/seat/mo, throttled after 15,000

3. **Model selection per skill** — Skill creators recommend a model tier. Platform uses the cheapest capable model.
   - Skill metadata: `recommended_model_tier: fast | standard | heavy`
   - Platform routes to cheapest provider in that tier (e.g., Groq for fast, DeepSeek for standard)

4. **LiteLLM proxy with fallback routing** — Use free/cheap models first, fall back to paid
   - Priority: Local Ollama → Free OpenRouter models → Groq → Paid providers
   - Only hit Anthropic/OpenAI when quality requires it

5. **Overage charges** (optional, off by default) — Users can opt in to pay-per-execution beyond their tier limit instead of being throttled

**Revised realistic margins:**

| Tier | Price | Realistic avg cost/exec | Typical monthly usage | Avg cost | Margin |
|---|---|---|---|---|---|
| Free | $0 | $0.003 | 30 execs | $0.09 | -$0.09 |
| Pro | $9/mo | $0.005 | 1,500 execs | $7.50 | **$1.50 (17%)** |
| Team | $29/seat | $0.005 | 8,000 execs | $40.00 | **-$11 without BYOK** |

**Key insight:** Team tier is unprofitable without BYOK or smart routing. Push Team users toward BYOK with a price incentive.

---

## BYOK (Bring Your Own Keys)

Users who provide their own LLM API keys get a discounted tier price since the platform doesn't pay for their token usage.

### BYOK Pricing

| Tier | Standard Price | BYOK Price | Savings |
|---|---|---|---|
| Free | $0 | $0 | — |
| Pro | $9/mo | $5/mo | $4/mo (44% off) |
| Team | $29/seat/mo | $19/seat/mo | $10/seat (34% off) |
| Enterprise | Custom | Custom (lower) | Negotiated |

### BYOK Implementation

**Key vault:**
- Encrypted storage (AES-256-GCM) for user API keys
- Keys never logged, never exposed in agent output
- Per-agent key selection (different agents can use different providers)
- Key validation on save (test API call to verify working)
- Key health monitoring (notify on errors, rate limits, expiry)

**Supported providers (via LiteLLM):**
- Anthropic (Claude)
- OpenAI (GPT-4o, o4-mini)
- Google (Gemini)
- Groq
- DeepSeek
- OpenRouter
- Together AI
- Ollama (user's local instance via Tailscale/tunnel)

**Routing logic:**
```
if user.has_byok_key(provider):
    use user's key → track tokens for user's awareness
else:
    use platform key → count against tier execution limit
```

**Hybrid mode:** Users can BYOK for expensive models (Opus, GPT-4o) and use platform keys for cheap models (Haiku, GPT-4o-mini). This gives them control over big costs while keeping convenience for small ones.

### BYOK Benefits for the Platform

- **Team tier becomes profitable:** $19/seat with zero LLM cost = pure margin minus compute
- **Reduces our API spend:** Power users (highest token consumers) self-select into BYOK
- **Enterprise requirement:** Many companies mandate using their own API keys for compliance/billing
- **User trust:** "Your keys, your data, your billing" resonates with developers

---

## Platform-Paid Key Management

### API Key Sourcing Strategy

**Phase 1 (Launch):**
- Single Anthropic API key (your existing key via AWS Secrets Manager)
- Single OpenAI API key (same)
- Route through LiteLLM proxy for unified interface
- Hard execution caps to control costs

**Phase 2 (Scale):**
- Dedicated API accounts with Anthropic/OpenAI (volume pricing)
- Negotiate enterprise rates at scale (typically 20-40% discount at $10K+/mo spend)
- Multiple keys for load distribution and rate limit avoidance
- Per-provider budget caps in LiteLLM

**Phase 3 (Optimization):**
- Use free models aggressively (Groq free tier, OpenRouter free models, local Ollama)
- Model quality benchmarking: automatically select cheapest model that meets quality threshold
- Cache common skill outputs (if input is identical, serve cached result, skip LLM call)
- Batch scheduling: run agents in off-peak hours for lower latency/costs

### Cost Guardrails

- **Per-user daily spend cap:** $1 (free), $5 (pro), $20 (team)
- **Per-execution token limit:** 50K tokens max per single execution
- **Model blacklist per tier:** Free users can't use Opus/GPT-4o (too expensive)
- **Runaway detection:** Kill agent if it's in a loop consuming tokens
- **Monthly burn alerts:** Email user at 50%, 80%, 100% of their tier limit

---

## Implementation Priority

| Feature | Priority | Effort | Phase |
|---|---|---|---|
| Flat tier pricing (Free + Pro) | HIGH | M | Phase 1 (Launch) |
| Platform-managed LLM keys via LiteLLM | HIGH | M | Phase 1 |
| Execution metering + tier limits | HIGH | M | Phase 1 |
| BYOK key vault + encryption | HIGH | M | Phase 2 |
| BYOK discount pricing | MEDIUM | S | Phase 2 |
| Smart model routing (cheapest capable) | MEDIUM | L | Phase 2 |
| Cost tracking dashboard (user-facing) | MEDIUM | M | Phase 3 |
| Overage billing (opt-in pay-per-exec) | LOW | L | Future |
| Enterprise volume key management | LOW | M | Future |
| Output caching to reduce LLM calls | LOW | L | Future |

---

## Stripe Integration Plan

- **Subscriptions:** Stripe Billing for monthly tiers (Free → Pro → Team)
- **Usage tracking:** Stripe Usage Records for execution metering (prep for future usage-based)
- **BYOK toggle:** Subscription modifier that switches price ID (standard vs. BYOK)
- **Creator payouts:** Stripe Connect for marketplace revenue sharing (80/20 split)
- **Webhooks:** `invoice.payment_succeeded`, `customer.subscription.updated`, `invoice.payment_failed`
