import { ObjectEngine } from '../src/object-engine';
import { runERC, getDiagnostics, formatReport, hasErrors } from '../src/erc';

describe('ERC Engine Unit & Integration Tests', () => {
  let objectEngine: ObjectEngine;

  beforeEach(() => {
    objectEngine = new ObjectEngine('proj-erc-test', 'ERC Test Project');

    objectEngine.addPage({
      id: 'page-1',
      name: 'Main Page',
      layers: [],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    });
    objectEngine.addLayer('page-1', {
      id: 'layer-1',
      name: 'Signal Layer',
      visible: true,
      locked: false,
      objects: [],
    });
  });

  describe('Valid Circuit validation', () => {
    it('should evaluate a valid circuit cleanly with no errors', () => {
      objectEngine.addComponent('layer-1', {
        id: 'mcu-1',
        type: 'ESP32',
        name: 'MCU ESP32',
        ports: [
          { id: '3V3', name: '3V3', direction: 'passive', signalCategory: 'power' },
          { id: 'GND', name: 'GND', direction: 'passive', signalCategory: 'ground' },
        ],
        pins: [],
        properties: { x: 0, y: 0 },
      });

      objectEngine.addComponent('layer-1', {
        id: 'r-1',
        type: 'Resistor',
        name: 'R1',
        ports: [
          { id: 'p1', name: '1', direction: 'passive', signalCategory: 'passive' },
          { id: 'p2', name: '2', direction: 'passive', signalCategory: 'passive' },
        ],
        pins: [],
        properties: { x: 100, y: 100 },
      });

      objectEngine.addLogicalConnection({
        id: 'conn-1',
        netId: 'NET_VCC',
        source: { type: 'PORT', targetId: '3V3' },
        target: { type: 'PORT', targetId: 'p1' },
      });

      objectEngine.addLogicalConnection({
        id: 'conn-2',
        netId: 'NET_GND',
        source: { type: 'PORT', targetId: 'p2' },
        target: { type: 'PORT', targetId: 'GND' },
      });

      const report = runERC(objectEngine);
      expect(report.summary.errors).toBe(0);
      expect(hasErrors()).toBe(false);
    });
  });

  describe('Floating & Connectivity Rules', () => {
    it('should detect isolated components and dangling nets', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-iso',
        type: 'LED',
        name: 'Isolated LED',
        ports: [{ id: 'A', name: 'Anode', direction: 'passive', signalCategory: 'anode' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });

      objectEngine.addComponent('layer-1', {
        id: 'comp-dang',
        type: 'Resistor',
        name: 'Dangling R',
        ports: [
          { id: '1', name: 'Pin 1', direction: 'passive', signalCategory: 'passive' },
          { id: '2', name: 'Pin 2', direction: 'passive', signalCategory: 'passive' },
        ],
        pins: [],
        properties: { x: 200, y: 200 },
      });

      objectEngine.addLogicalConnection({
        id: 'conn-dang',
        netId: 'NET_DANG',
        source: { type: 'PORT', targetId: '1' },
        target: { type: 'FLOATING', coordinate: { x: 300, y: 300 } },
      });

      runERC(objectEngine);
      const diags = getDiagnostics();

      expect(diags.some(d => d.category === 'Connectivity' && d.title === 'Isolated Component')).toBe(true);
      expect(diags.some(d => d.title === 'Dangling Net')).toBe(true);
    });

    it('should detect floating input nets', () => {
      objectEngine.addComponent('layer-1', {
        id: 'mcu-1',
        type: 'ESP32',
        name: 'MCU',
        ports: [{ id: 'GPIO12', name: 'GPIO12', direction: 'input', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });

      objectEngine.addComponent('layer-1', {
        id: 'sensor-1',
        type: 'LED',
        name: 'Sensor',
        ports: [{ id: 'OUT', name: 'OUT', direction: 'input', signalCategory: 'passive' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      objectEngine.addLogicalConnection({
        id: 'conn-float',
        netId: 'NET_FLOAT',
        source: { type: 'PORT', targetId: 'GPIO12' },
        target: { type: 'PORT', targetId: 'OUT' },
      });

      runERC(objectEngine);
      const diags = getDiagnostics();
      expect(diags.some(d => d.title === 'Floating Input Net')).toBe(true);
    });
  });

  describe('Power Rules', () => {
    it('should detect power shorts (VCC to GND)', () => {
      objectEngine.addComponent('layer-1', {
        id: 'mcu-1',
        type: 'ESP32',
        name: 'MCU',
        ports: [
          { id: 'VCC', name: 'VCC', direction: 'passive', signalCategory: 'power' },
          { id: 'GND', name: 'GND', direction: 'passive', signalCategory: 'ground' },
        ],
        pins: [],
        properties: { x: 0, y: 0 },
      });

      objectEngine.addLogicalConnection({
        id: 'conn-short',
        netId: 'NET_SHORT',
        source: { type: 'PORT', targetId: 'VCC' },
        target: { type: 'PORT', targetId: 'GND' },
      });

      runERC(objectEngine);
      expect(hasErrors()).toBe(true);
      const diags = getDiagnostics();
      expect(diags.some(d => d.title === 'Power Short Circuit')).toBe(true);
    });

    it('should detect conflicting multiple power sources', () => {
      objectEngine.addComponent('layer-1', {
        id: 'mcu-1',
        type: 'ESP32',
        name: 'MCU',
        ports: [
          { id: 'VCC_3V3', name: 'VCC', direction: 'passive', signalCategory: 'power' },
        ],
        pins: [],
        properties: { x: 0, y: 0 },
      });

      objectEngine.addComponent('layer-1', {
        id: 'reg-1',
        type: 'Resistor',
        name: 'Regulator',
        ports: [
          { id: 'VCC_5V', name: '5V', direction: 'passive', signalCategory: 'power' },
        ],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      objectEngine.addLogicalConnection({
        id: 'conn-power-conflict',
        netId: 'NET_PWR',
        source: { type: 'PORT', targetId: 'VCC_3V3' },
        target: { type: 'PORT', targetId: 'VCC_5V' },
      });

      runERC(objectEngine);
      const diags = getDiagnostics();
      expect(diags.some(d => d.title === 'Multiple Power Sources')).toBe(true);
    });
  });

  describe('Passive Component Rules', () => {
    it('should warn when LED anode connects directly to GPIO without resistor', () => {
      objectEngine.addComponent('layer-1', {
        id: 'mcu-1',
        type: 'ESP32',
        name: 'MCU',
        ports: [
          { id: 'GPIO21', name: 'GPIO21', direction: 'bidirectional', signalCategory: 'digital' },
        ],
        pins: [],
        properties: { x: 0, y: 0 },
      });

      objectEngine.addComponent('layer-1', {
        id: 'led-1',
        type: 'LED',
        name: 'LED1',
        ports: [
          { id: 'A', name: 'Anode', direction: 'passive', signalCategory: 'anode' },
        ],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      objectEngine.addLogicalConnection({
        id: 'conn-led-gpio',
        netId: 'NET_LED_GPIO',
        source: { type: 'PORT', targetId: 'GPIO21' },
        target: { type: 'PORT', targetId: 'A' },
      });

      runERC(objectEngine);
      const diags = getDiagnostics();
      expect(diags.some(d => d.title === 'LED Without Series Resistor')).toBe(true);
    });
  });

  describe('Digital Conflicts', () => {
    it('should detect output-to-output conflicts', () => {
      objectEngine.addComponent('layer-1', {
        id: 'gate-1',
        type: 'ESP32',
        name: 'Gate 1',
        ports: [{ id: 'OUT1', name: 'OUT1', direction: 'output', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });

      objectEngine.addComponent('layer-1', {
        id: 'gate-2',
        type: 'ESP32',
        name: 'Gate 2',
        ports: [{ id: 'OUT2', name: 'OUT2', direction: 'output', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      objectEngine.addLogicalConnection({
        id: 'conn-out-out',
        netId: 'NET_CONFLICT',
        source: { type: 'PORT', targetId: 'OUT1' },
        target: { type: 'PORT', targetId: 'OUT2' },
      });

      runERC(objectEngine);
      const diags = getDiagnostics();
      expect(diags.some(d => d.title === 'Output Driver Conflict')).toBe(true);
    });
  });

  describe('General & Malformed Project validation', () => {
    it('should detect duplicate IDs and missing component definitions', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-unknown',
        type: 'MysteriousModule',
        name: 'Mod',
        ports: [],
        pins: [],
        properties: { x: 0, y: 0 },
      });

      runERC(objectEngine);
      const diags = getDiagnostics();
      expect(diags.some(d => d.title === 'Missing Component Definition')).toBe(true);
    });
  });

  describe('Report Generation & Formatter', () => {
    it('should build a formatted markdown report correctly', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-iso',
        type: 'LED',
        name: 'LED',
        ports: [{ id: 'A', name: 'Anode', direction: 'passive', signalCategory: 'anode' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });

      runERC(objectEngine);
      const reportText = formatReport();

      expect(reportText).toContain('# Electrical Rules Check (ERC) Report');
      expect(reportText).toContain('Total Issues');
      expect(reportText).toContain('Isolated Component');
    });
  });
});
