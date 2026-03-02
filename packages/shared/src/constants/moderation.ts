export const TRUST_LEVELS = ["NEW", "ESTABLISHED", "TRUSTED"] as const;

export const TRUST_THRESHOLDS = {
  /** Minimum published skills to reach ESTABLISHED */
  ESTABLISHED_MIN_PUBLISHED: 3,
  /** Minimum average quality score to reach ESTABLISHED */
  ESTABLISHED_MIN_AVG_SCORE: 40,
  /** Minimum account age in days to reach ESTABLISHED */
  ESTABLISHED_MIN_ACCOUNT_AGE_DAYS: 14,
  /** Minimum published skills to reach TRUSTED */
  TRUSTED_MIN_PUBLISHED: 10,
  /** Minimum average quality score to reach TRUSTED */
  TRUSTED_MIN_AVG_SCORE: 60,
  /** Minimum account age in days to reach TRUSTED */
  TRUSTED_MIN_ACCOUNT_AGE_DAYS: 60,
  /** Max unresolved reports before trust is downgraded */
  MAX_UNRESOLVED_REPORTS: 2,
} as const;

export const REPORT_LIMITS = {
  /** Max pending reports per reporter */
  MAX_PENDING_PER_USER: 10,
  /** Rate limit: reports per day per user */
  MAX_REPORTS_PER_DAY: 5,
} as const;
