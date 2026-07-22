import { ObjectEngine } from '../src/object-engine';
import {
  createModule,
  listModules,
  clearModules,
  instantiateModule,
  listInstances,
  clearInstances,
  resolveHierarchy,
  validateHierarchy,
  enterModule,
  exitModule,
  getNavigationStack,
  getCurrentModuleId,
  clearNavigation,
  createPort,
} from '../src/hierarchy';
import { PersistenceSerializer, PersistenceDeserializer } from '../src/persistence';
import { runERC } from '../src/erc';

describe('Hierarchical Design System Tests', () => {
  let objectEngine: ObjectEngine;

  beforeEach(() => {
    objectEngine = new ObjectEngine('h-proj-1', 'Hierarchical Project');
    objectEngine.addPage({
      id: 'page-1',
      name: 'Main Board',
      layers: [],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    });
    objectEngine.addLayer('page-1', {
      id: 'layer-1',
      name: 'Signals',
      visible: true,
      locked: false,
      objects: [],
    });

    clearModules();
    clearInstances();
    clearNavigation();
  });

  describe('Module Creation & Instantiation', () => {
    it('should support module creation and dynamic component library registration', () => {
      const port1 = createPort('IN', 'InputPort', 'Input', 'r1', '1');
      const moduleDef = createModule(
        'module:sub_block',
        'SubBlock',
        'A reusable sub-block regulator',
        '1.0.0',
        [port1],
        {
          objects: [
            {
              id: 'r1',
              type: 'Resistor',
              name: 'InternalR',
              ports: [{ id: '1', name: 'Pin 1', direction: 'passive', signalCategory: 'passive' }],
              pins: [],
              properties: { x: 0, y: 0 },
            },
          ],
          wires: [],
          connections: [],
        }
      );

      expect(moduleDef.id).toBe('module:sub_block');
      expect(listModules().length).toBe(1);

      const inst = instantiateModule('inst-1', 'module:sub_block', null, 'BlockInstance', {}, { x: 0, y: 0 }, objectEngine);
      expect(inst.id).toBe('inst-1');
      expect(listInstances().length).toBe(1);
    });
  });

  describe('Cycle & Recursive Inclusion validation', () => {
    it('should detect recursive module cycles and missing module references', () => {
      const dummyPort = createPort('P1', 'Port1', 'Bidirectional', 'm1-inst', '1');
      createModule('M1', 'Module 1', 'Desc', '1.0.0', [dummyPort], {
        objects: [
          { id: 'm1-inst', type: 'M1', name: 'Recurse', ports: [], pins: [], properties: {} },
        ],
        wires: [],
        connections: [],
      });

      const diags = validateHierarchy(objectEngine);
      expect(diags.some(d => d.title === 'Recursive Module Inclusion')).toBe(true);
    });
  });

  describe('Navigation Stack', () => {
    it('should maintain navigation stack and resolve current active module context', () => {
      const dummyPort = createPort('P1', 'Port1', 'Bidirectional', 'some-comp', '1');
      createModule('M1', 'Module 1', 'Desc', '1.0.0', [dummyPort], { objects: [], wires: [], connections: [] });
      instantiateModule('u1', 'M1', null, 'U1', {}, { x: 0, y: 0 }, objectEngine);

      expect(getCurrentModuleId()).toBeNull();
      enterModule('u1');
      expect(getCurrentModuleId()).toBe('M1');
      expect(getNavigationStack()).toEqual(['u1']);

      exitModule();
      expect(getCurrentModuleId()).toBeNull();
      expect(getNavigationStack()).toEqual([]);
    });
  });

  describe('Hierarchical Net Resolution & Port Mapping', () => {
    it('should route nets across hierarchy boundaries mapping ports to internal pins', () => {
      const vinPort = createPort('VIN', 'VoltageIn', 'Power', 'c-in', '1');
      createModule('M_Regulator', 'Regulator', 'Reg', '1.0.0', [vinPort], {
        objects: [
          {
            id: 'c-in',
            type: 'LED',
            name: 'CapIn',
            ports: [{ id: '1', name: 'A', direction: 'passive', signalCategory: 'passive' }],
            pins: [],
            properties: {},
          },
        ],
        wires: [],
        connections: [],
      });

      objectEngine.addComponent('layer-1', {
        id: 'mcu-top',
        type: 'ESP32',
        name: 'MCU',
        ports: [{ id: '3V3', name: '3V3', direction: 'passive', signalCategory: 'power' }],
        pins: [],
        properties: {},
      });

      instantiateModule('u_reg', 'M_Regulator', null, 'RegulatorInstance', {}, { x: 0, y: 0 }, objectEngine);

      objectEngine.addLogicalConnection({
        id: 'conn-top',
        netId: 'NET_POWER_RAIL',
        source: { type: 'PORT', targetId: '3V3' },
        target: { type: 'PORT', targetId: 'VIN' },
      });

      const graph = resolveHierarchy(objectEngine);
      const nets = graph.listNets();

      expect(nets.length).toBe(1);
      const net = nets[0];
      expect(net.pins.some(p => p.componentId === 'mcu-top' && p.pinId === '3V3')).toBe(true);
      expect(net.pins.some(p => p.componentId === 'u_reg/c-in' && p.pinId === '1')).toBe(true);
    });
  });

  describe('Persistence Round-trip', () => {
    it('should successfully serialize and deserialize hierarchical designs preserving modules/instances', () => {
      const port = createPort('IN', 'In', 'Input', 'c1', '1');
      createModule('M_Sample', 'Sample', 'Sample Module', '1.0.0', [port], {
        objects: [
          {
            id: 'c1',
            type: 'LED',
            name: 'C1',
            ports: [{ id: '1', name: 'Anode', direction: 'passive', signalCategory: 'passive' }],
            pins: [],
            properties: {},
          },
        ],
        wires: [],
        connections: [],
      });

      instantiateModule('inst-sample', 'M_Sample', null, 'MyInstance', {}, { x: 0, y: 0 }, objectEngine);

      const serializer = new PersistenceSerializer();
      const serialized = serializer.serialize(objectEngine);

      expect(serialized).toContain('"modules"');
      expect(serialized).toContain('"moduleInstances"');

      const destEngine = new ObjectEngine('dest-proj', 'Dest Project');
      const deserializer = new PersistenceDeserializer();
      const result = deserializer.deserialize(serialized, destEngine);

      expect(result.success).toBe(true);
      expect(listModules().length).toBe(1);
      expect(listInstances().length).toBe(1);
    });
  });

  describe('ERC across Hierarchy', () => {
    it('should execute ERC checks traversing module instance boundaries', () => {
      const shortPort = createPort('GND_PORT', 'Ground', 'Ground', 'gnd-comp', 'GND');
      createModule('M_ShortBlock', 'Short', 'Short circuit block', '1.0.0', [shortPort], {
        objects: [
          {
            id: 'gnd-comp',
            type: 'GND',
            name: 'GND_REF',
            ports: [{ id: 'GND', name: 'GND', direction: 'passive', signalCategory: 'ground' }],
            pins: [],
            properties: {},
          },
        ],
        wires: [],
        connections: [],
      });

      objectEngine.addComponent('layer-1', {
        id: 'vcc-comp',
        type: 'VCC',
        name: 'VCC_REF',
        ports: [{ id: 'VCC', name: 'VCC', direction: 'passive', signalCategory: 'power' }],
        pins: [],
        properties: {},
      });

      instantiateModule('u_short', 'M_ShortBlock', null, 'ShortBlockInstance', {}, { x: 0, y: 0 }, objectEngine);

      objectEngine.addLogicalConnection({
        id: 'conn-short',
        netId: 'NET_SHORTED',
        source: { type: 'PORT', targetId: 'VCC' },
        target: { type: 'PORT', targetId: 'GND_PORT' },
      });

      const report = runERC(objectEngine);
      expect(report.summary.errors).toBeGreaterThan(0);
      expect(report.diagnostics.some(d => d.title === 'Power Short Circuit')).toBe(true);
    });
  });
});
