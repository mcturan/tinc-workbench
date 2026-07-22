import { GeometryEngine } from '../src/geometry-engine';
import { ToolSystem } from '../src/tool-system';
import { ObjectEngine } from '../src/object-engine';
import { SelectionEngine } from '../src/selection-engine';

describe('Wire Tool & Manhattan Routing Tests', () => {
  it('should route orthogonally based on X-then-Y rule', () => {
    const geometryEngine = new GeometryEngine();

    const start = { x: 10, y: 10 };
    const end = { x: 50, y: 80 };

    // X-then-Y Manhattan routing should produce exactly 2 segments:
    // 1. (10, 10) -> (50, 10) (horizontal)
    // 2. (50, 10) -> (50, 80) (vertical)
    const segments = geometryEngine.routeManhattan(start, end);
    expect(segments.length).toBe(2);
    expect(segments[0]).toEqual({
      start: { x: 10, y: 10 },
      end: { x: 50, y: 10 }
    });
    expect(segments[1]).toEqual({
      start: { x: 50, y: 10 },
      end: { x: 50, y: 80 }
    });
  });

  it('should produce a single straight segment if source and target share X or Y coordinate', () => {
    const geometryEngine = new GeometryEngine();

    const start = { x: 10, y: 10 };
    const endX = { x: 50, y: 10 };
    const endY = { x: 10, y: 80 };

    const segmentsX = geometryEngine.routeManhattan(start, endX);
    expect(segmentsX.length).toBe(1);
    expect(segmentsX[0]).toEqual({
      start: { x: 10, y: 10 },
      end: { x: 50, y: 10 }
    });

    const segmentsY = geometryEngine.routeManhattan(start, endY);
    expect(segmentsY.length).toBe(1);
    expect(segmentsY[0]).toEqual({
      start: { x: 10, y: 10 },
      end: { x: 10, y: 80 }
    });
  });

  it('should maintain active source terminal and transient segments during wiring gesture', () => {
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
      pins: [{ id: 'GPIO23', name: 'GPIO23', direction: 'bidirectional', signalCategory: 'digital' }],
      properties: { x: 100, y: 100 } // Local offset for GPIO23 = { x: 120, y: 90 } -> world { x: 220, y: 190 }
    });

    // Hover near GPIO23 (world 220, 190) -> starts wiring gesture on down
    toolSystem.handlePointerMove({ x: 222, y: 192 }, objectEngine, geometryEngine);
    expect(toolSystem.getHoveredTerminal()).toEqual({
      componentId: 'comp-1',
      terminalId: 'GPIO23'
    });

    toolSystem.handlePointerDown({ x: 222, y: 192 }, objectEngine, selectionEngine, geometryEngine);
    expect(toolSystem.isWiring()).toBe(true);

    // Moving pointer to (300, 250) updates transient preview orthogonally
    toolSystem.handlePointerMove({ x: 300, y: 250 }, objectEngine, geometryEngine);
    const transientWire = toolSystem.getTransientWire();
    expect(transientWire).not.toBeNull();
    expect(transientWire!.length).toBe(2);
    expect(transientWire![0].start).toEqual({ x: 220, y: 190 });
    expect(transientWire![0].end).toEqual({ x: 300, y: 190 });
  });
});
