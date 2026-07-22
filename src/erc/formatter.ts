import { ERCReport } from './types';

export class ERCReportFormatter {
  format(report: ERCReport): string {
    const s = report.summary;
    const lines: string[] = [];

    lines.push('# Electrical Rules Check (ERC) Report');
    lines.push('');
    lines.push('## Summary');
    lines.push(`* **Total Issues**: ${s.totalIssues}`);
    lines.push(`* **Errors**: ${s.errors}`);
    lines.push(`* **Warnings**: ${s.warnings}`);
    lines.push(`* **Information**: ${s.information}`);
    lines.push(`* **Analyzed Components**: ${s.analyzedComponents}`);
    lines.push(`* **Analyzed Nets**: ${s.analyzedNets}`);
    lines.push(`* **Execution Time**: ${s.executionTimeMs}ms`);
    lines.push('');

    if (report.diagnostics.length === 0) {
      lines.push('**No electrical rule violations detected.**');
      lines.push('');
      return lines.join('\n');
    }

    lines.push('## Violations');
    lines.push('');

    for (const diag of report.diagnostics) {
      const severityIcon = diag.severity === 'Error' ? '🔴' : diag.severity === 'Warning' ? '🟡' : 'ℹ️';
      lines.push(`### ${severityIcon} [${diag.severity}] ${diag.title} (${diag.id})`);
      lines.push(`* **Category**: ${diag.category}`);
      lines.push(`* **Description**: ${diag.description}`);
      if (diag.affectedObjects.length > 0) {
        lines.push(`* **Affected Objects**: ${diag.affectedObjects.join(', ')}`);
      }
      if (diag.affectedNets.length > 0) {
        lines.push(`* **Affected Nets**: ${diag.affectedNets.join(', ')}`);
      }
      if (diag.suggestedFix) {
        lines.push(`* **Suggested Fix**: ${diag.suggestedFix}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

export const formatERCReport = (report: ERCReport) => new ERCReportFormatter().format(report);
