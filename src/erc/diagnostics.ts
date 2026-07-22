import { ERCDiagnostic, ERCSeverity } from './types';

export function createERCDiagnostic(
  id: string,
  severity: ERCSeverity,
  category: string,
  title: string,
  description: string,
  affectedObjects: string[],
  affectedNets: string[],
  suggestedFix?: string
): ERCDiagnostic {
  return {
    id,
    severity,
    category,
    title,
    description,
    affectedObjects: [...affectedObjects].sort(),
    affectedNets: [...affectedNets].sort(),
    suggestedFix,
  };
}
