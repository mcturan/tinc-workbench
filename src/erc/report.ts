import { ERCDiagnostic, ERCReport, ERCReportSummary } from './types';

export class ERCReportGenerator {
  generate(
    diagnostics: ERCDiagnostic[],
    analyzedComponents: number,
    analyzedNets: number,
    executionTimeMs: number
  ): ERCReport {
    let errors = 0;
    let warnings = 0;
    let information = 0;

    for (const d of diagnostics) {
      if (d.severity === 'Error') errors++;
      if (d.severity === 'Warning') warnings++;
      if (d.severity === 'Information') information++;
    }

    const summary: ERCReportSummary = {
      totalIssues: diagnostics.length,
      errors,
      warnings,
      information,
      analyzedComponents,
      analyzedNets,
      executionTimeMs,
    };

    return {
      summary,
      diagnostics,
    };
  }
}

export const generateERCReport = (
  diagnostics: ERCDiagnostic[],
  analyzedComponents: number,
  analyzedNets: number,
  executionTimeMs: number
) => new ERCReportGenerator().generate(diagnostics, analyzedComponents, analyzedNets, executionTimeMs);
