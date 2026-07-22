import { ConstraintDiagnostic, DiagnosticSeverity } from './types';
import { generateUUID } from '../utils';

export function createDiagnostic(
  severity: DiagnosticSeverity,
  code: string,
  title: string,
  message: string,
  sourceObjectId: string,
  sourcePinId: string,
  targetObjectId: string,
  targetPinId: string,
  suggestedFix?: string
): ConstraintDiagnostic {
  return {
    id: `diag-${generateUUID().substring(0, 8)}`,
    severity,
    code,
    title,
    message,
    sourceObjectId,
    sourcePinId,
    targetObjectId,
    targetPinId,
    suggestedFix,
  };
}
