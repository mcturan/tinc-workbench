import { ObjectEngine } from '../src/object-engine';
import { EventBus } from '../src/event-bus';
import { NetResolver, listNets, NetValidator } from '../src/net-engine';
import { CommandEngine } from '../src/command-engine';
import { HistoryEngine } from '../src/history-engine';

describe('Net Engine & Electrical Graph Foundation Tests', () => {
  let objectEngine: ObjectEngine;
  let eventBus: EventBus;
  let resolver: NetResolver;

  beforeEach(() => {
    objectEngine = new ObjectEngine('proj-net-test', 'Net Test Project');
    eventBus = new EventBus();
    resolver = new NetResolver(objectEngine, eventBus);

    objectEngine.addPage({
      id: 'page-1',
      name: 'Sheet 1',
      layers: [],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    });
    objectEngine.addLayer('page-1', {
      id: 'layer-1',
      name: 'Layer 1',
      visible: true,
      locked: false,
      objects: [],
    });
  });

  describe('Graph Construction & Nets', () => {
    it('should build single net with simple connection', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-1',
        type: 'LED',
        name: 'LED 1',
        ports: [{ id: 'A', name: 'Anode', direction: 'passive', signalCategory: 'anode' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });

      objectEngine.addComponent('layer-1', {
        id: 'comp-2',
        type: 'Resistor',
        name: 'Res 1',
        ports: [{ id: '1', name: 'Pin 1', direction: 'passive', signalCategory: 'resistor' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      objectEngine.addLogicalConnection({
        id: 'conn-1',
        netId: 'NET_LEDR',
        source: { type: 'PORT', targetId: 'A' },
        target: { type: 'PORT', targetId: '1' },
      });

      const graph = resolver.getGraph();
      const nets = listNets(graph);

      expect(nets.length).toBe(1);
      expect(nets[0].pins.length).toBe(2);

      const pin1 = nets[0].pins[0];
      const pin2 = nets[0].pins[1];
      expect(pin1.componentId).toBe('comp-1');
      expect(pin1.pinId).toBe('A');
      expect(pin2.componentId).toBe('comp-2');
      expect(pin2.pinId).toBe('1');
    });

    it('should support multiple disjoint nets', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-1',
        type: 'LED',
        name: 'LED 1',
        ports: [{ id: 'A', name: 'Anode', direction: 'passive', signalCategory: 'anode' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-2',
        type: 'Resistor',
        name: 'Res 1',
        ports: [{ id: '1', name: 'Pin 1', direction: 'passive', signalCategory: 'resistor' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-3',
        type: 'ESP32',
        name: 'MCU 1',
        ports: [{ id: 'GND', name: 'GND', direction: 'passive', signalCategory: 'ground' }],
        pins: [],
        properties: { x: 200, y: 0 },
      });

      objectEngine.addLogicalConnection({
        id: 'conn-1',
        netId: 'net-a',
        source: { type: 'PORT', targetId: 'A' },
        target: { type: 'PORT', targetId: '1' },
      });

      objectEngine.addLogicalConnection({
        id: 'conn-2',
        netId: 'net-b',
        source: { type: 'PORT', targetId: 'GND' },
        target: { type: 'FLOATING', coordinate: { x: 300, y: 300 } },
      });

      const graph = resolver.getGraph();
      const nets = listNets(graph);

      expect(nets.length).toBe(2);
    });

    it('should support branching paths correctly', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-1',
        type: 'ESP32',
        name: 'MCU',
        ports: [
          { id: 'GPIO1', name: 'GPIO1', direction: 'bidirectional', signalCategory: 'digital' },
        ],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-2',
        type: 'Resistor',
        name: 'R1',
        ports: [{ id: '1', name: '1', direction: 'passive', signalCategory: 'resistor' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-3',
        type: 'LED',
        name: 'LED1',
        ports: [{ id: 'A', name: 'A', direction: 'passive', signalCategory: 'anode' }],
        pins: [],
        properties: { x: 200, y: 0 },
      });

      objectEngine.addLogicalConnection({
        id: 'conn-1',
        netId: 'net-c',
        source: { type: 'PORT', targetId: 'GPIO1' },
        target: { type: 'PORT', targetId: '1' },
      });
      objectEngine.addLogicalConnection({
        id: 'conn-2',
        netId: 'net-d',
        source: { type: 'PORT', targetId: 'GPIO1' },
        target: { type: 'PORT', targetId: 'A' },
      });

      const graph = resolver.getGraph();
      const nets = listNets(graph);

      expect(nets.length).toBe(1);
      expect(nets[0].pins.length).toBe(3);
    });
  });

  describe('Pathfinding & Traversal', () => {
    it('should find a path between connected terminals', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-1',
        type: 'LED',
        name: 'LED 1',
        ports: [{ id: 'A', name: 'Anode', direction: 'passive', signalCategory: 'anode' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-2',
        type: 'Resistor',
        name: 'Res 1',
        ports: [
          { id: '1', name: 'Pin 1', direction: 'passive', signalCategory: 'resistor' },
          { id: '2', name: 'Pin 2', direction: 'passive', signalCategory: 'resistor' },
        ],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      objectEngine.addLogicalConnection({
        id: 'conn-1',
        netId: 'net-e',
        source: { type: 'PORT', targetId: 'A' },
        target: { type: 'PORT', targetId: '1' },
      });

      const graph = resolver.getGraph();
      const path = graph.findPath('comp-1', 'A', 'comp-2', '1');

      expect(path).not.toBeNull();
      expect(path!.length).toBe(2);
      expect(path![0].componentId).toBe('comp-1');
      expect(path![1].componentId).toBe('comp-2');
    });

    it('should return null path if terminals are disconnected', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-1',
        type: 'LED',
        name: 'LED 1',
        ports: [{ id: 'A', name: 'Anode', direction: 'passive', signalCategory: 'anode' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-2',
        type: 'Resistor',
        name: 'Res 1',
        ports: [{ id: '1', name: 'Pin 1', direction: 'passive', signalCategory: 'resistor' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      const graph = resolver.getGraph();
      const path = graph.findPath('comp-1', 'A', 'comp-2', '1');
      expect(path).toBeNull();
    });
  });

  describe('Validation & Diagnostics', () => {
    it('should detect isolated pins', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-isolated',
        type: 'LED',
        name: 'LED',
        ports: [{ id: 'A', name: 'Anode', direction: 'passive', signalCategory: 'anode' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });

      const graph = resolver.getGraph();
      const validator = new NetValidator();
      const diagnostics = validator.validate(objectEngine, graph);

      expect(diagnostics.some((d) => d.code === 'ISOLATED_PIN')).toBe(true);
    });

    it('should detect duplicate edges', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-1',
        type: 'LED',
        name: 'LED',
        ports: [{ id: 'A', name: 'Anode', direction: 'passive', signalCategory: 'anode' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-2',
        type: 'Resistor',
        name: 'Res',
        ports: [{ id: '1', name: 'Pin 1', direction: 'passive', signalCategory: 'resistor' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      objectEngine.addLogicalConnection({
        id: 'conn-1',
        netId: 'net-dup',
        source: { type: 'PORT', targetId: 'A' },
        target: { type: 'PORT', targetId: '1' },
      });

      objectEngine.addLogicalConnection({
        id: 'conn-2',
        netId: 'net-dup',
        source: { type: 'PORT', targetId: 'A' },
        target: { type: 'PORT', targetId: '1' },
      });

      const graph = resolver.getGraph();
      const validator = new NetValidator();
      const diagnostics = validator.validate(objectEngine, graph);

      expect(diagnostics.some((d) => d.code === 'DUPLICATE_EDGE')).toBe(true);
    });
  });

  describe('Performance & Rebuild triggers', () => {
    it('should trigger graph rebuild when canonical connectivity changes', () => {
      // eslint-disable-next-line prefer-const
      let commandEngine: CommandEngine;
      const commandReplayer = {
        executeReverse: (delta: any) => commandEngine.executeReverseDelta(delta),
        executeReplay: (delta: any) => commandEngine.executeReplay(delta),
      };
      const historyEngine = new HistoryEngine(eventBus, commandReplayer);
      commandEngine = new CommandEngine(objectEngine, historyEngine, eventBus);

      objectEngine.addComponent('layer-1', {
        id: 'comp-1',
        type: 'LED',
        name: 'LED',
        ports: [{ id: 'A', name: 'Anode', direction: 'passive', signalCategory: 'anode' }],
        pins: [],
        properties: { x: 0, y: 0 },
      });
      objectEngine.addComponent('layer-1', {
        id: 'comp-2',
        type: 'Resistor',
        name: 'Res',
        ports: [{ id: '1', name: 'Pin 1', direction: 'passive', signalCategory: 'resistor' }],
        pins: [],
        properties: { x: 100, y: 0 },
      });

      let nets = resolver.getGraph().listNets();
      expect(nets.length).toBe(2);

      commandEngine.executeTransaction([
        {
          id: 'cmd-conn',
          name: 'CreateConnection',
          payload: {
            connection: {
              id: 'conn-cmd',
              netId: 'net-cmd-resolved',
              source: { type: 'PORT', targetId: 'A' },
              target: { type: 'PORT', targetId: '1' },
            },
          },
        },
      ]);

      nets = resolver.getGraph().listNets();
      expect(nets.length).toBe(1);
    });
  });
});
