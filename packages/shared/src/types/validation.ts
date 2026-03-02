export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: ValidationSeverity;
  message: string;
}

export interface ValidationReport {
  slug: string;
  qualityScore: number;
  publishable: boolean;
  checks: {
    schema: ValidationCheck[];
    content: ValidationCheck[];
    structure: ValidationCheck[];
    security: ValidationCheck[];
  };
  summary: {
    errors: number;
    warnings: number;
    passed: number;
    total: number;
  };
}
