export type ERCSeverity = 'Error' | 'Warning' | 'Information';

export interface ERCDiagnostic {
  id: string;
  severity: ERCSeverity;
  category: string;
  title: string;
  description: string;
  affectedObjects: string[];
  affectedNets: string[];
  suggestedFix?: string;
}

export interface ERCReportSummary {
  totalIssues: number;
  errors: number;
  warnings: number;
  information: number;
  analyzedComponents: number;
  analyzedNets: number;
  executionTimeMs: number;
}

export interface ERCReport {
  summary: ERCReportSummary;
  diagnostics: ERCDiagnostic[];
}
