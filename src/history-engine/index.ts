import { HistoryNode, HistoryDelta, ValidationError, FatalIntegrityError } from '../types';
import { EventBus } from '../event-bus';

export interface CommandReverserReplayer {
  executeReverse(delta: HistoryDelta): boolean;
  executeReplay(delta: HistoryDelta): boolean;
}

function validateSerializableValue(val: any, visited: Set<any> = new Set()): void {
  if (val === null) return;

  const t = typeof val;
  if (t === 'boolean' || t === 'string') return;

  if (t === 'number') {
    if (!Number.isFinite(val)) {
      throw new ValidationError('Invalid numeric value: NaN or Infinity are not permitted');
    }
    return;
  }

  if (t === 'undefined') {
    throw new ValidationError('undefined values are not permitted');
  }
  if (t === 'symbol') {
    throw new ValidationError('Symbols are not permitted');
  }
  if (t === 'bigint') {
    throw new ValidationError('BigInts are not permitted');
  }
  if (t === 'function') {
    throw new ValidationError('Functions/closures are not permitted');
  }

  if (t === 'object') {
    if (visited.has(val)) {
      throw new ValidationError('Circular references are not permitted');
    }
    visited.add(val);

    if (Array.isArray(val)) {
      for (const item of val) {
        validateSerializableValue(item, visited);
      }
      visited.delete(val);
      return;
    }

    const proto = Object.getPrototypeOf(val);
    if (proto !== null && proto !== Object.prototype) {
      throw new ValidationError('Custom classes, prototypes, or Date/Map/Set/Buffer instances are not permitted');
    }

    const keys = Object.getOwnPropertyNames(val);
    for (const key of keys) {
      const desc = Object.getOwnPropertyDescriptor(val, key);
      if (!desc) continue;
      if (desc.get || desc.set) {
        throw new ValidationError('Accessors (getters/setters) are not permitted');
      }
      validateSerializableValue(val[key], visited);
    }

    visited.delete(val);
    return;
  }

  throw new ValidationError(`Unsupported type: ${t}`);
}

function safeDeepClone<T>(val: T): T {
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map((item) => safeDeepClone(item)) as any;
  }
  const copy = {} as any;
  for (const key of Object.keys(val)) {
    copy[key] = safeDeepClone((val as any)[key]);
  }
  return copy;
}

export class HistoryEngine {
  private nodes: Map<string, HistoryNode> = new Map();
  private childrenMap: Map<string | null, string[]> = new Map();
  private activeNodeId: string | null = null;
  private lastActiveChildOf: Map<string | null, string> = new Map();

  constructor(
    private eventBus: EventBus,
    private reverserReplayer: CommandReverserReplayer
  ) {}

  undo(): boolean {
    if (this.activeNodeId === null) {
      throw new Error('Already at root node. Cannot undo.');
    }

    const node = this.nodes.get(this.activeNodeId);
    if (!node) {
      throw new Error(`Corrupt history: active node ${this.activeNodeId} not found`);
    }

    const success = this.reverserReplayer.executeReverse(safeDeepClone(node.delta));
    if (success) {
      const parentId = node.parentId;
      this.lastActiveChildOf.set(parentId, node.id);
      this.activeNodeId = parentId;

      this.eventBus.publish({
        namespace: 'history',
        name: 'undone',
        payload: { nodeId: node.id, parentId },
      });
      return true;
    }
    return false;
  }

  redo(): boolean {
    const nextNodeId = this.getNextNodeIdForRedo();
    if (!nextNodeId) {
      throw new Error('No forward operations on the current branch.');
    }

    const node = this.nodes.get(nextNodeId);
    if (!node) {
      throw new Error(`Corrupt history: redo node ${nextNodeId} not found`);
    }

    const success = this.reverserReplayer.executeReplay(safeDeepClone(node.delta));
    if (success) {
      this.activeNodeId = nextNodeId;

      this.eventBus.publish({
        namespace: 'history',
        name: 'redone',
        payload: { nodeId: node.id },
      });
      return true;
    }
    return false;
  }

  canUndo(): boolean {
    return this.activeNodeId !== null;
  }

  canRedo(): boolean {
    return this.getNextNodeIdForRedo() !== null;
  }

