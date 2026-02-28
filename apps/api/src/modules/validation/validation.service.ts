import { QUALITY_SCORE, CATEGORY_SLUGS } from "@skills-hub/shared";
import { validateSemver } from "@skills-hub/skill-parser";

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
