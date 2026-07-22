import { listModules, getModule } from './module';
import { listInstances } from './instance';
import { ERCDiagnostic } from '../erc/types';
import { ObjectEngine } from '../object-engine';

export function validateHierarchy(_objectEngine: ObjectEngine): ERCDiagnostic[] {
  const diagnostics: ERCDiagnostic[] = [];
  const modules = listModules();
  const instances = listInstances();

  const seenModuleIds = new Set<string>();
  for (const m of modules) {
    if (seenModuleIds.has(m.id)) {
      diagnostics.push({
        id: `HIER-DUP-MOD-${m.id}`,
        severity: 'Error',
        category: 'Hierarchy',
        title: 'Duplicate Module ID',
        description: `Module ID '${m.id}' is defined multiple times.`,
        affectedObjects: [m.id],
        affectedNets: [],
        suggestedFix: 'Use unique module IDs.',
      });
    }
    seenModuleIds.add(m.id);
  }

  for (const inst of instances) {
    if (!getModule(inst.moduleId)) {
      diagnostics.push({
        id: `HIER-MISSING-REF-${inst.id}`,
        severity: 'Error',
        category: 'Hierarchy',
        title: 'Missing Module Reference',
        description: `Module instance '${inst.id}' references non-existent module definition '${inst.moduleId}'.`,
        affectedObjects: [inst.id],
        affectedNets: [],
        suggestedFix: 'Create the referenced module definition or remove the instance.',
      });
    }
  }

  const adj = new Map<string, Set<string>>();
  for (const m of modules) {
    adj.set(m.id, new Set());
    for (const obj of m.schematic.objects) {
      const targetInst = instances.find(i => i.id === obj.id);
      if (targetInst) {
        adj.get(m.id)!.add(targetInst.moduleId);
      } else if (getModule(obj.type)) {
        adj.get(m.id)!.add(obj.type);
      }
    }
  }

  const visited = new Set<string>();
  const stack = new Set<string>();

  function hasCycle(node: string, path: string[]): boolean {
    if (stack.has(node)) {
      diagnostics.push({
        id: `HIER-RECURSIVE-${node}`,
        severity: 'Error',
        category: 'Hierarchy',
        title: 'Recursive Module Inclusion',
        description: `Recursive inclusion cycle detected: ${path.join(' -> ')} -> ${node}`,
        affectedObjects: [...path, node],
        affectedNets: [],
        suggestedFix: 'Remove recursive instantiation reference to break the cycle.',
      });
      return true;
    }
    if (visited.has(node)) return false;

    visited.add(node);
    stack.add(node);
    path.push(node);

    const neighbors = adj.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (hasCycle(neighbor, [...path])) {
        return true;
      }
    }

    stack.delete(node);
    return false;
  }

  for (const m of modules) {
    hasCycle(m.id, []);
  }

  for (const m of modules) {
    for (const port of m.ports) {
      const intComp = m.schematic.objects.find(o => o.id === port.internalComponentId);
      if (!intComp) {
        diagnostics.push({
          id: `HIER-ORPHAN-PORT-${m.id}-${port.id}`,
          severity: 'Warning',
          category: 'Hierarchy',
          title: 'Orphan Port Reference',
          description: `Port '${port.id}' in module '${m.id}' references a non-existent internal component: ${port.internalComponentId}`,
          affectedObjects: [m.id],
          affectedNets: [],
          suggestedFix: 'Map the port to an existing internal component pin.',
        });
      } else {
        const intPinExists = intComp.ports.some(p => p.id === port.internalPinId) || intComp.pins.some(p => p.id === port.internalPinId);
        if (!intPinExists) {
          diagnostics.push({
            id: `HIER-INVALID-PIN-${m.id}-${port.id}`,
            severity: 'Warning',
            category: 'Hierarchy',
            title: 'Invalid Port Pin Mapping',
            description: `Port '${port.id}' in module '${m.id}' references non-existent pin '${port.internalPinId}' on component '${port.internalComponentId}'.`,
            affectedObjects: [m.id],
            affectedNets: [],
            suggestedFix: 'Map the port to a valid pin ID of the component.',
          });
        }
      }
    }
  }

  return diagnostics;
}
export const validateHierarchyState = validateHierarchy;