  private getNextNodeIdForRedo(): string | null {
    const children = this.childrenMap.get(this.activeNodeId) || [];
    if (children.length === 0) return null;
    const lastActive = this.lastActiveChildOf.get(this.activeNodeId);
    if (lastActive && children.includes(lastActive)) {
      return lastActive;
    }
    return children[0];
  }

  getBranches(): { id: string; name: string; timestamp: number }[] {
    const branches: { id: string; name: string; timestamp: number }[] = [];

    for (const [id, node] of this.nodes.entries()) {
      const children = this.childrenMap.get(id) || [];
      if (children.length === 0) {
        branches.push({
          id,
          name: `Branch-${id.substring(0, 7)}`,
          timestamp: node.timestamp,
        });
      }
    }

    if (branches.length === 0 && this.activeNodeId === null) {
      branches.push({
        id: 'root',
        name: 'Main Branch',
        timestamp: Date.now(),
      });
    }

    return branches;
  }

  checkoutBranch(branchId: string): boolean {
    const targetId = branchId === 'root' ? null : branchId;
    if (targetId === this.activeNodeId) {
      return true;
    }
    if (targetId !== null && !this.nodes.has(targetId)) {
      throw new ValidationError(`Invalid branchId: ${branchId}`);
    }

    // 1. Ancestry traversal with cycle detection
    const activePath: string[] = [];
    let curr = this.activeNodeId;
    let visited = new Set<string | null>();
    visited.add(curr);
    while (curr !== null) {
      activePath.push(curr);
      const node = this.nodes.get(curr);
      if (!node) break;
      if (visited.has(node.parentId)) {
        throw new FatalIntegrityError(`Cycle detected in active path traversal at node ${node.parentId}`);
      }
      visited.add(node.parentId);
      curr = node.parentId;
    }

    const targetPath: string[] = [];
    curr = targetId;
    visited = new Set<string | null>();
    visited.add(curr);
    while (curr !== null) {
      targetPath.push(curr);
      const node = this.nodes.get(curr);
      if (!node) break;
      if (visited.has(node.parentId)) {
        throw new FatalIntegrityError(`Cycle detected in target path traversal at node ${node.parentId}`);
      }
      visited.add(node.parentId);
      curr = node.parentId;
    }

    let lca: string | null = null;
    for (const node of activePath) {
      if (node === targetId || targetPath.includes(node)) {
        lca = node;
        break;
      }
    }

    const undoNodes: HistoryNode[] = [];
    curr = this.activeNodeId;
    while (curr !== lca) {
      if (curr === null) break;
      const node = this.nodes.get(curr)!;
      undoNodes.push(node);
      curr = node.parentId;
    }

    const redoNodes: HistoryNode[] = [];
    curr = targetId;
    while (curr !== lca) {
      if (curr === null) break;
      const node = this.nodes.get(curr)!;
      redoNodes.unshift(node);
      curr = node.parentId;
    }

    const appliedUndos: HistoryNode[] = [];
    const appliedRedos: HistoryNode[] = [];

    try {
      for (const node of undoNodes) {
        const success = this.reverserReplayer.executeReverse(safeDeepClone(node.delta));
        if (!success) {
          throw new Error(`Failed to execute reverse delta for node ${node.id}`);
        }
        appliedUndos.push(node);
      }

      for (const node of redoNodes) {
        const success = this.reverserReplayer.executeReplay(safeDeepClone(node.delta));
        if (!success) {
          throw new Error(`Failed to execute replay delta for node ${node.id}`);
        }
        appliedRedos.push(node);
      }
    } catch (err) {
      // Compensating Execution Rollback
      try {
        for (let i = appliedRedos.length - 1; i >= 0; i--) {
          this.reverserReplayer.executeReverse(safeDeepClone(appliedRedos[i].delta));
        }
        for (let i = appliedUndos.length - 1; i >= 0; i--) {
          this.reverserReplayer.executeReplay(safeDeepClone(appliedUndos[i].delta));
        }
      } catch (compErr) {
        throw new FatalIntegrityError(`FATAL: Branch checkout failed, and subsequent compensation rollback also failed. State is corrupt. original error: ${err}, compensation error: ${compErr}`);
      }
      throw err;
    }

    // Synchronize redo branch choice for intermediate nodes
    let pathNode = targetId;
    while (pathNode !== null) {
      const node = this.nodes.get(pathNode)!;
      const parentId = node.parentId;
      this.lastActiveChildOf.set(parentId, pathNode);
      pathNode = parentId;
    }

    this.activeNodeId = targetId;
    return true;
  }

