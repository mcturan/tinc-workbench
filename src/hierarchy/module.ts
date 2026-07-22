import { ModuleDefinition, HierarchicalPort, ModuleSchematic } from './types';
import { globalRegistry } from '../component-library';
import { ComponentMetadata } from '../component-library/types';

const modules = new Map<string, ModuleDefinition>();

export function createModule(
  id: string,
  name: string,
  description: string,
  version: string,
  ports: HierarchicalPort[],
  schematic: ModuleSchematic,
  metadata?: Record<string, any>
): ModuleDefinition {
  if (modules.has(id)) {
    throw new Error(`Module ${id} already exists`);
  }

  const moduleDef: ModuleDefinition = {
    id,
    name,
    description,
    version,
    ports,
    schematic,
    metadata,
  };

  modules.set(id, moduleDef);

  const componentMetadata: ComponentMetadata = {
    id: id,
    name: name,
    tvcs: {
      categoryPath: ['Module'],
      manufacturer: 'Generic',
      series: '',
      family: 'Module',
      variant: '',
      tags: [],
      package: 'Module',
      footprint: 'Module',
      physicalDimensions: { widthMm: 0, lengthMm: 0, heightMm: 0 },
      electrical: { operatingVoltageMin: 0, operatingVoltageMax: 0, logicVoltage: 0 },
      interfaces: [],
      protocols: []
    },
    aliases: [],
    keywords: ['module', 'hierarchy', 'subcircuit'],
    description: description || `Hierarchical module ${name}`,
    visual: {
      symbol: 'module',
      width: 100,
      height: 20 + ports.length * 20,
    },
    geometry: {
      body: 'rectangle',
      pins: ports.map((p, idx) => ({
        id: p.id,
        x: 0,
        y: 20 + idx * 20,
      })),
      boundingBox: {
        x: 0,
        y: 0,
        width: 100,
        height: 20 + ports.length * 20,
      },
    },
    electrical: {
      pins: ports.map((p) => ({
        id: p.id,
        name: p.name,
        aliases: [p.name.toLowerCase()],
        electricalType: p.direction === 'Power' || p.direction === 'Ground' ? 'power' : 'digital',
        direction: p.direction === 'Input' ? 'input' : p.direction === 'Output' ? 'output' : p.direction === 'Power' ? 'power_output' : p.direction === 'Ground' ? 'power_input' : 'bidirectional',
      })),
    },
    knowledge: {
      notes: [`Hierarchical module version ${version}`],
      warnings: [],
      applications: [],
      tags: ['module', 'hierarchical'],
    },
  };

  globalRegistry.register(componentMetadata);

  return moduleDef;
}

export function deleteModule(id: string): void {
  modules.delete(id);
  globalRegistry.unregister(id);
}

export function listModules(): ModuleDefinition[] {
  return Array.from(modules.values());
}

export function getModule(id: string): ModuleDefinition | undefined {
  return modules.get(id);
}

export function clearModules(): void {
  for (const id of modules.keys()) {
    globalRegistry.unregister(id);
  }
  modules.clear();
}
