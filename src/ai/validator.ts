import { CommandPlan } from './types';
import { ConstraintDiagnostic } from '../constraint-engine/types';
import { globalRegistry } from '../component-library';
import { getLibraryMetadata } from '../library/metadata';

export class PlanValidator {
  validate(plan: CommandPlan): { isValid: boolean; diagnostics: ConstraintDiagnostic[] } {
    const diagnostics: ConstraintDiagnostic[] = [];

    if (!plan.id) {
      diagnostics.push({
        id: 'PLAN-ERR-001',
        severity: 'ERROR',
        code: 'EMPTY_PLAN_ID',
        title: 'Empty Plan ID',
        message: 'Command Plan must specify a unique identifier.',
        sourceObjectId: '',
        sourcePinId: '',
        targetObjectId: '',
        targetPinId: '',
      });
    }

    if (!plan.requiredCommands || plan.requiredCommands.length === 0) {
      diagnostics.push({
        id: 'PLAN-ERR-002',
        severity: 'ERROR',
        code: 'EMPTY_PLAN_COMMANDS',
        title: 'Empty Plan Commands',
        message: 'Command Plan contains no commands.',
        sourceObjectId: '',
        sourcePinId: '',
        targetObjectId: '',
        targetPinId: '',
      });
    }

    if (plan.confidence < 0 || plan.confidence > 1) {
      diagnostics.push({
        id: 'PLAN-ERR-003',
        severity: 'ERROR',
        code: 'INVALID_CONFIDENCE',
        title: 'Invalid Confidence Level',
        message: 'Plan confidence level must be between 0.0 and 1.0.',
        sourceObjectId: '',
        sourcePinId: '',
        targetObjectId: '',
        targetPinId: '',
      });
    }

    const createdComponentIds = new Set<string>();
    const commandSet = new Set<string>();

    for (const cmd of plan.requiredCommands || []) {
      if (!cmd.type || !cmd.payload) {
        diagnostics.push({
          id: 'PLAN-ERR-004',
          severity: 'ERROR',
          code: 'MALFORMED_COMMAND',
          title: 'Malformed Command Structure',
          message: 'Command type and payload are required.',
          sourceObjectId: '',
          sourcePinId: '',
          targetObjectId: '',
          targetPinId: '',
        });
        continue;
      }

      const cmdKey = `${cmd.type}:${JSON.stringify(cmd.payload)}`;
      if (commandSet.has(cmdKey)) {
        diagnostics.push({
          id: 'PLAN-ERR-005',
          severity: 'ERROR',
          code: 'DUPLICATE_COMMAND',
          title: 'Duplicate Command',
          message: `Plan contains duplicate command of type ${cmd.type}.`,
          sourceObjectId: '',
          sourcePinId: '',
          targetObjectId: '',
          targetPinId: '',
        });
      }
      commandSet.add(cmdKey);

      if (cmd.type === 'CreateComponent') {
        const type = cmd.payload.type || cmd.payload.componentType;
        const compId = cmd.payload.id || cmd.payload.componentId;
        if (!type) {
          diagnostics.push({
            id: 'PLAN-ERR-006',
            severity: 'ERROR',
            code: 'MISSING_COMP_TYPE',
            title: 'Missing Component Type',
            message: 'CreateComponent payload must specify component type.',
            sourceObjectId: '',
            sourcePinId: '',
            targetObjectId: '',
            targetPinId: '',
          });
        } else {
          const meta = globalRegistry.getById(type) || getLibraryMetadata(type);
          if (!meta) {
            diagnostics.push({
              id: 'PLAN-ERR-007',
              severity: 'ERROR',
              code: 'UNKNOWN_COMPONENT_TYPE',
              title: 'Unknown Component Type',
              message: `Component type ${type} is not registered in the library.`,
              sourceObjectId: '',
              sourcePinId: '',
              targetObjectId: '',
              targetPinId: '',
            });
          }
        }

        if (compId) {
          createdComponentIds.add(compId);
        }
      }

      if (cmd.type === 'DeleteComponent' || cmd.type === 'MoveComponent') {
        const id = cmd.payload.id || cmd.payload.componentId;
        if (!id) {
          diagnostics.push({
            id: 'PLAN-ERR-008',
            severity: 'ERROR',
            code: 'MISSING_REFERENCE_ID',
            title: 'Missing Reference ID',
            message: 'Command payload must specify target component ID.',
            sourceObjectId: '',
            sourcePinId: '',
            targetObjectId: '',
            targetPinId: '',
          });
        }
      }
    }

    const isValid = diagnostics.every(d => d.severity !== 'ERROR');
    return { isValid, diagnostics };
  }
}

export const validatePlan = (plan: CommandPlan) => new PlanValidator().validate(plan);
