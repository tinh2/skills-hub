export type AgentStatus = "RUNNING" | "PAUSED" | "STOPPED" | "ERROR";
export type TriggerType = "MANUAL" | "SCHEDULE" | "WEBHOOK" | "CHANNEL";
export type ExecutionStatus = "RUNNING" | "COMPLETED" | "FAILED" | "TIMEOUT";

export interface AgentSummary {
  id: string;
  name: string;
  skill: { slug: string; name: string };
  status: AgentStatus;
  triggerType: TriggerType;
  channelType: string | null;
  modelProvider: string;
  modelId: string;
  executionCount: number;
  lastExecutedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentDetail extends AgentSummary {
  triggerConfig: Record<string, unknown> | null;
  channelConfig: Record<string, unknown> | null;
  openfangHandId: string | null;
  recentExecutions: AgentExecutionSummary[];
}

export interface AgentExecutionSummary {
  id: string;
  status: ExecutionStatus;
  input: string | null;
  output: string | null;
  durationMs: number | null;
  tokenCount: number | null;
  errorMessage: string | null;
  triggeredBy: string;
  createdAt: string;
}
