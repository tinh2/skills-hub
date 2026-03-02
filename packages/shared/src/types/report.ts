export type ReportReason =
  | "MALICIOUS"
  | "SPAM"
  | "INAPPROPRIATE"
  | "COPYRIGHT"
  | "MISLEADING"
  | "OTHER";

export type ReportStatus = "PENDING" | "REVIEWED" | "DISMISSED";

export interface SkillReportSummary {
  id: string;
  skillSlug: string;
  skillName: string;
  reason: ReportReason;
  description: string;
  reporterUsername: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export type TrustLevel = "NEW" | "ESTABLISHED" | "TRUSTED";
