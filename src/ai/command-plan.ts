import { CommandPlan, PlanCommand } from './types';
import { ConstraintDiagnostic } from '../constraint-engine/types';

export function createPlan(
  id: string,
  description: string,
  confidence: number,
  requiredCommands: PlanCommand[],
  diagnostics: ConstraintDiagnostic[],
  assumptions: string[]
): CommandPlan {
  return Object.freeze({
    id,
    description,
    confidence,
    requiredCommands: Object.freeze(requiredCommands.map(c => Object.freeze({ ...c }))),
    diagnostics: Object.freeze(diagnostics.map(d => Object.freeze({ ...d }))),
    assumptions: Object.freeze([...assumptions]),
  });
}

export function describePlan(plan: CommandPlan): string {
  const lines: string[] = [];
  lines.push(`Plan ID: ${plan.id}`);
  lines.push(`Description: ${plan.description}`);
  lines.push(`Confidence: ${(plan.confidence * 100).toFixed(1)}%`);

  if (plan.requiredCommands.length > 0) {
    lines.push('Commands:');
    plan.requiredCommands.forEach((cmd, idx) => {
      lines.push(`  ${idx + 1}. [${cmd.type}] ${JSON.stringify(cmd.payload)}`);
    });
  }

  if (plan.assumptions.length > 0) {
    lines.push('Assumptions:');
    plan.assumptions.forEach((asm) => {
      lines.push(`  - ${asm}`);
    });
  }

  if (plan.diagnostics.length > 0) {
    lines.push('Diagnostics:');
    plan.diagnostics.forEach((d) => {
      lines.push(`  - [${d.severity.toUpperCase()}] ${d.title}: ${d.message}`);
    });
  }

  return lines.join('\n');
}