  pushNode(node: HistoryNode): void {
    // 1. Strict input & structure validation
    if (!node || typeof node !== 'object') {
      throw new ValidationError('Invalid node structure: must be an object');
    }
    if (typeof node.id !== 'string' || !node.id) {
      throw new ValidationError('Invalid node structure: id is required and must be a string');
    }
    if (node.parentId !== null && typeof node.parentId !== 'string') {
      throw new ValidationError('Invalid node structure: parentId must be string or null');
    }
    if (typeof node.commandId !== 'string' || !node.commandId) {
      throw new ValidationError('Invalid node structure: commandId is required and must be a string');
    }
    if (typeof node.description !== 'string' || !node.description) {
      throw new ValidationError('Invalid node structure: description is required and must be a string');
    }
    if (typeof node.timestamp !== 'number') {
      throw new ValidationError('Invalid node structure: timestamp must be a number');
    }
    if (!node.delta || typeof node.delta !== 'object') {
      throw new ValidationError('Invalid node structure: delta is required');
    }
    if (!Array.isArray(node.delta.forward) || !Array.isArray(node.delta.reverse)) {
      throw new ValidationError('Invalid node structure: delta forward/reverse lists must be arrays');
    }

    // 2. DAG structure validation
    if (this.nodes.has(node.id)) {
      throw new ValidationError(`History node ${node.id} already exists`);
    }
    if (node.parentId === node.id) {
      throw new ValidationError('Self-parenting is forbidden in History DAG');
    }
    if (node.parentId !== null && !this.nodes.has(node.parentId)) {
      throw new ValidationError(`Parent node ${node.parentId} does not exist in History DAG`);
    }
    if (node.parentId !== this.activeNodeId) {
      throw new ValidationError(`parentId ${node.parentId} is inconsistent with active cursor ${this.activeNodeId}`);
    }

    // 3. Delta serializability validation
    validateSerializableValue(node.delta);

    // 4. Staging and applying state mutation
    const nodeCopy = safeDeepClone(node);
    this.nodes.set(node.id, nodeCopy);

    const parentId = node.parentId;
    if (!this.childrenMap.has(parentId)) {
      this.childrenMap.set(parentId, []);
    }
    const children = this.childrenMap.get(parentId)!;
    children.push(node.id);

    const prevActiveChild = this.lastActiveChildOf.get(parentId);
    this.lastActiveChildOf.set(parentId, node.id);
    this.activeNodeId = node.id;

    // 5. Observer Notification with atomic rollback on synchronous throws
    try {
      if (children.length > 1) {
        this.eventBus.publish({
          namespace: 'history',
          name: 'branch-created',
          payload: { nodeId: node.id, parentId },
        });
      }
    } catch (err) {
      // Rollback internal history engine mutations
      this.nodes.delete(node.id);
      const idx = children.indexOf(node.id);
      if (idx !== -1) {
        children.splice(idx, 1);
      }
      if (prevActiveChild !== undefined) {
        this.lastActiveChildOf.set(parentId, prevActiveChild);
      } else {
        this.lastActiveChildOf.delete(parentId);
      }
      this.activeNodeId = parentId;
      throw err;
    }
  }

  getSnapshot(): { activeNodeId: string | null; nodes: Record<string, HistoryNode> } {
    const nodesCopy: Record<string, HistoryNode> = {};
    for (const [id, node] of this.nodes.entries()) {
      nodesCopy[id] = safeDeepClone(node);
    }
    return {
      activeNodeId: this.activeNodeId,
      nodes: nodesCopy,
    };
  }

  createCheckpoint(): string {
    return this.activeNodeId === null ? 'root' : this.activeNodeId;
  }

  rollbackToCheckpoint(checkpointId: string): void {
    this.checkoutBranch(checkpointId);
  }

  clear(): void {
    this.nodes.clear();
    this.childrenMap.clear();
    this.lastActiveChildOf.clear();
    this.activeNodeId = null;
  }

  getActiveNodeId(): string | null {
    return this.activeNodeId;
  }

  getNode(id: string): HistoryNode | undefined {
    return this.nodes.get(id);
  }
}
