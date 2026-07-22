import { UserIntent, CommandPlan } from './types';
import { createPlan } from './command-plan';

export class IntentPlanner {
  plan(intent: UserIntent): CommandPlan {
    const planId = `plan-${Math.random().toString(36).substring(2, 9)}`;

    switch (intent.type) {
      case 'CreateComponentIntent':
      case 'AddComponentIntent': {
        const componentType = intent.payload.componentType;
        const name = intent.payload.name || `My ${componentType}`;
        const compId = `comp-${Math.random().toString(36).substring(2, 9)}`;

        return createPlan(
          planId,
          `Create new ${componentType} named ${name}`,
          0.95,
          [
            {
              type: 'CreateComponent',
              payload: { id: compId, type: componentType, name, properties: { x: 100, y: 100 } },
            },
          ],
          [],
          ['Assume library contains metadata for type', 'Assume coordinates at center screen']
        );
      }

      case 'ConnectIntent': {
        const { sourceId, sourcePortPinId, targetId, targetPortPinId } = intent.payload;
        return createPlan(
          planId,
          `Connect ${sourceId}:${sourcePortPinId} to ${targetId}:${targetPortPinId}`,
          0.9,
          [
            {
              type: 'CreateConnection',
              payload: { sourceId, sourcePortPinId, targetId, targetPortPinId },
            },
          ],
          [],
          ['Assume source and target component IDs exist']
        );
      }

      case 'MoveComponentIntent': {
        const { componentId, x, y } = intent.payload;
        return createPlan(
          planId,
          `Move component ${componentId} to coordinate (${x}, ${y})`,
          1.0,
          [
            {
              type: 'MoveComponent',
              payload: { componentId, x, y },
            },
          ],
          [],
          []
        );
      }

      case 'DeleteWireIntent': {
        const { wireId } = intent.payload;
        return createPlan(
          planId,
          `Delete wire connection ${wireId}`,
          0.85,
          [
            {
              type: 'DeleteConnection',
              payload: { id: wireId },
            },
          ],
          [],
          []
        );
      }

      default:
        return createPlan(
          planId,
          'Empty or unrecognized intent planner response',
          0.0,
          [],
          [],
          []
        );
    }
  }
}

export const createPlanFromIntent = (intent: UserIntent) => new IntentPlanner().plan(intent);
export const createPlanApi = (intent: UserIntent) => new IntentPlanner().plan(intent);
