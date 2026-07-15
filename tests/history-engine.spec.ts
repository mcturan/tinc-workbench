import { HistoryEngine } from '../src/history-engine';
import { EventBus } from '../src/event-bus';
import { HistoryNode, ValidationError, FatalIntegrityError } from '../src/types';

describe('History Engine Unit Tests', () => {
  let eventBus: EventBus;
  let historyEngine: HistoryEngine;
  let mockReverserReplayer: {
    executeReverse: jest.Mock<boolean, [any]>;
    executeReplay: jest.Mock<boolean, [any]>;
  };

  beforeEach(() => {
    eventBus = new EventBus();
    mockReverserReplayer = {
      executeReverse: jest.fn((_delta: any) => true),
      executeReplay: jest.fn((_delta: any) => true),
    };
    historyEngine = new HistoryEngine(eventBus, mockReverserReplayer);
  });

  const getDummyNode = (id: string, parentId: string | null): HistoryNode => ({
    id,
    parentId,
    commandId: `cmd-${id}`,
    description: `Node ${id}`,
    timestamp: Date.now(),
    delta: { forward: [], reverse: [] },
  });

  it('1. should start with root/initial cursor behavior as null', () => {
    expect(historyEngine.getActiveNodeId()).toBeNull();
    expect(historyEngine.canUndo()).toBe(false);
    expect(historyEngine.canRedo()).toBe(false);
  });

  it('2. should verify successful history node registration via pushNode', () => {
    const node = getDummyNode('node-1', null);
    historyEngine.pushNode(node);
    expect(historyEngine.getNode('node-1')).toBeDefined();
    expect(historyEngine.getActiveNodeId()).toBe('node-1');
  });

  it('3 & 4. should track parent-child DAG relationships and cursor movement after registration', () => {
    const node1 = getDummyNode('node-1', null);
    const node2 = getDummyNode('node-2', 'node-1');

    historyEngine.pushNode(node1);
    historyEngine.pushNode(node2);

    expect(historyEngine.getActiveNodeId()).toBe('node-2');
    expect(historyEngine.getNode('node-2')!.parentId).toBe('node-1');
  });

  it('5 & 6. should preserve old branches and show multiple branch child representations after undo and branching', () => {
    const node1 = getDummyNode('node-1', null);
    const node2 = getDummyNode('node-2', 'node-1');

    historyEngine.pushNode(node1);
    historyEngine.pushNode(node2);

    historyEngine.undo();
    expect(historyEngine.getActiveNodeId()).toBe('node-1');

    const node3 = getDummyNode('node-3', 'node-1');
    historyEngine.pushNode(node3);

    const branches = historyEngine.getBranches();
    const branchIds = branches.map((b) => b.id);
    expect(branchIds).toContain('node-2');
    expect(branchIds).toContain('node-3');
  });

  it('7. should guarantee that read-only snapshot mutation cannot affect internal History Engine state', () => {
    const node1 = getDummyNode('node-1', null);
    historyEngine.pushNode(node1);

    const snapshot = historyEngine.getSnapshot();
    expect(snapshot.nodes['node-1']).toBeDefined();

    snapshot.nodes['node-1'].description = 'Mutated!';
    expect(historyEngine.getNode('node-1')!.description).toBe('Node node-1');
  });

  it('8. should verify History Engine has no direct Object Engine dependency or direct mutation paths', () => {
    expect((historyEngine as any).objectEngine).toBeUndefined();
  });

  // Mandatory Repairs - 1. HISTORY DAG VALIDATION & traversal cycle protection
  it('should validate pushNode inputs completely and reject duplicate node ID', () => {
    const node1 = getDummyNode('node-1', null);
    historyEngine.pushNode(node1);

    const node2 = getDummyNode('node-1', 'node-1');
    expect(() => historyEngine.pushNode(node2)).toThrow(ValidationError);
  });

  it('should reject self-parenting in pushNode', () => {
    const node = getDummyNode('node-1', 'node-1');
    expect(() => historyEngine.pushNode(node)).toThrow(ValidationError);
  });

  it('should reject nonexistent parentId', () => {
    const node = getDummyNode('node-2', 'nonexistent-parent');
    expect(() => historyEngine.pushNode(node)).toThrow(ValidationError);
  });

  it('should reject parentId inconsistent with active cursor', () => {
    const node1 = getDummyNode('node-1', null);
    historyEngine.pushNode(node1);

    const node2 = getDummyNode('node-2', 'node-1');
    historyEngine.pushNode(node2);

    // Active cursor is node-2. Pushing node-3 with parent node-1 must be rejected
    const node3 = getDummyNode('node-3', 'node-1');
    expect(() => historyEngine.pushNode(node3)).toThrow(ValidationError);
  });

  it('should reject null/non-null parent mismatch', () => {
    // Active cursor is null, so parentId must be null. A non-null parentId must throw.
    const node = getDummyNode('node-1', 'some-parent');
    expect(() => historyEngine.pushNode(node)).toThrow(ValidationError);
  });

  it('should preserve previous state snapshot and cursor on all pushNode rejection cases', () => {
    const node1 = getDummyNode('node-1', null);
    historyEngine.pushNode(node1);

    const snapshotBefore = historyEngine.getSnapshot();

    const badNode = getDummyNode('node-2', 'node-999'); // Nonexistent parent
    expect(() => historyEngine.pushNode(badNode)).toThrow(ValidationError);

    const snapshotAfter = historyEngine.getSnapshot();
    expect(snapshotAfter).toEqual(snapshotBefore);
    expect(historyEngine.getActiveNodeId()).toBe('node-1');
  });

  it('should detect cycles and throw FatalIntegrityError rather than loop forever during path traversal', () => {
    const node1 = getDummyNode('node-1', null);
    historyEngine.pushNode(node1);

    // Sabotage history internals to introduce a cycle: node-1 points to node-1
    const n = historyEngine.getNode('node-1')!;
    n.parentId = 'node-1';

    expect(() => {
      historyEngine.checkoutBranch('root');
    }).toThrow(FatalIntegrityError);
  });

  // Mandatory Repairs - 2. pushNode ATOMICITY (Event Bus failure rollback)
  it('should roll back internal history registration state if EventBus.publish throws', () => {
    // First node (starts at null cursor, parent is null. No branch is created, so publish is not called)
    historyEngine.pushNode(getDummyNode('node-1', null));

    // Undo back to null
    historyEngine.undo();

    // Create branch 1
    historyEngine.pushNode(getDummyNode('node-2', null));
    historyEngine.undo();

    // Setup mock eventBus.publish to throw only for subsequent fissions
    eventBus.publish = () => {
      throw new Error('EventBus crash!');
    };

    // Create branch 2 -> eventBus.publish will be called because children list length > 1 (fork)
    const snapshotBefore = historyEngine.getSnapshot();

    expect(() => {
      historyEngine.pushNode(getDummyNode('node-3', null));
    }).toThrow('EventBus crash!');

    // Parity verification: snapshot and cursor must remain completely untouched
    expect(historyEngine.getSnapshot()).toEqual(snapshotBefore);
    expect(historyEngine.getActiveNodeId()).toBeNull();
  });

  // Mandatory Repairs - 4. REDO / BRANCH CHOICE SYNCHRONIZATION
  it('should choose redo branch deterministically based on target branches checked out', () => {
    // Path: root -> node-1 -> node-2 (branch A)
    //                     -> node-3 (branch B)
    const node1 = getDummyNode('node-1', null);
    historyEngine.pushNode(node1);

    const node2 = getDummyNode('node-2', 'node-1');
    historyEngine.pushNode(node2);

    historyEngine.undo(); // back to node-1

    const node3 = getDummyNode('node-3', 'node-1');
    historyEngine.pushNode(node3); // branch B active

    // Undo back to node-1
    historyEngine.undo();
    // Redo should choose node-3 (branch B) since it was the last active child of node-1
    expect(historyEngine.canRedo()).toBe(true);
    historyEngine.redo();
    expect(historyEngine.getActiveNodeId()).toBe('node-3');

    // Switch to branch A (node-2)
    historyEngine.checkoutBranch('node-2');
    expect(historyEngine.getActiveNodeId()).toBe('node-2');

    // Undo back to node-1
    historyEngine.undo();
    // Redo should now choose node-2 (branch A) since checkoutBranch synchronized the parent choice map
    historyEngine.redo();
    expect(historyEngine.getActiveNodeId()).toBe('node-2');
  });

  // Mandatory Repairs - 5. RUNTIME SERIALIZABLE DELTA VALIDATION
  it('should reject non-serializable delta values at any depth', () => {
    const buildBadNode = (badValue: any) => ({
      id: 'node-bad',
      parentId: null,
      commandId: 'cmd-bad',
      description: 'Bad Node',
      timestamp: Date.now(),
      delta: {
        forward: [{ type: 'CREATE_PAGE' as any, page: badValue }],
        reverse: [],
      },
    });

    // A. function
    expect(() => historyEngine.pushNode(buildBadNode(() => {}))).toThrow(ValidationError);
    // B. symbol
    expect(() => historyEngine.pushNode(buildBadNode(Symbol('a')))).toThrow(ValidationError);
    // C. bigint
    expect(() => historyEngine.pushNode(buildBadNode(123n))).toThrow(ValidationError);
    // D. undefined
    expect(() => historyEngine.pushNode(buildBadNode(undefined))).toThrow(ValidationError);
    // E. NaN
    expect(() => historyEngine.pushNode(buildBadNode(NaN))).toThrow(ValidationError);
    // F. Infinity
    expect(() => historyEngine.pushNode(buildBadNode(Infinity))).toThrow(ValidationError);
    // G. Date
    expect(() => historyEngine.pushNode(buildBadNode(new Date()))).toThrow(ValidationError);
    // H. Map
    expect(() => historyEngine.pushNode(buildBadNode(new Map()))).toThrow(ValidationError);
    // I. Set
    expect(() => historyEngine.pushNode(buildBadNode(new Set()))).toThrow(ValidationError);
    // J. circular references
    const circular: any = {};
    circular.self = circular;
    expect(() => historyEngine.pushNode(buildBadNode(circular))).toThrow(ValidationError);
    // K. custom class instances
    class Custom {}
    expect(() => historyEngine.pushNode(buildBadNode(new Custom()))).toThrow(ValidationError);
    // L. getter accessors
    const getterObj = {};
    Object.defineProperty(getterObj, 'prop', {
      get: () => { throw new Error('getter executed!'); },
      enumerable: true,
    });
    // Should reject getter without executing it
    expect(() => historyEngine.pushNode(buildBadNode(getterObj))).toThrow(ValidationError);

    // M. Deeply nested valid JSON-compatible structure must succeed
    const validNode: HistoryNode = {
      id: 'node-valid',
      parentId: null,
      commandId: 'cmd-valid',
      description: 'Valid Node',
      timestamp: Date.now(),
      delta: {
        forward: [{ type: 'CREATE_PAGE', page: { id: 'page-1', name: 'Page 1', layers: [], viewport: { zoom: 1, panX: 0, panY: 0 } } }],
        reverse: [],
      },
    };
    expect(() => historyEngine.pushNode(validNode)).not.toThrow();
  });
});
