import { listSignals, listLabels } from './labels';
import { validateSignals } from './validator';
import { ObjectEngine } from '../object-engine';

export function formatLabelReport(objectEngine: ObjectEngine): string {
  const allLabels = listLabels();
  const allSignals = listSignals();
  const diags = validateSignals(objectEngine);

  let output = `# Named Connectivity & Signals Report\n\n`;
  output += `## Summary\n`;
  output += `- **Total Labels:** ${allLabels.length}\n`;
  output += `- **Total Unique Signals:** ${allSignals.length}\n`;
  output += `- **Total Diagnostics:** ${diags.length}\n\n`;

  output += `## Named Signals List\n`;
  if (allSignals.length === 0) {
    output += `No named signals defined.\n\n`;
  } else {
    for (const signal of allSignals) {
      output += `### ${signal.name} (${signal.scope})\n`;
      output += `- Labels associated: ${signal.labels.join(', ')}\n\n`;
    }
  }

  output += `## Diagnostics\n`;
  if (diags.length === 0) {
    output += `✓ No connectivity signal violations detected.\n`;
  } else {
    for (const d of diags) {
      output += `### [${d.severity}] ${d.title} (${d.category})\n`;
      output += `- **Description:** ${d.description}\n`;
      if (d.suggestedFix) {
        output += `- **Suggested Fix:** ${d.suggestedFix}\n`;
      }
      output += `\n`;
    }
  }

  return output;
}
