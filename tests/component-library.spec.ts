import {
  ComponentRegistry,
  SearchEngine,
  loadInitialComponents,
  ComponentMetadata,
} from '../src/component-library';
import { queryCatalog } from '../src/app';

describe('Smart Component Library Tests', () => {
  let registry: ComponentRegistry;
  let searchEngine: SearchEngine;

  beforeEach(() => {
    registry = new ComponentRegistry();
    searchEngine = new SearchEngine(registry);
  });

  describe('Validator & Registry Integrity', () => {
    const validComponent: ComponentMetadata = {
      id: 'TestComponent',
      name: 'Test Component',
      tvcs: {
        categoryPath: ['Passive'],
        manufacturer: 'Acme',
        series: '',
        family: 'Passive',
        variant: '',
        tags: [],
        package: 'Test',
        footprint: 'Test',
        physicalDimensions: { widthMm: 0, lengthMm: 0, heightMm: 0 },
        electrical: { operatingVoltageMin: 0, operatingVoltageMax: 0, logicVoltage: 0 },
        interfaces: [],
        protocols: []
      },
      aliases: ['tc', 'test_c'],
      keywords: ['test', 'dummy'],
      description: 'A valid component for testing',
      visual: {
        symbol: 'test_sym',
        width: 50,
        height: 50,
      },
      geometry: {
        body: 'rect',
        pins: [{ id: 'P1', x: 0, y: 25 }],
        boundingBox: { x: 0, y: 0, width: 50, height: 50 },
      },
      electrical: {
        pins: [
          {
            id: 'P1',
            name: 'Pin 1',
            aliases: ['p1'],
            electricalType: 'passive',
            direction: 'passive',
          },
        ],
      },
      knowledge: {
        notes: [],
        warnings: [],
        applications: [],
        tags: [],
      },
    };

    it('should register a valid component successfully', () => {
      registry.register(validComponent);
      expect(registry.getById('TestComponent')).toEqual(validComponent);
      expect(registry.list().length).toBe(1);
      expect(registry.categories()).toEqual(['Passive']);
    });

    it('should support unregistering components', () => {
      registry.register(validComponent);
      expect(registry.unregister('TestComponent')).toBe(true);
      expect(registry.getById('TestComponent')).toBeUndefined();
      expect(registry.unregister('NonExistent')).toBe(false);
    });

    it('should reject empty IDs', () => {
      const invalid = { ...validComponent, id: '' };
      expect(() => registry.register(invalid)).toThrow('Component ID cannot be empty');
    });

    it('should reject missing required general properties', () => {
      const invalid = { ...validComponent, name: '' };
      expect(() => registry.register(invalid)).toThrow('Component name cannot be empty');
    });

    it('should reject negative dimensions', () => {
      const invalid = {
        ...validComponent,
        visual: { symbol: 'test_sym', width: -10, height: 50 },
      };
      expect(() => registry.register(invalid)).toThrow('Component visual dimensions must be positive numbers');
    });

    it('should reject bounding box mismatch', () => {
      const invalid = {
        ...validComponent,
        geometry: {
          ...validComponent.geometry,
          boundingBox: { x: 0, y: 0, width: 60, height: 50 },
        },
      };
      expect(() => registry.register(invalid)).toThrow('Bounding box dimensions must match visual dimensions');
    });

    it('should reject duplicate pin IDs in geometry', () => {
      const invalid = {
        ...validComponent,
        geometry: {
          ...validComponent.geometry,
          pins: [
            { id: 'P1', x: 0, y: 25 },
            { id: 'P1', x: 10, y: 25 },
          ],
        },
      };
      expect(() => registry.register(invalid)).toThrow('Duplicate pin IDs in geometry definition');
    });

    it('should reject duplicate pin IDs in electrical', () => {
      const invalid = {
        ...validComponent,
        electrical: {
          pins: [
            {
              id: 'P1',
              name: 'Pin 1',
              aliases: [],
              electricalType: 'passive',
              direction: 'passive' as const,
            },
            {
              id: 'P1',
              name: 'Pin 1 Duplicated',
              aliases: [],
              electricalType: 'passive',
              direction: 'passive' as const,
            },
          ],
        },
      };
      expect(() => registry.register(invalid)).toThrow('Duplicate pin IDs in electrical definition');
    });

    it('should reject mismatched pins between geometry and electrical', () => {
      const invalid = {
        ...validComponent,
        geometry: {
          ...validComponent.geometry,
          pins: [{ id: 'P1', x: 0, y: 25 }],
        },
        electrical: {
          pins: [
            {
              id: 'P2',
              name: 'Pin 2',
              aliases: [],
              electricalType: 'passive',
              direction: 'passive' as const,
            },
          ],
        },
      };
      expect(() => registry.register(invalid)).toThrow("Pin 'P1' defined in geometry but missing in electrical metadata");
    });

    it('should reject duplicate aliases inside the same component', () => {
      const invalid = { ...validComponent, aliases: ['tc', 'tc'] };
      expect(() => registry.register(invalid)).toThrow("Duplicate alias 'tc' found in component 'TestComponent'");
    });

    it('should reject duplicate keywords inside the same component', () => {
      const invalid = { ...validComponent, keywords: ['dummy', 'dummy'] };
      expect(() => registry.register(invalid)).toThrow("Duplicate keyword 'dummy' found in component 'TestComponent'");
    });

    it('should reject duplicate component ID registration', () => {
      registry.register(validComponent);
      const duplicateIdComp = { ...validComponent, name: 'Different Name' };
      expect(() => registry.register(duplicateIdComp)).toThrow("Duplicate component ID 'TestComponent' already exists in registry");
    });

    it('should reject duplicate aliases globally across components', () => {
      registry.register(validComponent);
      const conflictComp = {
        ...validComponent,
        id: 'AnotherComponent',
        aliases: ['tc'],
      };
      expect(() => registry.register(conflictComp)).toThrow("Duplicate global alias 'tc' conflicts with component 'TestComponent'");
    });
  });

  describe('Loader & Initial Components Verification', () => {
    it('should load initial components successfully', () => {
      loadInitialComponents(registry);
      const components = registry.list();
      expect(components.length).toBeGreaterThanOrEqual(7);

      const esp32 = registry.getById('ESP32');
      expect(esp32).toBeDefined();
      expect(esp32!.name).toBe('ESP32 DevKit');
      expect(esp32!.tvcs?.categoryPath?.[0]).toBe('MCU');
      expect(esp32!.electrical.pins.map(p => p.id)).toContain('GPIO23');
    });
  });

  describe('Ranked Search Engine', () => {
    beforeEach(() => {
      loadInitialComponents(registry);
    });

    it('should search case-insensitively and support partial match', () => {
      const results = searchEngine.search('es');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('ESP32');
    });

    it('should support alias search', () => {
      const results = searchEngine.searchAlias('res');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('Resistor');
    });

    it('should support keyword search', () => {
      const results = searchEngine.searchKeyword('filter');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('Capacitor');
    });

    it('should rank results correctly (exact match, starts-with, aliases)', () => {
      // esp must find ESP32 first
      const espSearch = searchEngine.search('esp');
      expect(espSearch[0].id).toBe('ESP32');

      // ground must find GND first
      const groundSearch = searchEngine.search('ground');
      expect(groundSearch[0].id).toBe('GND');

      // res must find Resistor first
      const resSearch = searchEngine.search('res');
      expect(resSearch[0].id).toBe('Resistor');

      // gpio must find ESP32
      const gpioSearch = searchEngine.search('gpio');
      expect(gpioSearch.map(c => c.id)).toContain('ESP32');

      // 220 must return nothing
      const noneSearch = searchEngine.search('220');
      expect(noneSearch.length).toBe(0);
    });
  });

  describe('Placement Integration', () => {
    it('should query dynamically through queryCatalog and use component library search', () => {
      const esp = queryCatalog('esp');
      expect(esp).not.toBeNull();
      expect(esp!.type).toBe('ESP32');
      expect(esp!.name).toBe('ESP32 DevKit');
      expect(esp!.pins.map(p => p.id)).toContain('GPIO23');

      const gnd = queryCatalog('ground');
      expect(gnd).not.toBeNull();
      expect(gnd!.type).toBe('GND');

      const res = queryCatalog('res');
      expect(res).not.toBeNull();
      expect(res!.type).toBe('Resistor');

      const nonexistent = queryCatalog('220');
      expect(nonexistent).toBeNull();
    });
  });
});
