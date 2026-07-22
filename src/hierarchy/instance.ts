import { ModuleInstance } from './types';
import { getModule } from './module';
import { SemanticObject } from '../types';
import { ObjectEngine } from '../object-engine';

const instances = new Map<string, ModuleInstance>();

export function instantiateModule(
  id: string,
  moduleId: string,
  parentInstanceId: string | null,
  name: string,
  properties: Record<string, any> = {},
  transform: { x: number; y: number } = { x: 0, y: 0 },
  objectEngine?: ObjectEngine
): ModuleInstance {
  const moduleDef = getModule(moduleId);
  if (!moduleDef) {
    throw new Error(`Module definition ${moduleId} not found`);
  }
  if (instances.has(id)) {
    throw new Error(`Module instance ${id} already exists`);
  }

  const instance: ModuleInstance = {
    id,
    moduleId,
    parentInstanceId,
    name,
    properties,
    transform,
  };
  instances.set(id, instance);

  if (objectEngine && parentInstanceId === null) {
    const project = objectEngine.getProject();
    const page = project.pages[0];
    const layer = page?.layers[0];
    if (layer) {
      objectEngine.addComponent(layer.id, {
        id,
        type: moduleId,
        name,
        ports: moduleDef.ports.map(p => ({
          id: p.id,
          name: p.name,
          direction: p.direction === 'Input' ? 'input' : p.direction === 'Output' ? 'output' : p.direction === 'Bidirectional' ? 'bidirectional' : 'passive',
          signalCategory: p.direction === 'Power' || p.direction === 'Ground' ? 'power' : 'digital',
        })),
        pins: [],
        properties: transform,
      });
    }
  }

  return instance;
}

export function deleteInstance(id: string): void {
  instances.delete(id);
}

export function listInstances(): ModuleInstance[] {
  return Array.from(instances.values());
}

export function getInstance(id: string): ModuleInstance | undefined {
  return instances.get(id);
}

export function clearInstances(): void {
  instances.clear();
}

export function getComponentByPath(
  objectEngine: ObjectEngine,
  pathId: string
): SemanticObject | undefined {
  if (!pathId.includes('/')) {
    return objectEngine.getObject(pathId) as SemanticObject;
  }

  const parts = pathId.split('/');
  const instanceId = parts[0];

  const inst = getInstance(instanceId);
  if (!inst) return undefined;

  const moduleDef = getModule(inst.moduleId);
  if (!moduleDef) return undefined;

  let currentModule = moduleDef;
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (i === parts.length - 1) {
      return currentModule.schematic.objects.find(o => o.id === part);
    } else {
      const nextInstObj = currentModule.schematic.objects.find(o => o.id === part);
      if (!nextInstObj) return undefined;
      const nextModule = getModule(nextInstObj.type);
      if (!nextModule) return undefined;
      currentModule = nextModule;
    }
  }
  return undefined;
}
