# @skills-hub-ai/skill-parser

Parser for SKILL.md files — extracts YAML frontmatter and instructions from the skills-hub skill format.

This is an internal library used by `@skills-hub-ai/cli`, `@skills-hub-ai/mcp`, and the skills-hub API.

## Usage

```ts
import { parseSkillMd } from "@skills-hub-ai/skill-parser";

const result = parseSkillMd(`---
name: My Skill
description: Does something useful
version: 1.0.0
category: code-quality
platforms:
  - claude-code
---

Your skill instructions here.
`);

if (result.success) {
  console.log(result.skill.name);         // "My Skill"
  console.log(result.skill.instructions); // "Your skill instructions here."
}
```

## Exports

### `parseSkillMd(content: string): ParseResult`

Parses a SKILL.md file. Returns `{ success, skill?, errors[] }`.

**Required fields:** name, description, version
**Optional fields:** category (validated against known slugs), platforms (normalized to uppercase)

### `validateSemver(version: string): boolean`

Validates that a string matches `X.Y.Z` semver format.

### `compareSemver(a: string, b: string): number`

Compares two semver strings. Returns -1, 0, or 1.

### OpenFang support

```ts
import { translateToHand, serializeHandToml } from "@skills-hub-ai/skill-parser/openfang";

const hand = translateToHand(skill);
const toml = serializeHandToml(hand);
```

Converts SKILL.md format to OpenFang HAND.toml for agent execution.

## Links

- [GitHub](https://github.com/tinh2/skills-hub)
- [skills-hub.ai](https://skills-hub.ai)
