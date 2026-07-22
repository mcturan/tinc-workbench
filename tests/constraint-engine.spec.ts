import { ObjectEngine } from '../src/object-engine';
import {
  ElectricalConstraintEngine,
} from '../src/constraint-engine';

describe('Electrical Constraint Engine Tests', () => {
  let objectEngine: ObjectEngine;
  let constraintEngine: ElectricalConstraintEngine;

  beforeEach(() => {
    objectEngine = new ObjectEngine('p-test', 'Constraint Project');
    constraintEngine = new ElectricalConstraintEngine();

    // Add standard test page and layer
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

  describe('Rule 001: Output -> Output conflict', () => {
    it('should report ERROR when connecting output pin to output pin', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-out1',
        type: 'CustomOut',
        name: 'O1',
        ports: [{ id: 'OUT1', name: 'OUT1', direction: 'output', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-out2',
        type: 'CustomOut',
        name: 'O2',
        ports: [{ id: 'OUT2', name: 'OUT2', direction: 'output', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      const conn = {
        id: 'conn-1',
        source: { type: 'PORT' as const, targetId: 'OUT1' },
        target: { type: 'PORT' as const, targetId: 'OUT2' },
        netId: 'net-1',
      };
      objectEngine.addLogicalConnection(conn);

      const diags = constraintEngine.validateConnection(conn, objectEngine);
      expect(diags.length).toBe(1);
      expect(diags[0].severity).toBe('ERROR');
      expect(diags[0].code).toBe('RULE-001');
      expect(diags[0].title).toBe('Output Conflict');
      expect(diags[0].sourceObjectId).toBe('comp-out1');
      expect(diags[0].sourcePinId).toBe('OUT1');
      expect(diags[0].targetObjectId).toBe('comp-out2');
      expect(diags[0].targetPinId).toBe('OUT2');
    });
  });

  describe('Rule 002: Input -> Input warning', () => {
    it('should report WARNING when connecting input pin to input pin', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-in1',
        type: 'CustomIn',
        name: 'I1',
        ports: [{ id: 'IN1', name: 'IN1', direction: 'input', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-in2',
        type: 'CustomIn',
        name: 'I2',
        ports: [{ id: 'IN2', name: 'IN2', direction: 'input', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      const conn = {
        id: 'conn-1',
        source: { type: 'PORT' as const, targetId: 'IN1' },
        target: { type: 'PORT' as const, targetId: 'IN2' },
        netId: 'net-1',
      };
      objectEngine.addLogicalConnection(conn);

      const diags = constraintEngine.validateConnection(conn, objectEngine);
      expect(diags.length).toBe(1);
      expect(diags[0].severity).toBe('WARNING');
      expect(diags[0].code).toBe('RULE-002');
      expect(diags[0].title).toBe('Floating Inputs');
    });
  });

  describe('Rule 003 & 004: Power-Power and Ground-Ground checks', () => {
    it('should report ERROR for general Power -> Power connection (Rule 003)', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-vcc1',
        type: 'VCC',
        name: 'VCC1',
        ports: [{ id: 'VCC1', name: 'VCC', direction: 'output', signalCategory: 'power' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-vcc2',
        type: 'VCC',
        name: 'VCC2',
        ports: [{ id: 'VCC2', name: 'VCC', direction: 'output', signalCategory: 'power' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      const conn = {
        id: 'conn-1',
        source: { type: 'PORT' as const, targetId: 'VCC1' },
        target: { type: 'PORT' as const, targetId: 'VCC2' },
        netId: 'net-1',
      };
      objectEngine.addLogicalConnection(conn);

      const diags = constraintEngine.validateConnection(conn, objectEngine);
      expect(diags.length).toBe(1);
      expect(diags[0].severity).toBe('ERROR');
      expect(diags[0].code).toBe('RULE-003');
      expect(diags[0].title).toBe('Power Rail Conflict');
    });

    it('should be OK (no errors) for Ground -> Ground connection (Rule 004)', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-gnd1',
        type: 'GND',
        name: 'GND1',
        ports: [{ id: 'GND1', name: 'GND', direction: 'input', signalCategory: 'power' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-gnd2',
        type: 'GND',
        name: 'GND2',
        ports: [{ id: 'GND2', name: 'GND', direction: 'input', signalCategory: 'power' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      const conn = {
        id: 'conn-1',
        source: { type: 'PORT' as const, targetId: 'GND1' },
        target: { type: 'PORT' as const, targetId: 'GND2' },
        netId: 'net-1',
      };
      objectEngine.addLogicalConnection(conn);

      const diags = constraintEngine.validateConnection(conn, objectEngine);
      expect(diags.length).toBe(0); // OK!
    });
  });

  describe('Rule 005: LED anode directly to GPIO warning', () => {
    it('should warn when LED anode connects directly to GPIO without resistor', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-led',
        type: 'LED',
        name: 'LED1',
        ports: [{ id: 'A', name: 'Anode', direction: 'passive', signalCategory: 'anode' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-mcu',
        type: 'ESP32',
        name: 'MCU1',
        ports: [],
        pins: [{ id: 'GPIO23', name: 'GPIO23', direction: 'bidirectional', signalCategory: 'digital' }],
        properties: { x: 100, y: 0 },
      });

      const conn = {
        id: 'conn-1',
        source: { type: 'PORT' as const, targetId: 'A' },
        target: { type: 'PIN' as const, targetId: 'GPIO23' },
        netId: 'net-1',
      };
      objectEngine.addLogicalConnection(conn);

      const diags = constraintEngine.validateProject(objectEngine);
      expect(diags.some(d => d.code === 'RULE-005')).toBe(true);
    });

    it('should NOT warn when connected through a resistor in series', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-led',
        type: 'LED',
        name: 'LED1',
        ports: [{ id: 'A', name: 'Anode', direction: 'passive', signalCategory: 'anode' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-res',
        type: 'Resistor',
        name: 'R1',
        ports: [
          { id: 'R1_1', name: '1', direction: 'passive', signalCategory: 'passive' },
          { id: 'R1_2', name: '2', direction: 'passive', signalCategory: 'passive' },
        ],
        pins: [],
        properties: { x: 50, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-mcu',
        type: 'ESP32',
        name: 'MCU1',
        ports: [],
        pins: [{ id: 'GPIO23', name: 'GPIO23', direction: 'bidirectional', signalCategory: 'digital' }],
        properties: { x: 100, y: 0 },
      });

      objectEngine.addLogicalConnection({
        id: 'conn-led-res',
        source: { type: 'PORT', targetId: 'A' },
        target: { type: 'PORT', targetId: 'R1_1' },
        netId: 'net-1',
      });
      objectEngine.addLogicalConnection({
        id: 'conn-res-mcu',
        source: { type: 'PORT', targetId: 'R1_2' },
        target: { type: 'PIN', targetId: 'GPIO23' },
        netId: 'net-2',
      });

      const diags = constraintEngine.validateProject(objectEngine);
      expect(diags.some(d => d.code === 'RULE-005')).toBe(false);
    });
  });

  describe('Rule 006: Duplicate connection check', () => {
    it('should report ERROR for duplicate connections between same pins', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-1',
        type: 'ESP32',
        name: 'M1',
        ports: [],
        pins: [{ id: 'GPIO23', name: 'GPIO23', direction: 'bidirectional', signalCategory: 'digital' }],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-2',
        type: 'Lamp',
        name: 'L1',
        ports: [{ id: '+', name: '+', direction: 'passive', signalCategory: 'passive' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      const conn1 = {
        id: 'conn-1',
        source: { type: 'PIN' as const, targetId: 'GPIO23' },
        target: { type: 'PORT' as const, targetId: '+' },
        netId: 'net-1',
      };
      const conn2 = {
        id: 'conn-2',
        source: { type: 'PIN' as const, targetId: 'GPIO23' },
        target: { type: 'PORT' as const, targetId: '+' },
        netId: 'net-1',
      };

      objectEngine.addLogicalConnection(conn1);
      objectEngine.addLogicalConnection(conn2);

      const diags = constraintEngine.validateConnection(conn2, objectEngine);
      expect(diags.some(d => d.code === 'RULE-006')).toBe(true);
    });
  });

  describe('Rule 007: Connection to missing pin check', () => {
    it('should report ERROR if referencing non-existent pin ID', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-1',
        type: 'ESP32',
        name: 'M1',
        ports: [],
        pins: [{ id: 'GPIO23', name: 'GPIO23', direction: 'bidirectional', signalCategory: 'digital' }],
        properties: { x: 0, y: 0 },
      });

      const conn = {
        id: 'conn-1',
        source: { type: 'PIN' as const, targetId: 'GPIO23' },
        target: { type: 'PIN' as const, targetId: 'GPIO_NONEXISTENT' },
        netId: 'net-1',
      };
      // Note: ObjectEngine.addLogicalConnection would normally throw endpoint reference violation
      // because we bypassed command execution here we can test engine validator capability directly:
      const diags = constraintEngine.validateConnection(conn, objectEngine);
      expect(diags.some(d => d.code === 'RULE-007')).toBe(true);
    });
  });

  describe('Component-level Validation API', () => {
    it('should return diagnostics of connections referencing target component', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-out1',
        type: 'CustomOut',
        name: 'O1',
        ports: [{ id: 'OUT1', name: 'OUT1', direction: 'output', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-out2',
        type: 'CustomOut',
        name: 'O2',
        ports: [{ id: 'OUT2', name: 'OUT2', direction: 'output', signalCategory: 'digital' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      const conn = {
        id: 'conn-1',
        source: { type: 'PORT' as const, targetId: 'OUT1' },
        target: { type: 'PORT' as const, targetId: 'OUT2' },
        netId: 'net-1',
      };
      objectEngine.addLogicalConnection(conn);

      const diags = constraintEngine.validateComponent('comp-out1', objectEngine);
      expect(diags.length).toBe(1);
      expect(diags[0].code).toBe('RULE-001');
    });
  });
});
