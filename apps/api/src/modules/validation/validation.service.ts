import { QUALITY_SCORE, CATEGORY_SLUGS } from "@skills-hub-ai/shared";
import type { ValidationCheck, ValidationReport } from "@skills-hub-ai/shared";
import { validateSemver } from "@skills-hub-ai/skill-parser";

interface ScoreInput {
  name: string;
  description: string;
  categorySlug: string;
  platforms: string[];
  instructions: string;
  version: string;
}

interface ScoreBreakdown {
  schema: number;
  instructions: number;
  total: number;
  details: string[];
}

export function computeQualityScore(input: ScoreInput): number {
  return computeDetailedScore(input).total;
}

export function computeDetailedScore(input: ScoreInput): ScoreBreakdown {
  const details: string[] = [];
  let schema = 0;
  let instructions = 0;

  // Schema scoring (0-25)
  if (input.name && input.description && input.instructions && input.version) {
    schema += QUALITY_SCORE.SCHEMA_FIELDS_PRESENT;
    details.push(`+${QUALITY_SCORE.SCHEMA_FIELDS_PRESENT} all required fields present`);
  }

  if (input.description.length >= QUALITY_SCORE.THRESHOLDS.MIN_DESCRIPTION_CHARS) {
    schema += QUALITY_SCORE.SCHEMA_DESCRIPTION_LENGTH;
    details.push(`+${QUALITY_SCORE.SCHEMA_DESCRIPTION_LENGTH} description ≥ ${QUALITY_SCORE.THRESHOLDS.MIN_DESCRIPTION_CHARS} chars`);
  }

  if (validateSemver(input.version)) {
    schema += QUALITY_SCORE.SCHEMA_SEMVER;
    details.push(`+${QUALITY_SCORE.SCHEMA_SEMVER} valid semver`);
  }

  if (CATEGORY_SLUGS.includes(input.categorySlug as any)) {
    schema += QUALITY_SCORE.SCHEMA_VALID_CATEGORY;
    details.push(`+${QUALITY_SCORE.SCHEMA_VALID_CATEGORY} valid category`);
  }

  // Instruction scoring (0-75)
  const inst = input.instructions;

  if (inst.length >= QUALITY_SCORE.THRESHOLDS.MIN_INSTRUCTION_CHARS) {
    instructions += QUALITY_SCORE.INSTRUCTION_MIN_LENGTH;
    details.push(`+${QUALITY_SCORE.INSTRUCTION_MIN_LENGTH} instructions ≥ ${QUALITY_SCORE.THRESHOLDS.MIN_INSTRUCTION_CHARS} chars`);
  }

  if (inst.length >= QUALITY_SCORE.THRESHOLDS.LONG_INSTRUCTION_CHARS) {
    instructions += QUALITY_SCORE.INSTRUCTION_LONG_BONUS;
    details.push(`+${QUALITY_SCORE.INSTRUCTION_LONG_BONUS} instructions ≥ ${QUALITY_SCORE.THRESHOLDS.LONG_INSTRUCTION_CHARS} chars`);
  }

  // Check for structured phases/steps
  const hasPhases = /(?:phase|step|stage)\s*\d/i.test(inst) ||
    /(?:^|\n)\s*#{1,3}\s/m.test(inst) ||
    /(?:^|\n)\s*\d+\.\s/m.test(inst);
  if (hasPhases) {
    instructions += QUALITY_SCORE.INSTRUCTION_STRUCTURED_PHASES;
    details.push(`+${QUALITY_SCORE.INSTRUCTION_STRUCTURED_PHASES} structured phases/steps detected`);
  }

  // Check for input/output specification
  const hasIO = /(?:input|output|returns?|produces?|generates?|expects?)/i.test(inst);
  if (hasIO) {
    instructions += QUALITY_SCORE.INSTRUCTION_IO_SPEC;
    details.push(`+${QUALITY_SCORE.INSTRUCTION_IO_SPEC} input/output specification`);
  }

  // Check for error handling
  const hasErrors = /(?:error|fail|exception|catch|handle|fallback|retry)/i.test(inst);
  if (hasErrors) {
    instructions += QUALITY_SCORE.INSTRUCTION_ERROR_HANDLING;
    details.push(`+${QUALITY_SCORE.INSTRUCTION_ERROR_HANDLING} error handling instructions`);
  }

  // Check for guardrails/strict rules
  const hasGuardrails = /(?:strict|rule|must not|never|always|important|critical|do not)/i.test(inst);
  if (hasGuardrails) {
    instructions += QUALITY_SCORE.INSTRUCTION_GUARDRAILS;
    details.push(`+${QUALITY_SCORE.INSTRUCTION_GUARDRAILS} guardrails/strict rules`);
  }

  // Check for examples
  const hasExamples = /(?:example|e\.g\.|for instance|such as|```)/i.test(inst);
  if (hasExamples) {
    instructions += QUALITY_SCORE.INSTRUCTION_EXAMPLES;
    details.push(`+${QUALITY_SCORE.INSTRUCTION_EXAMPLES} examples present`);
  }

  // Check for output format
  const hasOutputFormat = /(?:output format|output structure|response format|produce|generate)/i.test(inst);
  if (hasOutputFormat) {
    instructions += QUALITY_SCORE.INSTRUCTION_OUTPUT_FORMAT;
    details.push(`+${QUALITY_SCORE.INSTRUCTION_OUTPUT_FORMAT} output format specification`);
  }

  // Cap at maximums
  schema = Math.min(schema, QUALITY_SCORE.SCHEMA_MAX);
  instructions = Math.min(instructions, QUALITY_SCORE.INSTRUCTION_MAX);
  const total = Math.min(schema + instructions, QUALITY_SCORE.MAX);

  return { schema, instructions, total, details };
}

// --- Skill Validation Pipeline ---

interface ValidateInput extends ScoreInput {
  slug: string;
}

export function validateSkill(input: ValidateInput): ValidationReport {
  const score = computeDetailedScore(input);
  const checks = {
    schema: runSchemaChecks(input),
    content: runContentChecks(input),
    structure: runStructureChecks(input.instructions),
    security: runSecurityChecks(input.instructions),
  };

  const all = [...checks.schema, ...checks.content, ...checks.structure, ...checks.security];
  const errors = all.filter((c) => !c.passed && c.severity === "error").length;
  const warnings = all.filter((c) => !c.passed && c.severity === "warning").length;
  const passed = all.filter((c) => c.passed).length;

  return {
    slug: input.slug,
    qualityScore: score.total,
    publishable: errors === 0 && score.total >= QUALITY_SCORE.THRESHOLDS.MIN_PUBLISH_SCORE,
    checks,
    summary: { errors, warnings, passed, total: all.length },
  };
}

function check(
  id: string,
  label: string,
  passed: boolean,
  severity: ValidationCheck["severity"],
  message: string,
): ValidationCheck {
  return { id, label, passed, severity, message };
}

function runSchemaChecks(input: ScoreInput): ValidationCheck[] {
  return [
    check(
      "schema.name",
      "Skill name",
      input.name.length > 0,
      "error",
      input.name.length > 0 ? "Name is present" : "Name is required",
    ),
    check(
      "schema.description",
      "Description present",
      input.description.length > 0,
      "error",
      input.description.length > 0 ? "Description is present" : "Description is required",
    ),
    check(
      "schema.description_length",
      "Description length",
      input.description.length >= QUALITY_SCORE.THRESHOLDS.MIN_DESCRIPTION_CHARS,
      "warning",
      input.description.length >= QUALITY_SCORE.THRESHOLDS.MIN_DESCRIPTION_CHARS
        ? `Description is ${input.description.length} chars`
        : `Description is ${input.description.length} chars (recommend ≥${QUALITY_SCORE.THRESHOLDS.MIN_DESCRIPTION_CHARS})`,
    ),
    check(
      "schema.version",
      "Valid semver",
      validateSemver(input.version),
      "warning",
      validateSemver(input.version) ? `Version ${input.version} is valid semver` : `"${input.version}" is not valid semver`,
    ),
    check(
      "schema.category",
      "Valid category",
      CATEGORY_SLUGS.includes(input.categorySlug as any),
      "warning",
      CATEGORY_SLUGS.includes(input.categorySlug as any)
        ? `Category "${input.categorySlug}" is valid`
        : `Category "${input.categorySlug}" is not a recognized category`,
    ),
    check(
      "schema.instructions",
      "Instructions present",
      input.instructions.length > 0,
      "error",
      input.instructions.length > 0 ? "Instructions are present" : "Instructions are required",
    ),
  ];
}

function runContentChecks(input: ScoreInput): ValidationCheck[] {
  const inst = input.instructions;
  return [
    check(
      "content.min_length",
      "Instruction length",
      inst.length >= QUALITY_SCORE.THRESHOLDS.MIN_INSTRUCTION_CHARS,
      "warning",
      inst.length >= QUALITY_SCORE.THRESHOLDS.MIN_INSTRUCTION_CHARS
        ? `Instructions are ${inst.length} chars`
        : `Instructions are ${inst.length} chars (recommend ≥${QUALITY_SCORE.THRESHOLDS.MIN_INSTRUCTION_CHARS})`,
    ),
    check(
      "content.structured",
      "Structured steps",
      /(?:phase|step|stage)\s*\d/i.test(inst) || /(?:^|\n)\s*#{1,3}\s/m.test(inst) || /(?:^|\n)\s*\d+\.\s/m.test(inst),
      "warning",
      "Instructions should use headings, numbered lists, or phase/step markers",
    ),
    check(
      "content.io_spec",
      "Input/output spec",
      /(?:input|output|returns?|produces?|generates?|expects?)/i.test(inst),
      "warning",
      "Instructions should specify expected inputs and outputs",
    ),
    check(
      "content.error_handling",
      "Error handling",
      /(?:error|fail|exception|catch|handle|fallback|retry)/i.test(inst),
      "info",
      "Consider adding error handling instructions",
    ),
    check(
      "content.examples",
      "Examples present",
      /(?:example|e\.g\.|for instance|such as|```)/i.test(inst),
      "warning",
      "Including examples helps users understand expected behavior",
    ),
    check(
      "content.guardrails",
      "Guardrails defined",
      /(?:strict|rule|must not|never|always|important|critical|do not)/i.test(inst),
      "info",
      "Consider adding guardrails and constraints",
    ),
  ];
}

