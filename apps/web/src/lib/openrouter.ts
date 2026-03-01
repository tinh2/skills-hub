const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: "no_key" | "invalid_key" | "rate_limit" | "model_error" | "parse_error" | "network",
  ) {
    super(message);
  }
}

const GENERATE_SYSTEM_PROMPT = `You are an expert at writing Claude Code skills for the skills-hub.ai marketplace.
Generate a skill definition based on the user's description.

Return ONLY valid JSON (no markdown fences, no explanation) matching this exact schema:
{
  "name": "kebab-case-skill-name (max 60 chars)",
  "description": "One clear sentence describing what the skill does (min 50 chars)",
  "categorySlug": "one of: build|test|qa|review|deploy|docs|security|ux|analysis|productivity|integration|combo|meta",
  "tags": ["tag1", "tag2", "tag3"],
  "instructions": "Full skill instructions (min 600 chars)"
}

Rules for the instructions field:
- Write as if speaking directly to Claude in imperative voice
- Include ## Input and ## Output sections describing what the skill receives and produces
- Include numbered steps or phases for the workflow
- Include an ## Error Handling section
- Include at least one concrete example
- Include a ## Guardrails or ## Constraints section
- Use markdown formatting with headers, lists, and code blocks where appropriate

Rules for tags: 3-6 lowercase single-word tags relevant to the skill.
Rules for categorySlug: Pick the single best-fit category from the list above.`;

const SUGGEST_SYSTEM_PROMPT = `You are an expert at writing Claude Code skills for the skills-hub.ai marketplace.
Based on the skill context provided, suggest only the requested field.
Return ONLY valid JSON (no markdown fences, no explanation).`;

interface GeneratedSkill {
  name: string;
  description: string;
  categorySlug: string;
  tags: string[];
  instructions: string;
}

async function callOpenRouter(
  messages: { role: string; content: string }[],
  apiKey: string,
  model: string,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://skills-hub.ai",
        "X-Title": "Skills Hub",
      },
      body: JSON.stringify({ model, messages, stream: false, temperature: 0.3, max_tokens: 4096 }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new OpenRouterError(
      "Could not reach OpenRouter. Check your internet connection.",
      "network",
    );
  }

  if (res.status === 401) {
    throw new OpenRouterError(
      "Invalid OpenRouter API key. Check your key in Settings.",
      "invalid_key",
    );
  }
  if (res.status === 402) {
    throw new OpenRouterError(
      "Insufficient credits for this model on OpenRouter.",
      "model_error",
    );
  }
  if (res.status === 429) {
    throw new OpenRouterError(
      "Rate limit reached. Wait a moment and try again.",
      "rate_limit",
    );
  }
  if (!res.ok) {
    throw new OpenRouterError(
      `OpenRouter returned an error (${res.status}). Try again.`,
      "network",
    );
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new OpenRouterError("AI returned an empty response. Try again.", "parse_error");
  }
  return content;
}

function parseJSON<T>(raw: string): T {
  // Strip markdown fences if the model wraps output
  const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new OpenRouterError(
      "AI returned unexpected output. Try again or rephrase your prompt.",
      "parse_error",
    );
  }
}

export async function generateSkill(
  prompt: string,
  apiKey: string,
  model: string,
): Promise<GeneratedSkill> {
  if (!apiKey) {
    throw new OpenRouterError("No OpenRouter API key configured. Add one in Settings.", "no_key");
  }

  const raw = await callOpenRouter(
    [
      { role: "system", content: GENERATE_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    apiKey,
    model,
  );

  return parseJSON<GeneratedSkill>(raw);
}

export async function suggestField(
  field: "name" | "description" | "tags",
  context: { prompt?: string; name?: string; description?: string; instructions?: string },
  apiKey: string,
  model: string,
): Promise<string> {
  if (!apiKey) {
    throw new OpenRouterError("No OpenRouter API key configured. Add one in Settings.", "no_key");
  }

  const contextParts: string[] = [];
  if (context.prompt) contextParts.push(`User's intent: ${context.prompt}`);
  if (context.name) contextParts.push(`Current name: ${context.name}`);
  if (context.description) contextParts.push(`Current description: ${context.description}`);
  if (context.instructions) contextParts.push(`Instructions (first 500 chars): ${context.instructions.slice(0, 500)}`);

  let fieldInstruction: string;
  if (field === "name") {
    fieldInstruction = 'Suggest a kebab-case skill name (max 60 chars). Return: { "name": "..." }';
  } else if (field === "description") {
    fieldInstruction = 'Suggest a one-sentence description (min 50, max 200 chars). Return: { "description": "..." }';
  } else {
    fieldInstruction = 'Suggest 3-6 lowercase single-word tags. Return: { "tags": ["tag1", "tag2", ...] }';
  }

  const raw = await callOpenRouter(
    [
      { role: "system", content: SUGGEST_SYSTEM_PROMPT },
      { role: "user", content: `${contextParts.join("\n")}\n\n${fieldInstruction}` },
    ],
    apiKey,
    model,
  );

  const parsed = parseJSON<Record<string, unknown>>(raw);

  if (field === "tags") {
    const tags = parsed.tags;
    if (Array.isArray(tags)) return tags.join(", ");
    throw new OpenRouterError("AI returned unexpected output for tags.", "parse_error");
  }

  const value = parsed[field];
  if (typeof value === "string") return value;
  throw new OpenRouterError(`AI returned unexpected output for ${field}.`, "parse_error");
}
