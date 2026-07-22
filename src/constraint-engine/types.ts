export type DiagnosticSeverity = 'INFO' | 'WARNING' | 'ERROR';

export interface ConstraintDiagnostic {
  id: string;
  severity: DiagnosticSeverity;
  code: string;
  title: string;
  message: string;
  sourceObjectId: string;
  sourcePinId: string;
  targetObjectId: string;
  targetPinId: string;
  suggestedFix?: string;
}
