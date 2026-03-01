# @skills-hub-ai/cli

CLI for [skills-hub.ai](https://skills-hub.ai) — discover, install, and publish Claude Code skills from your terminal.

## Quick Start

```bash
# No install needed — use npx
npx @skills-hub-ai/cli search "code review"
npx @skills-hub-ai/cli install <skill-name>

# Or install globally
npm install -g @skills-hub-ai/cli
skills-hub install <skill-name>
```

## Commands

### Browsing & Installing

| Command | Description |
|---------|-------------|
| `skills-hub search <query>` | Search the skill catalog |
| `skills-hub install <slug>` | Install a skill into your project |
| `skills-hub uninstall <slug>` | Remove a locally installed skill |
| `skills-hub list` | List locally installed skills |
| `skills-hub update [slug]` | Update installed skills to latest versions |
| `skills-hub info <slug>` | Show detailed info about a skill |
| `skills-hub categories` | List all skill categories |
| `skills-hub diff <slug> <v1> <v2>` | Show diff between two versions |

### Publishing

| Command | Description |
|---------|-------------|
| `skills-hub publish [path]` | Publish a skill from a SKILL.md file |
| `skills-hub version <slug> [path]` | Create a new version of a published skill |
| `skills-hub unpublish <slug>` | Archive a published skill |

### Authentication

| Command | Description |
|---------|-------------|
| `skills-hub login` | Sign in with GitHub |
| `skills-hub logout` | Sign out and clear credentials |
| `skills-hub whoami` | Show current user |

### Organizations

| Command | Description |
|---------|-------------|
| `skills-hub org create <slug>` | Create an organization |
| `skills-hub org list` | List your organizations |
| `skills-hub org info <slug>` | Show org details |
| `skills-hub org invite <org> <user>` | Invite a user |
| `skills-hub org remove <org> <user>` | Remove a member |
| `skills-hub org leave <org>` | Leave an organization |
| `skills-hub org sync <org>` | Sync with a GitHub organization |

## Install Targets

Skills are saved to the appropriate directory for your AI assistant:

| Target | Directory |
|--------|-----------|
| Claude Code | `.claude/skills/` |
| Cursor | `.cursor/skills/` |

Use `--target cursor` to install for Cursor instead of the default (Claude Code).

## SKILL.md Format

```yaml
---
name: My Skill
description: What this skill does
category: code-quality
platforms:
  - claude-code
version: 1.0.0
tags:
  - review
  - quality
---

Your skill instructions here.
```

## Links

- [Browse skills](https://skills-hub.ai/browse)
- [CLI Reference](https://skills-hub.ai/docs/cli)
- [Getting Started](https://skills-hub.ai/docs/getting-started)
- [GitHub](https://github.com/tinh2/skills-hub)
