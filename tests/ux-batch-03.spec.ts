import { GeometryEngine } from '../src/geometry-engine';
import { ToolSystem } from '../src/tool-system';
import { ObjectEngine } from '../src/object-engine';
import { CommandEngine } from '../src/command-engine';
import { HistoryEngine } from '../src/history-engine';
import { EventBus } from '../src/event-bus';
import { SelectionEngine } from '../src/selection-engine';


describe('UX Batch 03 Integration Tests', () => {
  // 1. Simple Manhattan Wire Preview (UX-009)
  describe('Manhattan Routing Rules', () => {
    it('should generate orthogonal routes (source -> horizontal to target X -> vertical to target Y)', () => {
      const geometryEngine = new GeometryEngine();
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 50 };

      const segments = geometryEngine.routeManhattan(start, end);
      expect(segments.length).toBe(2);
      expect(segments[0]).toEqual({ start: { x: 0, y: 0 }, end: { x: 100, y: 0 } });
      expect(segments[1]).toEqual({ start: { x: 100, y: 0 }, end: { x: 100, y: 50 } });
    });
  });

  // 2. Logical Connection Commit (UX-010)
  describe('Logical Connection Commit Pipeline', () => {
    it('should commit wire and connection via CommandEngine, recording exactly one history node and publishing event after history', () => {
      const eventBus = new EventBus();
      const objectEngine = new ObjectEngine('p-1', 'Project');
      const selectionEngine = new SelectionEngine();
      const geometryEngine = new GeometryEngine();
      const toolSystem = new ToolSystem();

      const reverserReplayer = {
        executeReverse: (delta: any): boolean => commandEngine.executeReverseDelta(delta),
        executeReplay: (delta: any): boolean => commandEngine.executeReplay(delta),
      };
      const historyEngine = new HistoryEngine(eventBus, reverserReplayer);
      const commandEngine = new CommandEngine(objectEngine, historyEngine, eventBus);

      objectEngine.addPage({
        id: 'page-1',
        name: 'P1',
        layers: [],
        viewport: { zoom: 1.0, panX: 0, panY: 0 }
      });
      objectEngine.addLayer('page-1', {
        id: 'layer-1',
        name: 'L1',
        visible: true,
        locked: false,
        objects: []
      });

      objectEngine.addComponent('layer-1', {
        id: 'comp-1',
        type: 'ESP32',
        name: 'C1',
        ports: [],
        pins: [{ id: 'GPIO23', name: 'GPIO23', direction: 'bidirectional', signalCategory: 'digital' }],
        properties: { x: 10, y: 10 } // GPIO23 offset: { x: 120, y: 90 } -> world { x: 130, y: 100 }
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-2',
        type: 'Lamp',
        name: 'C2',
        ports: [{ id: '+', name: '+', direction: 'input', signalCategory: 'analog' }],
        pins: [],
        properties: { x: 200, y: 60 } // + offset: { x: 0, y: 40 } -> world { x: 200, y: 100 }
      });

      const eventTrace: any[] = [];
      eventBus.subscribe('command:executed', (ev) => {
        eventTrace.push(ev);
      }, { sync: true });

      // Hover on GPIO23
      toolSystem.handlePointerMove({ x: 130, y: 100 }, objectEngine, geometryEngine);
      expect(toolSystem.getHoveredTerminal()).toEqual({ componentId: 'comp-1', terminalId: 'GPIO23' });

      // Start drag
      toolSystem.handlePointerDown({ x: 130, y: 100 }, objectEngine, selectionEngine, geometryEngine);
      expect(toolSystem.isWiring()).toBe(true);

      // Drag to target +
      toolSystem.handlePointerMove({ x: 200, y: 100 }, objectEngine, geometryEngine);

      // Release on target +
      toolSystem.handlePointerUp(commandEngine, objectEngine, geometryEngine, selectionEngine);

      // Verify connection and wire registered in ObjectEngine
      const connections = objectEngine.getConnections();
      expect(connections.length).toBe(1);
      expect(connections[0].source.targetId).toBe('GPIO23');
      expect(connections[0].target.targetId).toBe('+');

      const wires = objectEngine.getWires();
      expect(wires.length).toBe(1);
      expect(wires[0].logicalConnectionId).toBe(connections[0].id);

      // Verify exactly one history node and one committed event published
      expect(historyEngine.getActiveNodeId()).not.toBeNull();
      expect(eventTrace.length).toBe(1);
    });
  });

  // 3. Move With Connection Preservation (UX-011)
  describe('Move Component Connection Preservation', () => {
    it('should stretch and re-route wire segments when components move, and restore segments on undo/redo', () => {
      const eventBus = new EventBus();
      const objectEngine = new ObjectEngine('p-1', 'Project');
      const geometryEngine = new GeometryEngine();

      const reverserReplayer = {
        executeReverse: (delta: any): boolean => commandEngine.executeReverseDelta(delta),
        executeReplay: (delta: any): boolean => commandEngine.executeReplay(delta),
      };
      const historyEngine = new HistoryEngine(eventBus, reverserReplayer);
      const commandEngine = new CommandEngine(objectEngine, historyEngine, eventBus);

      objectEngine.addPage({
        id: 'page-1',
        name: 'P1',
        layers: [],
        viewport: { zoom: 1.0, panX: 0, panY: 0 }
      });
      objectEngine.addLayer('page-1', {
        id: 'layer-1',
        name: 'L1',
        visible: true,
        locked: false,
        objects: []
      });

      objectEngine.addComponent('layer-1', {
        id: 'comp-1',
        type: 'ESP32',
        name: 'C1',
        ports: [],
        pins: [{ id: 'GPIO23', name: 'GPIO23', direction: 'bidirectional', signalCategory: 'digital' }],
        properties: { x: 10, y: 10 } // GPIO23 offset: { x: 120, y: 90 } -> world { x: 130, y: 100 }
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-2',
        type: 'Lamp',
        name: 'C2',
        ports: [{ id: '+', name: '+', direction: 'input', signalCategory: 'analog' }],
        pins: [],
        properties: { x: 200, y: 60 } // + offset: { x: 0, y: 40 } -> world { x: 200, y: 100 }
      });

      // Commit a logical connection GPIO23 -> +
      const connId = 'conn-test';
      const wireId = 'wire-test';
      commandEngine.executeTransaction([
        {
          id: 'cmd-c',
          name: 'CreateConnection',
          payload: {
            connection: {
              id: connId,
              source: { type: 'PIN', targetId: 'GPIO23' },
              target: { type: 'PORT', targetId: '+' },
              netId: 'net-test'
            }
          }
        },
        {
          id: 'cmd-w',
          name: 'CreateWire',
          payload: {
            wire: {
              id: wireId,
              logicalConnectionId: connId,
              segments: geometryEngine.routeManhattan({ x: 130, y: 100 }, { x: 200, y: 100 })
            }
          }
        }
      ]);

      const wire = objectEngine.getWire(wireId)!;
      expect(wire.segments[0].start).toEqual({ x: 130, y: 100 });

      // Move component-1 to (50, 50). GPIO23 world position becomes: 50 + 120 = 170, 50 + 90 = 140
      commandEngine.dispatch({
        id: 'cmd-m',
        name: 'MoveComponent',
        payload: {
          componentId: 'comp-1',
          x: 50,
          y: 50
        }
      });

      // Verify that the wire has automatically recomputed its segments to start at (170, 140)
      const updatedWire = objectEngine.getWire(wireId)!;
      expect(updatedWire.segments[0].start).toEqual({ x: 170, y: 140 });

      // Test History Undo
      historyEngine.undo();
      const undoneWire = objectEngine.getWire(wireId)!;
      expect(undoneWire.segments[0].start).toEqual({ x: 130, y: 100 }); // restored!

      // Test History Redo
      historyEngine.redo();
      const redoneWire = objectEngine.getWire(wireId)!;
      expect(redoneWire.segments[0].start).toEqual({ x: 170, y: 140 }); // re-applied!
    });
  });
});
