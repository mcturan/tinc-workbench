import { ConstraintDiagnostic } from '../constraint-engine/types';

export type PlanCommandType =
  | 'CreateComponent'
  | 'DeleteComponent'
  | 'MoveComponent'
  | 'CreateConnection'
  | 'DeleteConnection';

export interface PlanCommand {
  type: PlanCommandType;
  payload: Record<string, any>;
}

export interface CommandPlan {
  readonly id: string;
  readonly description: string;
  readonly confidence: number;
  readonly requiredCommands: readonly PlanCommand[];
  readonly diagnostics: readonly ConstraintDiagnostic[];
  readonly assumptions: readonly string[];
}

export type IntentType =
  | 'CreateComponentIntent'
  | 'ConnectIntent'
  | 'AddComponentIntent'
  | 'MoveComponentIntent'
  | 'DeleteWireIntent';

export interface UserIntent {
  type: IntentType;
  payload: Record<string, any>;
}
