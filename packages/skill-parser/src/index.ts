import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { CATEGORY_SLUGS, PLATFORMS } from "@skills-hub/shared";

const frontmatterSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  version: z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .pipe(z.string().min(1)),
  category: z
    .string()
    .optional()
    .transform((v) => v?.toLowerCase()),
  platforms: z
    .array(z.string())
    .optional()
    .default([]),
});

export interface ParsedSkill {
  name: string;
  description: string;
  version: string;
  category: string | undefined;
  platforms: string[];
  instructions: string;
  raw: string;
}

export interface ParseError {
  field: string;
  message: string;
}

export interface ParseResult {
  success: boolean;
  skill?: ParsedSkill;
  errors: ParseError[];
}

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseSkillMd(content: string): ParseResult {
  const errors: ParseError[] = [];
  const trimmed = content.trim();

  if (!trimmed) {
    return { success: false, errors: [{ field: "content", message: "File is empty" }] };
  }

  const match = trimmed.match(FRONTMATTER_REGEX);
  if (!match) {
    return {
      success: false,
      errors: [{ field: "frontmatter", message: "No YAML frontmatter found. Expected --- delimiters." }],
    };
  }

  const [, yamlBlock, instructionBlock] = match;
  let parsed: Record<string, unknown>;

  try {
    parsed = parseYaml(yamlBlock) as Record<string, unknown>;
  } catch (e) {
    return {
      success: false,
      errors: [{ field: "frontmatter", message: `Invalid YAML: ${e instanceof Error ? e.message : "unknown error"}` }],
    };
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      success: false,
      errors: [{ field: "frontmatter", message: "Frontmatter must be a YAML object" }],
    };
  }

  const result = frontmatterSchema.safeParse(parsed);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({ field: issue.path.join(".") || "unknown", message: issue.message });
    }
    return { success: false, errors };
  }

  const { name, description, version, category, platforms } = result.data;
  const instructions = (parsed.instructions as string) || instructionBlock.trim();

  if (!instructions) {
    errors.push({ field: "instructions", message: "No instructions found in frontmatter or body" });
    return { success: false, errors };
  }

  if (category && !CATEGORY_SLUGS.includes(category as any)) {
    errors.push({
      field: "category",
      message: `Unknown category "${category}". Valid: ${CATEGORY_SLUGS.join(", ")}`,
    });
  }

  const normalizedPlatforms = platforms.map((p) => p.toUpperCase().replace(/[\s-]/g, "_"));
  for (const p of normalizedPlatforms) {
    if (!PLATFORMS.includes(p as any)) {
      errors.push({ field: "platforms", message: `Unknown platform "${p}". Valid: ${PLATFORMS.join(", ")}` });
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    skill: {
      name,
      description,
      version,
      category,
      platforms: normalizedPlatforms,
      instructions,
      raw: content,
    },
    errors: [],
  };
}

export function validateSemver(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version);
}

export function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}
