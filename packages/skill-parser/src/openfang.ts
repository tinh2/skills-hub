import type { ParsedSkill } from "./index.js";

/**
 * OpenFang HAND.toml representation.
 * A "Hand" is OpenFang's concept of a skill/tool that an agent can use.
 * See: https://github.com/OpenFang (MIT licensed)
 */
export interface HandConfig {
  hand: {
    name: string;
    description: string;
    version: string;
  };
  instructions: {
    system_prompt: string;
    user_template: string;
  };
  model: {
    provider: string;
    model_id: string;
    max_tokens: number;
    temperature: number;
  };
  limits: {
    timeout_seconds: number;
    max_retries: number;
  };
  metadata: {
    source: string;
    source_url: string;
    platforms: string[];
    category: string;
  };
}

export interface TranslateOptions {
  modelProvider?: string;
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutSeconds?: number;
  sourceUrl?: string;
}

const DEFAULT_OPTIONS: Required<TranslateOptions> = {
  modelProvider: "anthropic",
  modelId: "claude-sonnet-4-5-20250514",
  maxTokens: 4096,
  temperature: 0.3,
  timeoutSeconds: 120,
  sourceUrl: "",
};

/**
 * Translate a parsed SKILL.md into OpenFang HAND.toml format.
 */
export function translateToHand(
  skill: ParsedSkill,
  options: TranslateOptions = {},
): HandConfig {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Extract a user template from the instructions if one is defined,
  // otherwise use a generic template
  const userTemplate = extractUserTemplate(skill.instructions);

  return {
    hand: {
      name: sanitizeName(skill.name),
      description: skill.description,
      version: skill.version,
    },
    instructions: {
      system_prompt: skill.instructions,
      user_template: userTemplate,
    },
    model: {
      provider: opts.modelProvider,
      model_id: opts.modelId,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
    },
    limits: {
      timeout_seconds: opts.timeoutSeconds,
      max_retries: 2,
    },
    metadata: {
      source: "skills-hub.ai",
      source_url: opts.sourceUrl,
      platforms: skill.platforms,
      category: skill.category ?? "general",
    },
  };
}

/**
 * Serialize a HandConfig to TOML format string.
 */
export function serializeHandToml(config: HandConfig): string {
  const lines: string[] = [];

  lines.push("[hand]");
  lines.push(`name = ${tomlString(config.hand.name)}`);
  lines.push(`description = ${tomlString(config.hand.description)}`);
  lines.push(`version = ${tomlString(config.hand.version)}`);
  lines.push("");

  lines.push("[instructions]");
  lines.push(`system_prompt = ${tomlMultilineString(config.instructions.system_prompt)}`);
  lines.push(`user_template = ${tomlString(config.instructions.user_template)}`);
  lines.push("");

  lines.push("[model]");
  lines.push(`provider = ${tomlString(config.model.provider)}`);
  lines.push(`model_id = ${tomlString(config.model.model_id)}`);
  lines.push(`max_tokens = ${config.model.max_tokens}`);
  lines.push(`temperature = ${config.model.temperature}`);
  lines.push("");

  lines.push("[limits]");
  lines.push(`timeout_seconds = ${config.limits.timeout_seconds}`);
  lines.push(`max_retries = ${config.limits.max_retries}`);
  lines.push("");

  lines.push("[metadata]");
  lines.push(`source = ${tomlString(config.metadata.source)}`);
  lines.push(`source_url = ${tomlString(config.metadata.source_url)}`);
  lines.push(`platforms = [${config.metadata.platforms.map(tomlString).join(", ")}]`);
  lines.push(`category = ${tomlString(config.metadata.category)}`);

  return lines.join("\n") + "\n";
}

/**
 * Extract a user template from skill instructions.
 * Looks for patterns like "INPUT:", "User provides:", etc.
 */
function extractUserTemplate(instructions: string): string {
  // Look for explicit input specification
  const inputPatterns = [
    /(?:input|user provides?|expects?|takes?)\s*:\s*(.+?)(?:\n\n|\n(?=[A-Z#]))/is,
    /(?:^|\n)>\s*(?:input|user)\s*:\s*(.+?)(?:\n\n|\n(?=[A-Z#]))/is,
  ];

  for (const pattern of inputPatterns) {
    const match = instructions.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "{{input}}";
}

/**
 * Sanitize a skill name for OpenFang compatibility.
 * OpenFang hand names must be lowercase alphanumeric with hyphens.
 */
function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function tomlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

function tomlMultilineString(value: string): string {
  // Use TOML multiline literal strings for long content
  if (value.length > 200 || value.includes("\n")) {
    // Escape any triple quotes in the content
    const escaped = value.replace(/'''/g, "'''\\'''");
    return `'''\n${escaped}\n'''`;
  }
  return tomlString(value);
}
