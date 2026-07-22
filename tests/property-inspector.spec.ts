import { ObjectEngine } from '../src/object-engine';
import { PropertyFormatter } from '../src/property-inspector/formatter';
import { PropertyInspector } from '../src/property-inspector/inspector';
import { globalRegistry } from '../src/component-library';

describe('Property Inspector & Knowledge Panel Tests', () => {
  let objectEngine: ObjectEngine;
  let container: any;
  let inspector: PropertyInspector;

  beforeEach(() => {
    objectEngine = new ObjectEngine('p-test', 'Inspector Project');
    container = {
      innerHTML: '',
      style: {
        display: '',
        fontFamily: '',
        color: '',
        padding: '',
      },
      appendChild: () => {},
    };
    inspector = new PropertyInspector(container as any);

    // Setup active page & layer
    objectEngine.addPage({
      id: 'page-1',
      name: 'Page 1',
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

  describe('Formatter (PropertyFormatter)', () => {
    it('should format component using registered library metadata', () => {
      const formatter = new PropertyFormatter();

      // Register or lookup ESP32 from global registry
      const metadata = globalRegistry.getById('ESP32');
      expect(metadata).toBeDefined();

      const obj = {
        id: 'comp-1',
        type: 'ESP32',
        name: 'My MCU',
        ports: [],
        pins: [],
        properties: { x: 0, y: 0 },
      };

      const data = formatter.formatComponent(obj, metadata);
      expect(data.id).toBe('comp-1');
      expect(data.name).toBe('My MCU');
      expect(data.category).toBe('MCU');
      expect(data.description).toContain('ESP32');
      expect(data.pins.length).toBeGreaterThan(0);
      expect(data.pins[0].name).toBeDefined();
      expect(data.tags).toContain('esp32');
    });

    it('should fall back to raw object definition when no metadata is registered', () => {
      const formatter = new PropertyFormatter();
      const obj = {
        id: 'comp-custom',
        type: 'CustomType',
        name: 'Custom Component',
        ports: [{ id: 'P1', name: 'Port 1', direction: 'input' as const, signalCategory: 'digital' }],
        pins: [{ id: 'P2', name: 'Pin 2', direction: 'output' as const, signalCategory: 'analog' }],
        properties: { x: 0, y: 0 },
      };

      const data = formatter.formatComponent(obj, undefined);
      expect(data.id).toBe('comp-custom');
      expect(data.name).toBe('Custom Component');
      expect(data.category).toBe('unspecified');
      expect(data.pins.length).toBe(2);
      expect(data.pins[0].name).toBe('Port 1');
      expect(data.pins[0].direction).toBe('Input');
      expect(data.pins[0].electricalType).toBe('Digital');
    });
  });

  describe('Renderer and Inspector States', () => {
    it('should display empty state when selection is empty', () => {
      inspector.refresh([], objectEngine);
      expect((inspector as any).panel.content.innerHTML).toContain('No Selection');
    });

    it('should display multi-selection count when multiple objects are selected', () => {
      inspector.refresh(['comp-1', 'comp-2'], objectEngine);
      expect((inspector as any).panel.content.innerHTML).toContain('2 objects selected.');
    });

    it('should render a single selected component detail using registered metadata', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-led',
        type: 'LED',
        name: 'Power Indicator',
        ports: [
          { id: 'A', name: 'Anode', direction: 'passive', signalCategory: 'anode' },
          { id: 'K', name: 'Cathode', direction: 'passive', signalCategory: 'cathode' },
        ],
        pins: [],
        properties: { x: 0, y: 0 },
      });

      inspector.refresh(['comp-led'], objectEngine);

      const html = (inspector as any).panel.content.innerHTML;
      expect(html).toContain('Power Indicator');
      expect(html).toContain('LED'); // Category
      expect(html).toContain('Anode'); // Pin name
      expect(html).toContain('Cathode'); // Pin name
      expect(html).toContain('Warning'); // Warning section
      expect(html).toContain('#led'); // Tag
    });

    it('should update display on clear() and setSelection()', () => {
      inspector.refresh(['comp-led'], objectEngine);
      inspector.clear();
      expect((inspector as any).panel.content.innerHTML).toContain('No Selection');
    });

    it('should manage visibility on show() and hide()', () => {
      inspector.hide();
      expect((inspector as any).panel.element.style.display).toBe('none');

      inspector.show();
      expect((inspector as any).panel.element.style.display).toBe('flex');
    });
  });
});
