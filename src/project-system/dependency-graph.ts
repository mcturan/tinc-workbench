/**
 * Project System — Dependency Graph
 *
 * Tracks sheet references, hierarchy, symbol dependencies, library dependencies,
 * asset dependencies, and net references. Detects missing, circular, and orphan deps.
 */

import { ProjectDependency, DependencyKind, DependencyDiagnostic } from './types';
import { generateUUID } from '../utils';

export class DependencyGraph {
  private deps = new Map<string, ProjectDependency>();

  addDependency(
    kind: DependencyKind,
    sourceId: string,
    targetId: string,
    resolved = true,
    label?: string
  ): ProjectDependency {
    const id = generateUUID();
    const dep: ProjectDependency = { id, kind, sourceId, targetId, resolved, label };
    this.deps.set(id, dep);
    return { ...dep };
  }

  get(id: string): ProjectDependency | undefined {
    const d = this.deps.get(id);
    return d ? { ...d } : undefined;
  }

  list(filter?: { kind?: DependencyKind; sourceId?: string; targetId?: string }): ProjectDependency[] {
    let items = Array.from(this.deps.values());
    if (filter?.kind) items = items.filter(d => d.kind === filter.kind);
    if (filter?.sourceId) items = items.filter(d => d.sourceId === filter.sourceId);
    if (filter?.targetId) items = items.filter(d => d.targetId === filter.targetId);
    return items.map(d => ({ ...d }));
  }

  resolve(id: string): boolean {
    const dep = this.deps.get(id);
    if (!dep) return false;
    dep.resolved = true;
    return true;
  }

  unresolve(id: string): boolean {
    const dep = this.deps.get(id);
    if (!dep) return false;
    dep.resolved = false;
    return true;
  }

  remove(id: string): boolean {
    return this.deps.delete(id);
  }

  removeBySource(sourceId: string): void {
    for (const [id, dep] of this.deps.entries()) {
      if (dep.sourceId === sourceId) this.deps.delete(id);
    }
  }

  removeByTarget(targetId: string): void {
    for (const [id, dep] of this.deps.entries()) {
      if (dep.targetId === targetId) this.deps.delete(id);
    }
  }

  clear(): void {
    this.deps.clear();
  }

  /**
   * Analyzes the dependency graph against a set of known IDs.
   * Detects: missing targets, circular dependencies, orphan assets.
   */
  analyze(knownIds: Set<string>): DependencyDiagnostic[] {
    const diagnostics: DependencyDiagnostic[] = [];
    const allDeps = Array.from(this.deps.values());

    // 1. Missing dependencies
    for (const dep of allDeps) {
      if (!dep.resolved || (dep.targetId !== '' && !knownIds.has(dep.targetId))) {
        diagnostics.push({
          type: 'missing',
          severity: 'error',
          message: `Dependency '${dep.kind}' from '${dep.sourceId}' references missing target '${dep.targetId}'`,
          involvedIds: [dep.sourceId, dep.targetId],
        });
      }
    }

    // 2. Circular dependencies (iterative DFS to avoid stack overflow on large graphs)
    const adjacency = new Map<string, string[]>();
    for (const dep of allDeps) {
      if (!adjacency.has(dep.sourceId)) adjacency.set(dep.sourceId, []);
      adjacency.get(dep.sourceId)!.push(dep.targetId);
    }

    const visited = new Set<string>();
    const inStack = new Set<string>();
    const reportedCycles = new Set<string>();

    const dfs = (nodeId: string): void => {
      if (inStack.has(nodeId)) return;
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      inStack.add(nodeId);
      const neighbors = adjacency.get(nodeId) ?? [];
      for (const neighbor of neighbors) {
        if (inStack.has(neighbor)) {
          const cycleKey = [nodeId, neighbor].sort().join('|');
          if (!reportedCycles.has(cycleKey)) {
            reportedCycles.add(cycleKey);
            diagnostics.push({
              type: 'circular',
              severity: 'error',
              message: `Circular dependency detected: '${nodeId}' → '${neighbor}'`,
              involvedIds: [nodeId, neighbor],
            });
          }
        } else {
          dfs(neighbor);
        }
      }
      inStack.delete(nodeId);
    };

    const allNodes = new Set<string>();
    for (const dep of allDeps) {
      allNodes.add(dep.sourceId);
      allNodes.add(dep.targetId);
    }
    for (const node of allNodes) {
      if (!visited.has(node)) dfs(node);
    }

    // 3. Orphan detection: targets that have no incoming refs and are not known entities
    const allSourceIds = new Set(allDeps.map(d => d.sourceId));
    const allTargetIds = new Set(allDeps.map(d => d.targetId));
    for (const tid of allTargetIds) {
      if (!allSourceIds.has(tid) && !knownIds.has(tid) && tid !== '') {
        diagnostics.push({
          type: 'orphan',
          severity: 'warning',
          message: `Orphan entity '${tid}': it is a dependency target but has no incoming references and is not a known entity`,
          involvedIds: [tid],
        });
      }
    }

    return diagnostics;
  }

  count(): number {
    return this.deps.size;
  }

  restore(deps: ProjectDependency[]): void {
    this.deps.clear();
    for (const d of deps) this.deps.set(d.id, { ...d });
  }
}
