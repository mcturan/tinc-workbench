import { ObjectEngine } from '../src/object-engine';
import { SelectionEngine } from '../src/selection-engine';
import { CanvasEngine } from '../src/canvas-engine';
import { GeometryEngine } from '../src/geometry-engine';
import { ProjectExplorer } from '../src/project-explorer/explorer';
import { ExplorerTreeBuilder } from '../src/project-explorer/tree';
import { ExplorerSearch } from '../src/project-explorer/search';

describe('Project Explorer Unit & Integration Tests', () => {
  let objectEngine: ObjectEngine;
  let selectionEngine: SelectionEngine;
  let canvasEngine: CanvasEngine;
  let geometryEngine: GeometryEngine;
  let container: any;
  let explorer: ProjectExplorer;

  beforeEach(() => {
    objectEngine = new ObjectEngine('p-test', 'Explorer Project');
    selectionEngine = new SelectionEngine();
    canvasEngine = new CanvasEngine();
    geometryEngine = new GeometryEngine();

    const createMockElement = (tagName: string) => {
      const el = {
        tagName,
        style: {} as any,
        setAttribute: jest.fn((name, value) => {
          el.attributes[name] = value;
        }),
        attributes: {} as Record<string, string>,
        appendChild: jest.fn((child) => {
          el.childrenList.push(child);
        }),
        childrenList: [] as any[],
        innerText: '',
        innerHTML: '',
        onclick: null as any,
        ondblclick: null as any,
        onmouseenter: null as any,
        onmouseleave: null as any,
      };
      return el as any;
    };

    (global as any).document = {
      createElement: jest.fn((tagName) => createMockElement(tagName)),
      getElementById: jest.fn((id) => null),
      head: { appendChild: jest.fn() }
    } as any;

    container = createMockElement('div');

    explorer = new ProjectExplorer(
      container as any,
      objectEngine,
      selectionEngine,
      canvasEngine,
      geometryEngine
    );

    // Setup active page & layer
    objectEngine.addPage({
      id: 'page-1',
      name: 'Sheet 1',
      layers: [],
      viewport: { zoom: 1, panX: 0, panY: 0 },
    });
    objectEngine.addLayer('page-1', {
      id: 'layer-1',
      name: 'Layer 1',
      visible: true,
      locked: false,
      objects: [],
    });
  });

  describe('Tree Creation & Hierarchy', () => {
    it('should build hierarchical explorer nodes from project state', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-1',
        type: 'ESP32',
        name: 'My MCU',
        ports: [],
        pins: [],
        properties: { x: 0, y: 0 },
      });

      const builder = new ExplorerTreeBuilder();
      const root = builder.buildTree(objectEngine, []);

      expect(root.type).toBe('project');
      expect(root.name).toBe('Explorer Project');
      expect(root.children.length).toBe(5); // Design, Build, Workshop, Intelligence, Documentation

      const designNode = root.children.find(c => c.id === 'logical-design');
      expect(designNode).toBeDefined();

      const schematicsNode = designNode!.children.find(c => c.id === 'design-schematics');
      expect(schematicsNode).toBeDefined();
      expect(schematicsNode!.children.length).toBe(1); // Sheet 1

      const pageNode = schematicsNode!.children[0];
      expect(pageNode.type).toBe('sheet');
      expect(pageNode.name).toBe('Sheet 1');
      expect(pageNode.children.length).toBe(1); // ESP32 component

      const compNode = pageNode.children[0];
      expect(compNode.type).toBe('component');
      expect(compNode.name).toBe('My MCU');
    });

    it('should handle empty projects cleanly', () => {
      const builder = new ExplorerTreeBuilder();
      const emptyEngine = new ObjectEngine('p-empty', 'Empty Proj');
      const root = builder.buildTree(emptyEngine, []);

      expect(root.children.length).toBe(5);
    });
  });

  describe('Explorer Search Filters', () => {
    it('should match components case-insensitively by name, alias, and ID', () => {
      const search = new ExplorerSearch();
      const comp = {
        id: 'comp-esp-devkit',
        type: 'ESP32',
        name: 'ESP32 DevKit',
        ports: [],
        pins: [],
        properties: { x: 0, y: 0 },
      };

      // By name
      expect(search.matchesComponent(comp, 'devkit')).toBe(true);
      // By type
      expect(search.matchesComponent(comp, 'esp')).toBe(true);
      // By id
      expect(search.matchesComponent(comp, 'esp-devkit')).toBe(true);
      // By alias (ESP32 aliases include 'mcu', 'esp-wroom')
      expect(search.matchesComponent(comp, 'mcu')).toBe(true);
      // Non-matching query
      expect(search.matchesComponent(comp, 'resistor')).toBe(false);
    });

    it('should filter explorer tree nodes using search query', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-1',
        type: 'ESP32',
        name: 'My MCU',
        ports: [],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-2',
        type: 'LED',
        name: 'Indicator LED',
        ports: [],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      const builder = new ExplorerTreeBuilder();
      const root = builder.buildTree(objectEngine, [], 'LED');

      const pageNode = root.children.find(c => c.id === 'logical-design')?.children.find(c => c.id === 'design-schematics')?.children[0];
      // ESP32 should be filtered out, leaving only the LED
      expect(pageNode?.children.length).toBe(1);
      expect(pageNode?.children[0].name).toBe('Indicator LED');
    });
  });

  describe('Expand / Collapse Cache', () => {
    it('should cache isExpanded states across builds', () => {
      const builder = new ExplorerTreeBuilder();

      // Check default is expanded
      expect(builder.isExpanded('page-1')).toBe(true);

      // Collapse and verify state is cached
      builder.setExpanded('page-1', false);
      expect(builder.isExpanded('page-1')).toBe(false);

      const root = builder.buildTree(objectEngine, []);
      const pageNode = root.children.find(c => c.id === 'logical-design')?.children.find(c => c.id === 'design-schematics')?.children[0];
      expect(pageNode?.isExpanded).toBe(false);
    });
  });

  describe('Selection Sync', () => {
    it('should synchronize explorer selection highlights', () => {
      explorer.refresh();
      explorer.setSelection(['page-1']);

      const root = new ExplorerTreeBuilder().buildTree(objectEngine, ['page-1']);
      const pageNode = root.children.find(c => c.id === 'logical-design')?.children.find(c => c.id === 'design-schematics')?.children[0];
      expect(pageNode?.isSelected).toBe(true);
    });
  });

  describe('Viewport Center Focus', () => {
    it('should trigger centerViewport on focusObject calls', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-focus',
        type: 'ESP32',
        name: 'Focus Component',
        ports: [],
        pins: [],
        properties: { x: 150, y: 250 },
      });

      const centerSpy = jest.spyOn(canvasEngine, 'centerViewport');
      explorer.focusObject('comp-focus');

      expect(centerSpy).toHaveBeenCalled();
      const targetCoord = centerSpy.mock.calls[0][0];
      // Target coord should be around the component bounds center
      expect(targetCoord.x).toBeGreaterThan(100);
      expect(targetCoord.y).toBeGreaterThan(200);
    });
  });

  describe('Public API state controls', () => {
    it('should manage visibility on show() and hide()', () => {
      explorer.hide();
      expect(explorer.panel.element.style.display).toBe('none');

      explorer.show();
      expect(explorer.panel.element.style.display).toBe('flex');
    });

    it('should reset selections and query on clear()', () => {
      explorer.search('LED');
      explorer.setSelection(['comp-1']);
      explorer.clear();

      expect(container.innerHTML).not.toContain('Indicator LED');
    });
  });
});
