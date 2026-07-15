import { CommandEngine } from '../src/command-engine';
import { HistoryEngine } from '../src/history-engine';
import { ObjectEngine } from '../src/object-engine';
import { EventBus } from '../src/event-bus';
import { Command, Page, Layer, SemanticObject, FatalIntegrityError } from '../src/types';

describe('Command Engine Integration and Rollback Tests', () => {
  let eventBus: EventBus;
  let objectEngine: ObjectEngine;
  let historyEngine: HistoryEngine;
  let commandEngine: CommandEngine;

  beforeEach(() => {
    eventBus = new EventBus();
    objectEngine = new ObjectEngine('proj-1', 'Project');
    const reverserReplayer = {
      executeReverse: (delta: any) => commandEngine.executeReverseDelta(delta),
      executeReplay: (delta: any) => commandEngine.executeReplay(delta),
    };
    historyEngine = new HistoryEngine(eventBus, reverserReplayer);
    commandEngine = new CommandEngine(objectEngine, historyEngine, eventBus);
  });

  // Helper to build Page structure
  const getPage = (id: string, name: string): Page => ({
    id,
    name,
    layers: [],
    viewport: { zoom: 1, panX: 0, panY: 0 },
  });

  const getLayer = (id: string, name: string): Layer => ({
    id,
    name,
    visible: true,
    locked: false,
    objects: [],
  });

  const getComponent = (id: string, name: string): SemanticObject => ({
    id,
    type: 'resistor',
    name,
    ports: [],
    pins: [],
    properties: {},
  });

  // Tests 9 & 10: Successful sequence ordering
  it('9 & 10. should execute in order: Object Engine mutation -> History recording -> Event Bus publication', () => {
    const trace: string[] = [];

    const originalAddPage = objectEngine.addPage.bind(objectEngine);
    objectEngine.addPage = (page) => {
      trace.push('object-engine:addPage');
      originalAddPage(page);
    };

    const originalPushNode = historyEngine.pushNode.bind(historyEngine);
    historyEngine.pushNode = (node) => {
      trace.push('history-engine:pushNode');
      originalPushNode(node);
    };

    const originalPublish = eventBus.publish.bind(eventBus);
    eventBus.publish = (event) => {
      trace.push(`event-bus:publish:${event.namespace}:${event.name}`);
      originalPublish(event);
    };

    const result = commandEngine.dispatch({
      id: 'cmd-1',
      name: 'CreatePage',
      payload: { page: getPage('page-1', 'Page 1') },
    });
    expect(result.success).toBe(true);

    expect(trace).toEqual([
      'object-engine:addPage',
      'history-engine:pushNode',
      'event-bus:publish:command:executed',
    ]);
  });

  // Tests 11 & 12: Failed Object Engine mutation isolation
  it('11 & 12. should create no history node and publish no committed event if Object Engine mutation fails', () => {
    const trace: string[] = [];
    eventBus.publish = (event) => {
      trace.push(`event-bus:publish:${event.namespace}:${event.name}`);
    };

    // Duplicate ID causes validation error
    objectEngine.addPage(getPage('page-1', 'Page 1'));

    const result = commandEngine.dispatch({
      id: 'cmd-2',
      name: 'CreatePage',
      payload: { page: getPage('page-1', 'Page 1') },
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('already exists');

    expect(historyEngine.getActiveNodeId()).toBeNull();
    expect(trace).toEqual([]);
  });

  // Tests 13 & 14: History recording failure triggers rollback
  it('13 & 14. should roll back Object Engine mutation and publish no committed event if History recording fails', () => {
    historyEngine.pushNode = () => {
      throw new Error('History write failed');
    };

    const trace: string[] = [];
    eventBus.publish = (event) => {
      trace.push(`event-bus:publish:${event.namespace}:${event.name}`);
    };

    const result = commandEngine.dispatch({
      id: 'cmd-1',
      name: 'CreatePage',
      payload: { page: getPage('page-1', 'Page 1') },
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('History write failed');

    expect(objectEngine.getObject('page-1')).toBeUndefined();
    expect(trace).toEqual([]);
  });

  // Tests 15 & 16: Subscriber failure isolation
  it('15 & 16. should preserve canonical state and history node if committed event subscribers fail', () => {
    eventBus.subscribe('command:executed', () => {
      throw new Error('Subscriber error');
    });

    const result = commandEngine.dispatch({
      id: 'cmd-1',
      name: 'CreatePage',
      payload: { page: getPage('page-1', 'Page 1') },
    });
    expect(result.success).toBe(true);

    expect(objectEngine.getObject('page-1')).toBeDefined();
    expect(historyEngine.getActiveNodeId()).toBe('cmd-1');
  });

  // Tests 17, 18, 19, 20, 21, 22: Undo/redo pathways and cursor movement
  it('17-22. should execute undo/redo without recursive nodes, and shift cursor conditionally on success', () => {
    commandEngine.dispatch({
      id: 'cmd-1',
      name: 'CreatePage',
      payload: { page: getPage('page-1', 'Page 1') },
    });

    // 17. Undo
    historyEngine.undo();
    expect(objectEngine.getObject('page-1')).toBeUndefined();
    expect(historyEngine.getActiveNodeId()).toBeNull();

    // 18. Redo
    historyEngine.redo();
    expect(objectEngine.getObject('page-1')).toBeDefined();
    expect(historyEngine.getActiveNodeId()).toBe('cmd-1');

    // 20. Failed undo leaves cursor unchanged
    const originalExecuteReverseDelta = commandEngine.executeReverseDelta.bind(commandEngine);
    commandEngine.executeReverseDelta = () => {
      throw new Error('Reverse mutation failed');
    };

    expect(() => historyEngine.undo()).toThrow('Reverse mutation failed');
    expect(historyEngine.getActiveNodeId()).toBe('cmd-1');

    // Restore
    commandEngine.executeReverseDelta = originalExecuteReverseDelta;

    // 22. Failed redo leaves cursor unchanged
    historyEngine.undo();
    expect(historyEngine.getActiveNodeId()).toBeNull();

    commandEngine.executeReplay = () => {
      throw new Error('Replay mutation failed');
    };

    expect(() => historyEngine.redo()).toThrow('Replay mutation failed');
    expect(historyEngine.getActiveNodeId()).toBeNull();
  });

  // Test 23: Undo followed by new command branching
  it('23. should create new branch and preserve old branch when executing command after undo', () => {
    commandEngine.dispatch({
      id: 'cmd-1',
      name: 'CreatePage',
      payload: { page: getPage('page-1', 'Page 1') },
    });

    historyEngine.undo();

    commandEngine.dispatch({
      id: 'cmd-2',
      name: 'CreatePage',
      payload: { page: getPage('page-2', 'Page 2') },
    });

    const branches = historyEngine.getBranches();
    const branchIds = branches.map((b) => b.id);
    expect(branchIds).toContain('cmd-1');
    expect(branchIds).toContain('cmd-2');
  });

  // Test 24: Replay of selected branch restores exact state
  it('24. should restore exact state of target branch on checkoutBranch', () => {
    commandEngine.dispatch({
      id: 'cmd-1',
      name: 'CreatePage',
      payload: { page: getPage('page-1', 'Page 1') },
    });

    historyEngine.undo();

    commandEngine.dispatch({
      id: 'cmd-2',
      name: 'CreatePage',
      payload: { page: getPage('page-2', 'Page 2') },
    });

    historyEngine.checkoutBranch('cmd-1');
    expect(objectEngine.getObject('page-1')).toBeDefined();
    expect(objectEngine.getObject('page-2')).toBeUndefined();

    historyEngine.checkoutBranch('cmd-2');
    expect(objectEngine.getObject('page-1')).toBeUndefined();
    expect(objectEngine.getObject('page-2')).toBeDefined();
  });

  // Tests 25-29: Multi-delta transaction atomic rollback
  it('25-29. should execute transactions atomically and roll back all changes in reverse order on failure', () => {
    const trace: string[] = [];
    const originalDeletePage = objectEngine.deletePage.bind(objectEngine);
    objectEngine.deletePage = (pageId, resolvedCoordinates) => {
      trace.push(`object-engine:deletePage:${pageId}`);
      originalDeletePage(pageId, resolvedCoordinates);
    };

    const page1 = getPage('page-1', 'Page 1');
    const page2 = getPage('page-2', 'Page 2');

    const cmds: Command[] = [
      { id: 't-cmd-1', name: 'CreatePage', payload: { page: page1 } },
      { id: 't-cmd-2', name: 'CreatePage', payload: { page: page2 } },
      { id: 't-cmd-3', name: 'CreatePage', payload: { page: page1 } }, // Fails!
    ];

    const result = commandEngine.executeTransaction(cmds, 'tx-1');
    expect(result.success).toBe(false);

    expect(trace).toEqual([
      'object-engine:deletePage:page-2',
      'object-engine:deletePage:page-1',
    ]);

    expect(objectEngine.getObject('page-1')).toBeUndefined();
    expect(objectEngine.getObject('page-2')).toBeUndefined();
    expect(historyEngine.getActiveNodeId()).toBeNull();
  });

  // Test 30: Rollback failure fatal error
  it('30. should throw fatal error if transaction rollback fails', () => {
    const page1 = getPage('page-1', 'Page 1');

    objectEngine.deletePage = () => {
      throw new Error('Disk read-only');
    };

    const cmds: Command[] = [
      { id: 't-cmd-1', name: 'CreatePage', payload: { page: page1 } },
      { id: 't-cmd-2', name: 'CreatePage', payload: { page: page1 } }, // Fails validation
    ];

    expect(() => {
      commandEngine.executeTransaction(cmds, 'tx-1');
    }).toThrow(FatalIntegrityError);
  });

  // Mandatory Repairs - 3. checkoutBranch ATOMICITY
  describe('checkoutBranch Deep Transitions & Atomicity', () => {
    beforeEach(() => {
      // Build the tree:
      //          root (A)
      //         /       \
      //      cmd-1 (B)  cmd-3 (D)
      //       /           \
      //     cmd-2 (C)   cmd-4 (E)

      // Step 1: create page-1 (root / node A)
      commandEngine.dispatch({ id: 'cmd-A', name: 'CreatePage', payload: { page: getPage('page-1', 'Page 1') } });
      // Step 2: create layer-B (branch B)
      commandEngine.dispatch({ id: 'cmd-B', name: 'CreateLayer', payload: { pageId: 'page-1', layer: getLayer('layer-B', 'Layer B') } });
      // Step 3: create component-C (branch C)
      commandEngine.dispatch({ id: 'cmd-C', name: 'CreateComponent', payload: { layerId: 'layer-B', component: getComponent('comp-C', 'Comp C') } });

      // Undo twice back to root (cmd-A)
      historyEngine.undo();
      historyEngine.undo();

      // Step 4: create layer-D (branch D)
      commandEngine.dispatch({ id: 'cmd-D', name: 'CreateLayer', payload: { pageId: 'page-1', layer: getLayer('layer-D', 'Layer D') } });
      // Step 5: create component-E (branch E)
      commandEngine.dispatch({ id: 'cmd-E', name: 'CreateComponent', payload: { layerId: 'layer-D', component: getComponent('comp-E', 'Comp E') } });
    });

    it('should successfully execute C -> E transition', () => {
      historyEngine.checkoutBranch('cmd-C');
      expect(objectEngine.getObject('comp-C')).toBeDefined();
      expect(objectEngine.getObject('comp-E')).toBeUndefined();

      historyEngine.checkoutBranch('cmd-E');
      expect(objectEngine.getObject('comp-C')).toBeUndefined();
      expect(objectEngine.getObject('comp-E')).toBeDefined();
    });

    it('should successfully execute E -> C transition', () => {
      historyEngine.checkoutBranch('cmd-E');
      historyEngine.checkoutBranch('cmd-C');
      expect(objectEngine.getObject('comp-C')).toBeDefined();
      expect(objectEngine.getObject('comp-E')).toBeUndefined();
    });

    it('should successfully execute C -> B transition', () => {
      historyEngine.checkoutBranch('cmd-C');
      historyEngine.checkoutBranch('cmd-B');
      expect(objectEngine.getObject('layer-B')).toBeDefined();
      expect(objectEngine.getObject('comp-C')).toBeUndefined();
    });

    it('should successfully execute B -> E transition', () => {
      historyEngine.checkoutBranch('cmd-B');
      historyEngine.checkoutBranch('cmd-E');
      expect(objectEngine.getObject('layer-D')).toBeDefined();
      expect(objectEngine.getObject('comp-E')).toBeDefined();
      expect(objectEngine.getObject('layer-B')).toBeUndefined();
    });

    it('should successfully execute E -> A transition', () => {
      historyEngine.checkoutBranch('cmd-E');
      historyEngine.checkoutBranch('cmd-A');
      expect(objectEngine.getObject('page-1')).toBeDefined();
      expect(objectEngine.getObject('layer-D')).toBeUndefined();
      expect(objectEngine.getObject('comp-E')).toBeUndefined();
    });

    it('should successfully execute A -> C transition', () => {
      historyEngine.checkoutBranch('cmd-A');
      historyEngine.checkoutBranch('cmd-C');
      expect(objectEngine.getObject('layer-B')).toBeDefined();
      expect(objectEngine.getObject('comp-C')).toBeDefined();
    });

    it('should roll back completely and restore state to starting position if a mid-checkout reverse fails', () => {
      historyEngine.checkoutBranch('cmd-C');
      const snapshotBefore = historyEngine.getSnapshot();

      // Sabotage reverse of cmd-C (DeleteComponent) by mocking deleteComponent to throw
      const originalDeleteComponent = objectEngine.deleteComponent.bind(objectEngine);
      objectEngine.deleteComponent = () => {
        throw new Error('Delete component crash!');
      };

      // Checkout to cmd-E requires reverting cmd-C and cmd-B first
      expect(() => {
        historyEngine.checkoutBranch('cmd-E');
      }).toThrow('Delete component crash!');

      // Cursor and snapshot must remain at cmd-C
      expect(historyEngine.getSnapshot()).toEqual(snapshotBefore);
      expect(historyEngine.getActiveNodeId()).toBe('cmd-C');
      expect(objectEngine.getObject('comp-C')).toBeDefined();
      expect(objectEngine.getObject('comp-E')).toBeUndefined();

      // Restore
      objectEngine.deleteComponent = originalDeleteComponent;
    });

    it('should roll back completely and restore state to starting position if a mid-checkout replay fails', () => {
      historyEngine.checkoutBranch('cmd-C');
      const snapshotBefore = historyEngine.getSnapshot();

      // Sabotage replay of cmd-D (CreateLayer) by mocking addLayer to throw only for layer-D
      const originalAddLayer = objectEngine.addLayer.bind(objectEngine);
      objectEngine.addLayer = (pageId, layer) => {
        if (layer.id === 'layer-D') {
          throw new Error('Create layer crash!');
        }
        originalAddLayer(pageId, layer);
      };

      // Checkout to cmd-E requires reversing cmd-C, cmd-B, and then replaying cmd-D, cmd-E
      expect(() => {
        historyEngine.checkoutBranch('cmd-E');
      }).toThrow('Create layer crash!');

      // Parity check: original state (including layer-B and comp-C) must be restored completely
      expect(historyEngine.getSnapshot()).toEqual(snapshotBefore);
      expect(historyEngine.getActiveNodeId()).toBe('cmd-C');
      expect(objectEngine.getObject('comp-C')).toBeDefined();
      expect(objectEngine.getObject('layer-B')).toBeDefined();
      expect(objectEngine.getObject('layer-D')).toBeUndefined();

      // Restore
      objectEngine.addLayer = originalAddLayer;
    });

    it('should throw FatalIntegrityError if compensation itself fails during checkout error recovery', () => {
      historyEngine.checkoutBranch('cmd-C');

      const originalDeleteLayer = objectEngine.deleteLayer.bind(objectEngine);
      const originalAddComponent = objectEngine.addComponent.bind(objectEngine);

      // Sabotage deleteLayer during checkout execution, and sabotage addComponent during compensation recovery
      objectEngine.deleteLayer = () => {
        throw new Error('Checkout reverse error');
      };
      objectEngine.addComponent = () => {
        throw new Error('Compensation add error');
      };

      expect(() => {
        historyEngine.checkoutBranch('cmd-E');
      }).toThrow(FatalIntegrityError);

      // Restore
      objectEngine.deleteLayer = originalDeleteLayer;
      objectEngine.addComponent = originalAddComponent;
    });

    it('should create zero new history nodes during a checkout branch transition', () => {
      const snapshotBefore = historyEngine.getSnapshot();
      const nodeCountBefore = Object.keys(snapshotBefore.nodes).length;

      historyEngine.checkoutBranch('cmd-C');

      const snapshotAfter = historyEngine.getSnapshot();
      const nodeCountAfter = Object.keys(snapshotAfter.nodes).length;

      expect(nodeCountAfter).toBe(nodeCountBefore);
    });
  });

  // Mandatory Repairs - 7. TRANSACTION REGRESSION PROTECTION
  describe('Transaction Regression & Boundaries', () => {
    it('should execute zero-command transaction without mutating state', () => {
      const snapshotBefore = historyEngine.getSnapshot();
      const result = commandEngine.executeTransaction([]);
      expect(result.success).toBe(true);

      const snapshotAfter = historyEngine.getSnapshot();
      // Should add a single transaction node with empty deltas
      expect(Object.keys(snapshotAfter.nodes).length).toBe(Object.keys(snapshotBefore.nodes).length + 1);
    });

    it('should execute one-command transaction successfully', () => {
      const page = getPage('page-1', 'Page 1');
      const result = commandEngine.executeTransaction([
        { id: 'sub-cmd-1', name: 'CreatePage', payload: { page } },
      ], 'tx-one');
      expect(result.success).toBe(true);

      expect(objectEngine.getObject('page-1')).toBeDefined();
      expect(historyEngine.getActiveNodeId()).toBe('tx-one');
    });

    it('should preserve history snapshot exactly on failed transaction', () => {
      const page1 = getPage('page-1', 'Page 1');
      const snapshotBefore = historyEngine.getSnapshot();

      const result = commandEngine.executeTransaction([
        { id: 'sub-cmd-1', name: 'CreatePage', payload: { page: page1 } },
        { id: 'sub-cmd-2', name: 'CreatePage', payload: { page: page1 } }, // duplicate ID fails validation
      ]);
      expect(result.success).toBe(false);

      expect(historyEngine.getSnapshot()).toEqual(snapshotBefore);
    });
  });
});
