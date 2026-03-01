export type SandboxStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "TIMEOUT";

export interface TestCaseData {
  id: string;
  label: string;
  input: string;
  expectedOutput: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface SandboxRunSummary {
  id: string;
  skillId: string;
  input: string;
  output: string | null;
  status: SandboxStatus;
  durationMs: number | null;
  tokenCount: number | null;
  errorMessage: string | null;
  testCaseId: string | null;
  createdAt: string;
}