import { z } from "zod";

const MAX_JSON_CONFIG_SIZE = 10_000; // 10KB max for JSON config fields

const triggerConfigSchema = z.record(z.unknown()).optional().refine(
  (val) => !val || JSON.stringify(val).length <= MAX_JSON_CONFIG_SIZE,
  { message: `Trigger config must be under ${MAX_JSON_CONFIG_SIZE} characters` },
);
const channelConfigSchema = z.record(z.unknown()).optional().refine(
  (val) => !val || JSON.stringify(val).length <= MAX_JSON_CONFIG_SIZE,
  { message: `Channel config must be under ${MAX_JSON_CONFIG_SIZE} characters` },
);

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  skillSlug: z.string().min(1).max(200),
  triggerType: z.enum(["MANUAL", "SCHEDULE", "WEBHOOK", "CHANNEL"]).default("MANUAL"),
  triggerConfig: triggerConfigSchema,
  channelType: z.string().max(50).optional(),
  channelConfig: channelConfigSchema,
  modelProvider: z.string().max(50).default("anthropic"),
  modelId: z.string().max(100).default("claude-sonnet-4-5-20250514"),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  triggerType: z.enum(["MANUAL", "SCHEDULE", "WEBHOOK", "CHANNEL"]).optional(),
  triggerConfig: triggerConfigSchema,
  channelType: z.string().max(50).nullable().optional(),
  channelConfig: channelConfigSchema,
  modelProvider: z.string().max(50).optional(),
  modelId: z.string().max(100).optional(),
});

export const agentQuerySchema = z.object({
  status: z.enum(["RUNNING", "PAUSED", "STOPPED", "ERROR"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const executeAgentSchema = z.object({
  input: z.string().max(10_000).optional(),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type AgentQuery = z.infer<typeof agentQuerySchema>;
export type ExecuteAgentInput = z.infer<typeof executeAgentSchema>;
