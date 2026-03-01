# Future Features: Usage-Based Pricing & Advanced Billing

**Date:** 2026-02-28
**Status:** Deferred — implement after flat tiers are proven and user behavior data is collected
**Prerequisite:** Flat tier pricing running in production with execution metering (NEW_FEATURES.md)

---

## F-039: Usage-Based Pricing (Per-Execution Billing)

**Priority:** DEFERRED (implement when Pro tier has 500+ users)
**Effort:** XL
**Why deferred:** Flat tiers are simpler to build, easier to market, and convert better. Usage-based is more profitable at scale but requires metering infrastructure, billing pipeline, and user education.

### When to Implement

Trigger conditions (any of these):
1. **Power users hitting caps** — >20% of Pro users consistently maxing out 5K executions
2. **Unprofitable tiers** — Platform LLM costs exceed 60% of tier revenue
3. **Enterprise demand** — Enterprise prospects explicitly request pay-per-use
4. **BYOK adoption low** — Team users staying on platform keys and burning margin

### Pricing Model

**Base + Overage:**
- Keep flat tiers as the default (most users prefer predictable)
- Add opt-in overage pricing for users who hit their cap

| Tier | Included Executions | Overage Rate |
|---|---|---|
| Free | 100/month | Blocked (must upgrade) |
| Pro | 5,000/month | $0.005/execution |
| Team | 25,000/seat/month | $0.003/execution |
| Enterprise | Custom | Custom |

