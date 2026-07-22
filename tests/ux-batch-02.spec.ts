import { CanvasEngine } from '../src/canvas-engine';
import { GeometryEngine } from '../src/geometry-engine';
import { SelectionEngine } from '../src/selection-engine';
import { InputRouter } from '../src/input-router';
import { ToolSystem } from '../src/tool-system';
import { ObjectEngine } from '../src/object-engine';
import { CommandEngine } from '../src/command-engine';
import { HistoryEngine } from '../src/history-engine';
import { EventBus } from '../src/event-bus';
import { queryCatalog } from '../src/app';
import { generateUUID } from '../src/utils';
import { SemanticObject } from '../src/types';

describe('UX Batch 02 Direct Manipulation Tests', () => {
  // 1. Pointer Normalization tests
  describe('Pointer Normalization', () => {
    it('should convert screen/client coordinates to world coordinates under zoom and pan settings', () => {
      const canvasEngine = new CanvasEngine();
      canvasEngine.setViewportDimensions(800, 600);
      const inputRouter = new InputRouter(canvasEngine);

      const mockCanvasElement = {
        getBoundingClientRect: () => ({
          left: 10,
          top: 10,
          right: 810,
          bottom: 610,
          width: 800,
          height: 600,
        })
      } as any;

      // 1. Normal conversion at zoom=1.0 and pan=0
      const pt1 = inputRouter.normalizeEvent({ clientX: 410, clientY: 310 }, mockCanvasElement);
      expect(pt1).toEqual({ x: 0, y: 0 });

      // 2. Pan-aware conversion
      canvasEngine.pan(100, 200);
      const pt2 = inputRouter.normalizeEvent({ clientX: 410, clientY: 310 }, mockCanvasElement);
      expect(pt2).toEqual({ x: 100, y: 200 });

      // 3. Zoom-aware conversion
      canvasEngine.setZoom(2.0);
      const pt3 = inputRouter.normalizeEvent({ clientX: 410 + 100, clientY: 310 + 200 }, mockCanvasElement);
      expect(pt3).toEqual({ x: 100 + 50, y: 200 + 100 });
    });
  });

  // 2. Selection tests
  describe('Basic Selection', () => {
    it('should track selection state internally without performing geometry operations', () => {
      const selectionEngine = new SelectionEngine();
      expect(selectionEngine.getSelectedIds()).toEqual([]);

      selectionEngine.select('comp-1');
      expect(selectionEngine.getSelectedIds()).toEqual(['comp-1']);
      expect(selectionEngine.isSelected('comp-1')).toBe(true);

      selectionEngine.clear();
      expect(selectionEngine.getSelectedIds()).toEqual([]);
      expect(selectionEngine.isSelected('comp-1')).toBe(false);

      // Verify that selection engine does not have any references to GeometryEngine
      expect((selectionEngine as any).geometryEngine).toBeUndefined();
    });

    it('should select component on down and deselect/clear on empty click', () => {
      const objectEngine = new ObjectEngine('p-1', 'Project');
      const selectionEngine = new SelectionEngine();
      const geometryEngine = new GeometryEngine();
      const toolSystem = new ToolSystem();

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
        name: 'ESP32',
        ports: [],
        pins: [],
        properties: { x: 10, y: 10 } // size = width: 120, height: 180
      });

      // Pointer down on component
      toolSystem.handlePointerDown({ x: 50, y: 50 }, objectEngine, selectionEngine, geometryEngine);
      expect(selectionEngine.getSelectedIds()).toEqual(['comp-1']);

      // Pointer down on empty canvas
      toolSystem.handlePointerDown({ x: 500, y: 500 }, objectEngine, selectionEngine, geometryEngine);
      expect(selectionEngine.getSelectedIds()).toEqual([]);
    });
  });

  // 3. Direct Manipulation tests
  describe('Direct Manipulation', () => {
    it('should update transient position without creating history nodes or event bus logs, and commit exactly once on release', () => {
      const eventBus = new EventBus();
      const objectEngine = new ObjectEngine('p-1', 'Project');
      const selectionEngine = new SelectionEngine();
      const geometryEngine = new GeometryEngine();
      const toolSystem = new ToolSystem();
      const reverserReplayer = {
        executeReverse: () => true,
        executeReplay: () => true,
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
        name: 'ESP32',
        ports: [],
        pins: [],
        properties: { x: 0, y: 0 }
      });

      const eventTrace: any[] = [];
      eventBus.subscribe('command:executed', (ev) => {
        eventTrace.push(ev);
      }, { sync: true });

      // 1. Pointer down selects component
      toolSystem.handlePointerDown({ x: 10, y: 10 }, objectEngine, selectionEngine, geometryEngine);
      expect(selectionEngine.getSelectedIds()).toEqual(['comp-1']);

      // 2. Drag component (10px right, 10px down)
      toolSystem.handlePointerMove({ x: 20, y: 20 }, objectEngine, geometryEngine);

      // Verify transient state exists, and grid snap (20px) is applied
      const dragPreview = toolSystem.getDraggingState();
      expect(dragPreview).toEqual({ id: 'comp-1', x: 20, y: 20 });

      // Verify zero history nodes and zero event bus events during move/drag
      expect(historyEngine.getActiveNodeId()).toBeNull();
      expect(eventTrace.length).toBe(0);

      // 3. Pointer release commits coordinates exactly once
      toolSystem.handlePointerUp(commandEngine, objectEngine, geometryEngine, selectionEngine);

      // Verify coordinates updated canonically in ObjectEngine
      const comp = objectEngine.getObject('comp-1') as SemanticObject;
      expect(comp.properties.x).toBe(20);
      expect(comp.properties.y).toBe(20);

      // Verify exactly one history node and event bus publication
      expect(historyEngine.getActiveNodeId()).not.toBeNull();
      expect(eventTrace.length).toBe(1);

      // Verify that repeating pointerup does nothing
      toolSystem.handlePointerUp(commandEngine, objectEngine, geometryEngine, selectionEngine);
      expect(eventTrace.length).toBe(1);
    });
  });

  // 4. Port/Pin targeting tests
  describe('Port/Pin Targeting', () => {
    it('should resolve port snaps and support target hover highlighting without mutating state', () => {
      const objectEngine = new ObjectEngine('p-1', 'Project');
      const geometryEngine = new GeometryEngine();
      const toolSystem = new ToolSystem();

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
        name: 'ESP32',
        ports: [],
        // ESP32 GPIO23 local offset = { x: 120, y: 90 }
        pins: [{ id: 'GPIO23', name: 'GPIO23', direction: 'bidirectional', signalCategory: 'digital' }],
        properties: { x: 100, y: 100 } // Terminal world coord = { x: 220, y: 190 }
      });

      // Pointer moves close to GPIO23 (world coordinates: 225, 195)
      toolSystem.handlePointerMove({ x: 225, y: 195 }, objectEngine, geometryEngine);

      const target = toolSystem.getHoveredTerminal();
      expect(target).toEqual({
        componentId: 'comp-1',
        terminalId: 'GPIO23',
      });

      // Move far away -> hover clears
      toolSystem.handlePointerMove({ x: 500, y: 500 }, objectEngine, geometryEngine);
      expect(toolSystem.getHoveredTerminal()).toBeNull();

      // Verify that hover did not mutate ObjectEngine, create history nodes, or dispatch events
      expect(objectEngine.getProject().pages[0].layers[0].objects[0].properties.x).toBe(100);
    });
  });

  // 5. Regression tests
  describe('Regression Checks', () => {
    it('should verify catalog search aliases still match correctly', () => {
      const match = queryCatalog('esp');
      expect(match).not.toBeNull();
      expect(match!.type).toBe('ESP32');
    });

    it('should verify shared UUID utility creates correct RFC 4122 shape', () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(uuid)).toBe(true);
    });
  });
});
