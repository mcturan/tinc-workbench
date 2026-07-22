import { HierarchicalPort, PortDirection } from './types';

export function createPort(
  id: string,
  name: string,
  direction: PortDirection,
  internalComponentId: string,
  internalPinId: string
): HierarchicalPort {
  return {
    id,
    name,
    direction,
    internalComponentId,
    internalPinId,
  };
}