**Pure usage-based tier (alternative):**
- New tier: "Pay As You Go" — no monthly fee, $0.01/execution
- Target: infrequent users who run agents occasionally
- Floor: $0 (if no executions, no charge)
- Cap: $50/month (auto-converts to Pro if they'd save money)

### Token-Level Billing (Advanced)

Instead of per-execution, charge per-token with markup:

| Provider | Our cost (input/output per 1M tokens) | User price | Markup |
|---|---|---|---|
| Claude Haiku | $0.25 / $1.25 | $0.50 / $2.50 | 2x |
| Claude Sonnet | $3.00 / $15.00 | $6.00 / $30.00 | 2x |
| GPT-4o-mini | $0.15 / $0.60 | $0.30 / $1.20 | 2x |
| GPT-4o | $2.50 / $10.00 | $5.00 / $20.00 | 2x |
| Groq (Llama) | $0.05 / $0.08 | $0.10 / $0.16 | 2x |
| DeepSeek R1 | Free (OpenRouter) | $0.05 / $0.10 | Pure margin |
| Local Ollama | $0 (compute cost only) | $0.02 / $0.05 | Pure margin |

**Why 2x markup:** Industry standard is 2-4x. Starting at 2x is competitive and leaves room to increase.

### Implementation Requirements

- **Metering pipeline:** Track tokens per execution per user per model (already needed for cost dashboard)
- **Stripe Usage Records:** Report usage hourly/daily to Stripe for billing
- **Usage dashboard:** Real-time token/execution counter visible to user
- **Spending alerts:** Email at 50%, 80%, 100% of estimated monthly cost
- **Billing page:** Breakdown by agent, by model, by day
- **Invoice generation:** Monthly invoice with line items per model
- **Prepaid credits (optional):** Buy credits in advance at discount ($50 gets $55 in credits)

---

## F-040: Dynamic Model Routing with Cost Optimization

**Priority:** DEFERRED (implement after behavioral testing data exists)
**Effort:** L

### Description

Automatically select the cheapest LLM model that meets a quality threshold for each skill execution. Uses behavioral testing scores to know which models produce acceptable output for each skill.

### How It Works

1. Skill behavioral tests run against multiple models (Haiku, Sonnet, GPT-4o-mini, etc.)
2. Quality scores recorded per model per skill
3. At execution time, route to cheapest model that scores above quality threshold
4. User can override with a "quality vs cost" slider: "Cheapest" ↔ "Best quality"

### Example

| Skill | Haiku quality | Sonnet quality | GPT-4o-mini quality | Selected model |
|---|---|---|---|---|
| Code reviewer | 62/100 | 91/100 | 78/100 | GPT-4o-mini (cheapest above 75) |
| Research agent | 45/100 | 88/100 | 71/100 | Sonnet (only one above 75) |
| Commit message | 89/100 | 95/100 | 87/100 | Haiku (all pass, cheapest wins) |

### Savings Potential

If 60% of skills can run on Haiku/GPT-4o-mini instead of Sonnet/GPT-4o:
- Average cost/execution drops from $0.01 to $0.004
- Pro tier margin improves from 17% to 56%
- Free tier acquisition cost drops from $0.09 to $0.04/user/month

---

## F-041: Prepaid Credit System

**Priority:** DEFERRED
**Effort:** M

### Description

Users buy credits in advance at a discount. Credits are consumed per execution or per token. Targets users who want cost control without a monthly subscription.

### Credit Packages

| Package | Price | Credits | Bonus | $/credit |
|---|---|---|---|---|
| Starter | $10 | 1,100 | 10% | $0.009 |
| Growth | $50 | 6,000 | 20% | $0.008 |
| Scale | $200 | 26,000 | 30% | $0.007 |

### Credit Consumption

- 1 execution (fast model) = 1 credit
- 1 execution (standard model) = 5 credits
- 1 execution (heavy model) = 25 credits
- Sandbox try = 2 credits

### Why Defer

- Adds billing complexity (credits + subscriptions = two payment systems)
- Need to understand actual usage patterns before setting credit values
- Risk of underpricing credits and losing money

---

## F-042: Creator Revenue Sharing with Usage-Based Splits

**Priority:** DEFERRED (implement with F-030 Agent Marketplace)
**Effort:** L

### Description

When usage-based pricing is active, creators of premium skills earn a percentage of the token/execution revenue their skills generate — not just a one-time sale price.

### Model

- Creator sets skill as "premium"
- User pays per-execution (from usage-based pricing)
- Revenue split: 70% platform / 30% creator (platform has infrastructure costs)
- OR: Creator sets fixed price per execution ($0.01-$0.50) on top of platform execution cost
- Monthly payout via Stripe Connect, $25 minimum

### Why This Is Powerful

- Aligns creator incentives with skill quality (better skill → more usage → more revenue)
- Recurring revenue for creators (not one-time sales like PromptBase)
- Platform earns from both hosting fee AND marketplace commission

---

## F-043: Enterprise Committed-Use Discounts

**Priority:** DEFERRED (implement when enterprise pipeline exists)
**Effort:** S

### Description

Enterprise customers commit to monthly execution volume in exchange for discounted rates.

| Commitment | Discount | Example |
|---|---|---|
| 100K executions/month | 20% off | $0.008/exec → $0.0064/exec |
| 500K executions/month | 35% off | $0.008/exec → $0.0052/exec |
| 1M+ executions/month | 45% off | $0.008/exec → $0.0044/exec |

Minimum 12-month contract. Overage at standard rates.

---

## F-044: Cost Anomaly Detection & Alerts

**Priority:** DEFERRED (implement with F-034 Agent Analytics)
**Effort:** M

### Description

Detect unusual spending patterns and alert users before they get a surprise bill.

### Scenarios

- Agent stuck in a loop consuming tokens → auto-kill after 3x normal cost
- Sudden spike in executions (compromised webhook?) → pause and alert
- Model fallback to expensive provider → notify user of cost increase
- Monthly spend trending 2x above average → warning email at midpoint

---

## Implementation Sequence

These features build on each other:

```
Phase 1 (Now): Flat tiers + platform keys + execution metering
    ↓
Phase 2 (Month 3): BYOK + cost dashboard
    ↓
Phase 3 (Month 6): F-040 Dynamic model routing (needs behavioral test data)
    ↓
Phase 4 (Month 8): F-039 Usage-based pricing (needs metering + user data)
    ↓
Phase 5 (Month 10): F-041 Credits + F-042 Creator revenue sharing
    ↓
Phase 6 (Year 2): F-043 Enterprise commitments + F-044 Anomaly detection
```

---

## Data to Collect Before Implementing

Before switching to usage-based, collect at least 3 months of flat-tier data:

1. **Executions per user per month** — distribution (median, p95, p99)
2. **Tokens per execution** — by skill category and model
3. **Model selection patterns** — which models users/skills actually need
4. **BYOK adoption rate** — what % of users bring their own keys
5. **Tier conversion funnel** — free → pro → team conversion rates
6. **Churn by usage level** — do heavy users churn more (hitting caps)?
7. **Cost per tier** — actual LLM spend per tier bucket

This data determines:
- Whether flat tiers are sustainable or need usage-based
- Correct pricing for usage-based tiers
- Which credit packages make sense
- Whether dynamic model routing saves enough to matter
