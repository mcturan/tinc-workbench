import { ObjectEngine } from '../src/object-engine';
import {
  createLabel,
  deleteLabel,
  renameLabel,
  listLabels,
  getLabel,
  clearLabels,
  listSignals,
  getSignal,
  validateSignals,
} from '../src/net-labels';
import { createModule, instantiateModule, clearModules, clearInstances } from '../src/hierarchy';
import { PersistenceSerializer, PersistenceDeserializer } from '../src/persistence';
import { resolveHierarchy } from '../src/hierarchy';
import { listNamedSignals, resolveSignal, searchSignals } from '../src/ai/knowledge';

describe('Net Labels and Named Connectivity Tests', () => {
  let objectEngine: ObjectEngine;

  beforeEach(() => {
    objectEngine = new ObjectEngine('nl-proj-1', 'Net Labels Project');
    objectEngine.addPage({
      id: 'page-1',
      name: 'Main Page',
      layers: [],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    });
    objectEngine.addLayer('page-1', {
      id: 'layer-1',
      name: 'Signals Layer',
      visible: true,
      locked: false,
      objects: [],
    });

    clearLabels();
    clearModules();
    clearInstances();
  });

  describe('Label Operations & Signals', () => {
    it('should support create, rename, delete label lifecycle', () => {
      const lbl = createLabel('lbl-1', 'CLK', 'Global', { x: 10, y: 10 }, 'comp-1', 'pin-1');
      expect(lbl.id).toBe('lbl-1');
      expect(lbl.name).toBe('CLK');
      expect(listLabels().length).toBe(1);

      renameLabel('lbl-1', 'CLK_OUT');
      expect(getLabel('lbl-1')?.name).toBe('CLK_OUT');

      deleteLabel('lbl-1');
      expect(listLabels().length).toBe(0);
    });

    it('should group labels into signals correctly', () => {
      createLabel('lbl-1', 'CLK', 'Global', { x: 10, y: 10 }, 'comp-1', 'pin-1');
      createLabel('lbl-2', 'CLK', 'Global', { x: 20, y: 20 }, 'comp-2', 'pin-2');
      createLabel('lbl-3', 'VCC', 'Power', { x: 30, y: 30 }, 'comp-3', 'pin-3');

      const signals = listSignals();
      expect(signals.length).toBe(2);

      const clkSig = getSignal('CLK');
      expect(clkSig).toBeDefined();
      expect(clkSig?.labels.length).toBe(2);
      expect(clkSig?.scope).toBe('Global');
    });
  });

  describe('Connectivity & Graph Resolution', () => {
    it('should connect pins via local labels only within the same context level', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-1',
        type: 'Resistor',
        name: 'R1',
        ports: [{ id: 'comp-1:1', name: 'P1', direction: 'passive', signalCategory: 'passive' }],
        pins: [],
        properties: {},
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-2',
        type: 'Resistor',
        name: 'R2',
        ports: [{ id: 'comp-2:1', name: 'P1', direction: 'passive', signalCategory: 'passive' }],
        pins: [],
        properties: {},
      });

      createLabel('lbl-1', 'LOCAL_NET', 'Local', { x: 0, y: 0 }, 'comp-1', 'comp-1:1');
      createLabel('lbl-2', 'LOCAL_NET', 'Local', { x: 0, y: 0 }, 'comp-2', 'comp-2:1');

      const graph = resolveHierarchy(objectEngine);
      const nets = graph.listNets();

      expect(nets.length).toBe(1);
      expect(nets[0].pins.length).toBe(2);
    });

    it('should connect pins globally using global, power and ground labels', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-1',
        type: 'Resistor',
        name: 'R1',
        ports: [{ id: 'comp-1:1', name: 'P1', direction: 'passive', signalCategory: 'passive' }],
        pins: [],
        properties: {},
      });

      createModule('M_Sub', 'Sub', 'Sub block', '1.0.0', [{ id: 'sub-port-1', name: 'P1', direction: 'Bidirectional', internalComponentId: 'sub-comp', internalPinId: 'sub-comp:1' }], {
        objects: [
          {
            id: 'sub-comp',
            type: 'LED',
            name: 'SubLED',
            ports: [{ id: 'sub-comp:1', name: 'Pin 1', direction: 'passive', signalCategory: 'passive' }],
            pins: [],
            properties: {},
          },
        ],
        wires: [],
        connections: [],
      });

      instantiateModule('u_sub', 'M_Sub', null, 'SubInstance', {}, { x: 0, y: 0 }, objectEngine);

      createLabel('lbl-1', 'CLK_GLOBAL', 'Global', { x: 0, y: 0 }, 'comp-1', 'comp-1:1');
      createLabel('lbl-2', 'CLK_GLOBAL', 'Global', { x: 0, y: 0 }, 'u_sub/sub-comp', 'sub-comp:1');

      const graph = resolveHierarchy(objectEngine);
      const nets = graph.listNets();

      expect(nets.length).toBe(1);
      expect(nets[0].pins.some(p => p.componentId === 'comp-1')).toBe(true);
      expect(nets[0].pins.some(p => p.componentId === 'u_sub/sub-comp')).toBe(true);
    });
  });

  describe('Validation & Diagnostics', () => {
    it('should detect illegal characters, empty names, and mismatched scopes', () => {
      createLabel('lbl-1', 'CLK$', 'Global', { x: 0, y: 0 }, 'comp-1', '1');
      createLabel('lbl-2', '', 'Global', { x: 0, y: 0 }, 'comp-2', '1');
      createLabel('lbl-3', 'VDD', 'Power', { x: 0, y: 0 }, 'comp-3', '1');
      createLabel('lbl-4', 'VDD', 'Local', { x: 0, y: 0 }, 'comp-4', '1');

      const diags = validateSignals(objectEngine);
      expect(diags.some(d => d.title === 'Illegal Label Characters')).toBe(true);
      expect(diags.some(d => d.title === 'Empty Net Label')).toBe(true);
      expect(diags.some(d => d.title === 'Duplicate Global Name Type Mismatch')).toBe(true);
    });

    it('should detect conflicting power labels in the same physical net', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-1',
        type: 'Resistor',
        name: 'R1',
        ports: [
          { id: 'comp-1:1', name: 'Pin 1', direction: 'passive', signalCategory: 'passive' },
          { id: 'comp-1:2', name: 'Pin 2', direction: 'passive', signalCategory: 'passive' },
        ],
        pins: [],
        properties: {},
      });

      objectEngine.addLogicalConnection({
        id: 'conn-1',
        netId: 'NET_SHORTED',
        source: { type: 'PORT', targetId: 'comp-1:1' },
        target: { type: 'PORT', targetId: 'comp-1:2' },
      });

      createLabel('lbl-1', 'VCC_3V3', 'Power', { x: 0, y: 0 }, 'comp-1', 'comp-1:1');
      createLabel('lbl-2', 'VCC_5V', 'Power', { x: 0, y: 0 }, 'comp-1', 'comp-1:2');

      const diags = validateSignals(objectEngine);
      expect(diags.some(d => d.title === 'Conflicting Power Labels')).toBe(true);
    });
  });

  describe('Persistence Round-trip', () => {
    it('should successfully serialize and deserialize net labels', () => {
      createLabel('lbl-1', 'GND_NET', 'Ground', { x: 50, y: 50 }, 'comp-1', '1');

      const serializer = new PersistenceSerializer();
      const serialized = serializer.serialize(objectEngine);

      expect(serialized).toContain('"labels"');
      expect(serialized).toContain('"GND_NET"');

      const destEngine = new ObjectEngine('dest-proj', 'Dest Project');
      const deserializer = new PersistenceDeserializer();
      const result = deserializer.deserialize(serialized, destEngine);

      expect(result.success).toBe(true);
      expect(listLabels().length).toBe(1);
      expect(getLabel('lbl-1')?.name).toBe('GND_NET');
    });
  });

  describe('AI Knowledge Layer APIs', () => {
    it('should provide read-only Net Label query operations to AI layer', () => {
      createLabel('lbl-1', 'RESET_SIG', 'Global', { x: 10, y: 10 }, 'comp-1', '1');

      const signals = listNamedSignals();
      expect(signals.length).toBe(1);
      expect(signals[0].name).toBe('RESET_SIG');

      const resolved = resolveSignal(objectEngine, 'RESET_SIG');
      expect(resolved.signalName).toBe('RESET_SIG');
      expect(resolved.labels.length).toBe(1);

      const searched = searchSignals('RESET');
      expect(searched.length).toBe(1);
    });
  });
});