function runStructureChecks(instructions: string): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  // Check for TODO/FIXME markers
  const hasTodo = /\b(?:TODO|FIXME|HACK|XXX|PLACEHOLDER)\b/.test(instructions);
  checks.push(check(
    "structure.no_todos",
    "No TODO markers",
    !hasTodo,
    "error",
    hasTodo ? "Instructions contain TODO/FIXME markers — resolve before publishing" : "No TODO markers found",
  ));

  // Check code blocks have language hints (only opening fences, not closing)
  const allFences = [...instructions.matchAll(/(?:^|\n)\s*```(\w*)/g)];
  // In paired fences, openings are at even indices (0, 2, 4...) and closings at odd
  const openingFences = allFences.filter((_, i) => i % 2 === 0);
  const totalBlocks = openingFences.length;
  const unlabeled = openingFences.filter((m) => m[1] === "").length;
  const allLabeled = totalBlocks === 0 || unlabeled === 0;
  checks.push(check(
    "structure.code_block_langs",
    "Code block languages",
    allLabeled,
    "info",
    totalBlocks === 0
      ? "No code blocks found"
      : allLabeled
        ? `All ${totalBlocks} code blocks have language hints`
        : `${unlabeled}/${totalBlocks} code blocks missing language hints`,
  ));

  // Check for consistent heading hierarchy (no h1→h3 jumps)
  const headings = [...instructions.matchAll(/^(#{1,6})\s/gm)];
  let hasHierarchyGap = false;
  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1][1].length;
    const curr = headings[i][1].length;
    if (curr > prev + 1) {
      hasHierarchyGap = true;
      break;
    }
  }
  checks.push(check(
    "structure.heading_hierarchy",
    "Heading hierarchy",
    !hasHierarchyGap,
    "info",
    hasHierarchyGap
      ? "Heading levels skip (e.g. h1 → h3) — use consecutive levels for clarity"
      : "Heading hierarchy is consistent",
  ));

  // Check for very short instructions (likely incomplete)
  checks.push(check(
    "structure.not_trivial",
    "Non-trivial instructions",
    instructions.length >= 100,
    "error",
    instructions.length >= 100
      ? "Instructions have substantive content"
      : "Instructions are too short to be useful (under 100 chars)",
  ));

  return checks;
}

// --- Security Pattern Scanning ---

/** Patterns that indicate potentially malicious skill instructions */
const SECURITY_PATTERNS = {
  // Shell injection / destructive commands
  shellInjection: {
    pattern: /(?:curl|wget|fetch)\s+[^\n]*\|\s*(?:bash|sh|zsh|exec)|rm\s+-rf\s+[\/~]|mkfs\s|dd\s+if=|>\s*\/dev\/sd/i,
    label: "Destructive shell commands",
    message: "Instructions contain destructive shell patterns (pipe to shell, rm -rf /, disk overwrite)",
    severity: "error" as const,
  },
  // Data exfiltration - sending env vars or files to external URLs
  dataExfiltration: {
    pattern: /(?:curl|wget|fetch|nc|ncat)\s+(?:--data|--upload|-d|-F|-T)\s*[^\s]*(?:\$\{?\w*(?:KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL|API_KEY)\w*\}?|\/etc\/(?:passwd|shadow)|~\/\.(?:ssh|aws|env))/i,
    label: "Data exfiltration",
    message: "Instructions appear to exfiltrate sensitive data (secrets, credentials, private files) to external services",
    severity: "error" as const,
  },
  // Environment variable dumping to external destination
  envDumping: {
    pattern: /(?:env|printenv|set)\s*(?:\||>).*(?:curl|wget|nc|tee\s+\/dev\/tcp)/i,
    label: "Environment variable exfiltration",
    message: "Instructions dump environment variables to external destinations",
    severity: "error" as const,
  },
  // Suspicious external URLs with data sending
  suspiciousUrls: {
    pattern: /(?:curl|wget|fetch|nc)\s+(?:-X\s*POST\s+)?https?:\/\/(?:\d{1,3}\.){3}\d{1,3}|(?:curl|wget)\s+.*(?:pastebin|ngrok|requestbin|webhook\.site|pipedream|hookbin|burpcollaborator)/i,
    label: "Suspicious external URLs",
    message: "Instructions send data to IP addresses or known data collection services",
    severity: "error" as const,
  },
  // Prompt injection attempts
  promptInjection: {
    pattern: /(?:ignore\s+(?:all\s+)?previous\s+instructions|you\s+are\s+now\s+(?:a\s+)?(?:different|new)|override\s+(?:your|all)\s+(?:safety|system)\s+(?:rules|instructions|prompt)|disregard\s+(?:all|your)\s+(?:previous|prior|safety)|jailbreak|DAN\s*mode)/i,
    label: "Prompt injection",
    message: "Instructions contain prompt injection attempts that try to override safety rules",
    severity: "error" as const,
  },
  // Base64 encoded command execution
  obfuscatedCommands: {
    pattern: /(?:echo|printf)\s+\S+\s*\|\s*(?:base64\s+-d|openssl\s+(?:enc|base64))\s*\|\s*(?:bash|sh|eval)|eval\s*\(\s*(?:atob|Buffer\.from|base64)/i,
    label: "Obfuscated commands",
    message: "Instructions contain base64-encoded commands piped to shell execution",
    severity: "error" as const,
  },
  // Crypto mining
  cryptoMining: {
    pattern: /(?:xmrig|minerd|cpuminer|cryptonight|stratum\+tcp|pool\.\w+\.(?:com|net|org):\d+|--algo\s+(?:cn|rx|randomx))/i,
    label: "Cryptocurrency mining",
    message: "Instructions reference cryptocurrency mining tools or pools",
    severity: "error" as const,
  },
  // Reverse shell patterns
  reverseShell: {
    pattern: /(?:\/dev\/tcp\/|nc\s+-(?:e|lvp)|bash\s+-i\s+>&|python[23]?\s+-c\s+['"]import\s+(?:socket|os)|php\s+-r\s+.*fsockopen|perl\s+-e\s+.*socket)/i,
    label: "Reverse shell",
    message: "Instructions contain reverse shell patterns that could give remote access",
    severity: "error" as const,
  },
  // Disable security features
  disableSecurity: {
    pattern: /(?:--no-verify|--no-check|git\s+config\s+.*(?:false|off)|chmod\s+777\s|chown\s+root|sudo\s+(?:chmod|chown|rm|bash|sh|su))/i,
    label: "Security bypass",
    message: "Instructions disable security features or escalate privileges",
    severity: "warning" as const,
  },
  // Suspicious file system access
  suspiciousFileAccess: {
    pattern: /(?:cat|less|head|tail|cp|mv|tar)\s+(?:\/etc\/(?:passwd|shadow|sudoers)|~\/\.(?:ssh\/|gnupg\/|aws\/|env)|\/root\/|\/var\/log\/)/i,
    label: "Sensitive file access",
    message: "Instructions access sensitive system files (passwords, SSH keys, credentials)",
    severity: "warning" as const,
  },
};

export function runSecurityChecks(instructions: string): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  for (const [key, rule] of Object.entries(SECURITY_PATTERNS)) {
    const matched = rule.pattern.test(instructions);
    checks.push(check(
      `security.${key}`,
      rule.label,
      !matched,
      rule.severity,
      matched ? rule.message : `No ${rule.label.toLowerCase()} detected`,
    ));
  }

  return checks;
}
