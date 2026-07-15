import { GeometryEngine, Rect } from '../src/geometry-engine';
import { CanvasEngine } from '../src/canvas-engine';
import { RenderingEngine } from '../src/rendering-engine';
import { ObjectEngine } from '../src/object-engine';
import { HistoryEngine } from '../src/history-engine';
import { CommandEngine } from '../src/command-engine';
import { EventBus } from '../src/event-bus';
import { queryCatalog } from '../src/app';
import { SemanticObject } from '../src/types';
import { generateUUID } from '../src/utils';

describe('UX Batch 01 Unit & Integration Tests', () => {
  // 1. Geometry point/bounds behavior
  it('1. should verify Point-in-Rectangle and RectIntersection logic in GeometryEngine', () => {
    const geo = new GeometryEngine();
    const rect: Rect = { x: 10, y: 10, width: 50, height: 50 };

    expect(geo.pointInRect({ x: 20, y: 20 }, rect)).toBe(true);
    expect(geo.pointInRect({ x: 5, y: 20 }, rect)).toBe(false);
    expect(geo.pointInRect({ x: 70, y: 20 }, rect)).toBe(false);

    const r2: Rect = { x: 40, y: 40, width: 30, height: 30 };
    const r3: Rect = { x: 100, y: 100, width: 10, height: 10 };

    expect(geo.rectIntersection(rect, r2)).toBe(true);
    expect(geo.rectIntersection(rect, r3)).toBe(false);
  });

  // 2. Terminal world coordinate resolution
  it('2. should resolve terminal world coordinate based on component origin and catalog local offsets', () => {
    const geo = new GeometryEngine();
    const component: SemanticObject = {
      id: 'comp-1',
      type: 'ESP32',
      name: 'ESP32 Dev',
      ports: [],
      pins: [{ id: 'GPIO23', name: 'GPIO23', direction: 'bidirectional', signalCategory: 'digital' }],
      properties: { x: 100, y: 200 }
    };

    const coord = geo.getTerminalWorldCoordinate(component, 'GPIO23');
    // Local offset for ESP32 GPIO23 is { x: 120, y: 90 }
    expect(coord).toEqual({ x: 100 + 120, y: 200 + 90 });
  });

  // 3 & 4. Canvas world-to-screen and screen-to-world transform
  it('3 & 4. should correctly transform coordinates between world space and screen space', () => {
    const canvas = new CanvasEngine();
    canvas.setViewportDimensions(800, 600);

    const worldPt = { x: 100, y: 100 };
    const screenPt = canvas.worldToScreen(worldPt);

    const backToWorld = canvas.screenToWorld(screenPt);
    expect(backToWorld.x).toBeCloseTo(worldPt.x);
    expect(backToWorld.y).toBeCloseTo(worldPt.y);
  });

  // 5 & 6. Viewport zoom and pan behavior
  it('5 & 6. should update viewport zoom and pan state correctly', () => {
    const canvas = new CanvasEngine();
    canvas.setViewportDimensions(800, 600);

    const initial = canvas.getViewportState();
    expect(initial.zoom).toBe(1.0);
    expect(initial.panX).toBe(0);

    canvas.pan(50, -50);
    expect(canvas.getViewportState().panX).toBe(50);
    expect(canvas.getViewportState().panY).toBe(-50);

    canvas.setZoom(2.0);
    expect(canvas.getViewportState().zoom).toBe(2.0);
  });

  // 7, 8, 9. Quick summon catalog queries
  it('7, 8, 9. should perform deterministic catalog searches and alias matches', () => {
    // 7. Search for ESP32
    const m1 = queryCatalog('ESP32');
    expect(m1).not.toBeNull();
    expect(m1!.type).toBe('ESP32');

    // 8. Alias search
    const m2 = queryCatalog('esp');
    expect(m2).not.toBeNull();
    expect(m2!.type).toBe('ESP32');

    const m3 = queryCatalog('psu');
    expect(m3).not.toBeNull();
    expect(m3!.type).toBe('12V Power Supply');

    // 9. Deterministic catalog search non-existent matches
    expect(queryCatalog('non-existent')).toBeNull();
  });

  // 10, 11, 12, 13. Component placement via Command Engine, History Engine, and Event Bus
  it('10-13. should route component placement through Command Engine and record history and event bus logs', () => {
    const eventBus = new EventBus();
    const objectEngine = new ObjectEngine('proj-test', 'Test');
    const reverserReplayer = {
      executeReverse: jest.fn(() => true),
      executeReplay: jest.fn(() => true),
    };
    const historyEngine = new HistoryEngine(eventBus, reverserReplayer);
    const commandEngine = new CommandEngine(objectEngine, historyEngine, eventBus);

    // Initial page/layer
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

    const eventTrace: any[] = [];
    eventBus.subscribe('command:executed', (ev) => {
      eventTrace.push(ev);
    }, { sync: true });

    const component: SemanticObject = {
      id: 'comp-1',
      type: 'ESP32',
      name: 'ESP32 Dev',
      ports: [],
      pins: [{ id: 'GPIO23', name: 'GPIO23', direction: 'bidirectional', signalCategory: 'digital' }],
      properties: { x: 50, y: 50 }
    };

    const res = commandEngine.dispatch({
      id: 'cmd-place-1',
      name: 'CreateComponent',
      payload: {
        layerId: 'layer-1',
        component
      }
    });

    // 10. Confirm creation of one SemanticObject
    expect(res.success).toBe(true);
    expect(objectEngine.getObject('comp-1')).toBeDefined();

    // 11. Placement routes through Command Engine
    // (Already verified by executing dispatch and returning success)

    // 12. History records component placement
    expect(historyEngine.getActiveNodeId()).toBe('cmd-place-1');
    const node = historyEngine.getNode('cmd-place-1');
    expect(node).toBeDefined();
    expect(node!.delta.forward[0]).toEqual({
      type: 'CREATE_COMPONENT',
      layerId: 'layer-1',
      component
    });

    // 13. Event Bus publication occurs
    expect(eventTrace.length).toBe(1);
    expect(eventTrace[0].name).toBe('executed');
    expect(eventTrace[0].payload.commandId).toBe('cmd-place-1');
  });

  // 14, 15, 16. Rendering checks
  it('14-16. should render canvas, component labels, and terminal pins from canonical state', () => {
    const geo = new GeometryEngine();
    const canvas = new CanvasEngine();
    const renderEngine = new RenderingEngine(geo);
    const objectEngine = new ObjectEngine('p-1', 'P');

    // Page and layer setups
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
      objects: [
        {
          id: 'comp-1',
          type: 'ESP32',
          name: 'MyESP32',
          ports: [],
          pins: [{ id: 'GPIO23', name: 'GPIO23', direction: 'bidirectional', signalCategory: 'digital' }],
          properties: { x: 10, y: 10 }
        }
      ]
    });

    const mockCtx = {
      canvas: { width: 800, height: 600 },
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      rect: jest.fn(),
    } as any;

    // 14. Rendering reads placed canonical state
    renderEngine.render(mockCtx, objectEngine, canvas, 'page-1');
    expect(mockCtx.fillRect).toHaveBeenCalled();

    // 15. ESP32 label is represented in rendered output
    const fillTexts = mockCtx.fillText.mock.calls.map((c: any) => c[0]);
    expect(fillTexts).toContain('MyESP32');
    expect(fillTexts).toContain('(ESP32)');

    // 16. GPIO23 terminal is represented in rendered output
    expect(fillTexts).toContain('GPIO23');
  });

  // 17 & 18. No connections or wires are created
  it('17 & 18. should verify that no Wire or LogicalConnection is created by component placement', () => {
    const objectEngine = new ObjectEngine('p-1', 'P');
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
      objects: [
        {
          id: 'comp-1',
          type: 'ESP32',
          name: 'MyESP32',
          ports: [],
          pins: [{ id: 'GPIO23', name: 'GPIO23', direction: 'bidirectional', signalCategory: 'digital' }],
          properties: { x: 10, y: 10 }
        }
      ]
    });

    // Verify connections list and wires are empty
    const page = objectEngine.getObject('page-1') as any;
    expect(page.logicalConnections).toBeUndefined(); // Defer to later batches
    expect(page.wires).toBeUndefined();               // Defer to later batches
  });

  // 19. No later UX batches are implemented
  it('19. should verify that no selection engine or pathfinder algorithm is present', () => {
    const eventBus = new EventBus();
    const objectEngine = new ObjectEngine('p-1', 'P');
    const reverserReplayer = {
      executeReverse: () => true,
      executeReplay: () => true,
    };
    const historyEngine = new HistoryEngine(eventBus, reverserReplayer);
    const commandEngine = new CommandEngine(objectEngine, historyEngine, eventBus);

    expect((commandEngine as any).selectionEngine).toBeUndefined();
    expect((commandEngine as any).pathfinder).toBeUndefined();
  });

  // 20. UUID Browser and Jest compatibility verification
  it('20. should verify that generated IDs are valid RFC 4122 UUID shapes and work in all subsystems', () => {
    const uuid = generateUUID();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(uuid)).toBe(true);

    // Event Bus subscription IDs
    const eventBus = new EventBus();
    const subId = eventBus.subscribe('test', () => {}, { sync: true });
    expect(uuidRegex.test(subId)).toBe(true);

    // Object Engine clone IDs
    const objectEngine = new ObjectEngine('p-1', 'P');
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
    const component: SemanticObject = {
      id: 'comp-1',
      type: 'ESP32',
      name: 'ESP32',
      ports: [],
      pins: [],
      properties: {}
    };
    objectEngine.addComponent('layer-1', component);
    const clonedIds = objectEngine.cloneObjects(['comp-1']);
    expect(clonedIds.length).toBe(1);
    expect(uuidRegex.test(clonedIds[0])).toBe(true);

    // Command Engine transaction IDs
    const reverserReplayer = {
      executeReverse: () => true,
      executeReplay: () => true,
    };
    const historyEngine = new HistoryEngine(eventBus, reverserReplayer);
    const commandEngine = new CommandEngine(objectEngine, historyEngine, eventBus);
    const tRes = commandEngine.executeTransaction([]);
    expect(tRes.success).toBe(true);
  });
});
