import { UserIntent } from './types';

export function createComponentIntent(componentType: string, name?: string): UserIntent {
  return {
    type: 'CreateComponentIntent',
    payload: { componentType, name },
  };
}

export function connectIntent(sourceId: string, sourcePortPinId: string, targetId: string, targetPortPinId: string): UserIntent {
  return {
    type: 'ConnectIntent',
    payload: { sourceId, sourcePortPinId, targetId, targetPortPinId },
  };
}

export function addComponentIntent(componentType: string): UserIntent {
  return {
    type: 'AddComponentIntent',
    payload: { componentType },
  };
}

export function moveComponentIntent(componentId: string, x: number, y: number): UserIntent {
  return {
    type: 'MoveComponentIntent',
    payload: { componentId, x, y },
  };
}

export function deleteWireIntent(wireId: string): UserIntent {
  return {
    type: 'DeleteWireIntent',
    payload: { wireId },
  };
}
