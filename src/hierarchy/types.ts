import { SemanticObject, Wire, LogicalConnection } from '../types';

export type PortDirection = 'Input' | 'Output' | 'Bidirectional' | 'Power' | 'Ground';

export interface HierarchicalPort {
  id: string;
  name: string;
  direction: PortDirection;
  internalComponentId: string;
  internalPinId: string;
}

export interface ModuleSchematic {
  objects: SemanticObject[];
  wires: Wire[];
  connections: LogicalConnection[];
}

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  ports: HierarchicalPort[];
  schematic: ModuleSchematic;
  metadata?: Record<string, any>;
}

export interface ModuleInstance {
  id: string;
  moduleId: string; // References ModuleDefinition.id
  parentInstanceId: string | null;
  name: string;
  properties: Record<string, any>;
  transform: { x: number; y: number };
}
