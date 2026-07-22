import { ObjectEngine } from '../src/object-engine';
import { GeometryEngine } from '../src/geometry-engine';
import { CommandEngine } from '../src/command-engine';
import { HistoryEngine } from '../src/history-engine';
import { EventBus } from '../src/event-bus';
import { resolveHierarchy } from '../src/hierarchy';

import { PersistenceSerializer, PersistenceDeserializer } from '../src/persistence';
import {
  createBus,
  deleteBus,
  listBuses,
  getBus,
  clearBuses,
  createBusEntry,
  deleteBusEntry,
  listBusEntries,
  createBusTap,
  deleteBusTap,
  listBusTaps,
  createBusJunction,
  deleteBusJunction,
  listBusJunctions,
  parseBusLabel,
  expandBusLabel,
  validateBusLabel,
  createConnector,
  deleteConnector,
  listConnectors,
  getConnector,
  clearConnectors,
  createNoConnectMarker,
  deleteNoConnectMarker,
  listNoConnectMarkers,
  clearNoConnectMarkers,
  createAnnotation,
  deleteAnnotation,
  listAnnotations,
  getAnnotation,
  clearAnnotations,
  moveAnnotation,
  searchAnnotations,
  alignLeft,
  alignRight,
  alignTop,
  alignBottom,
  alignCenter,
  distributeHorizontal,
  distributeVertical,
  copy,
  cut,
  paste,
  pasteInPlace,
  duplicate,
  getClipboardContent,
  rotate,
  mirror,
  arrayCopy,
  SnapEngine,
  createJunction,
  listJunctions,
  clearJunctions,
  autoJunction,
  cleanupJunctions,
  validateJunctions,
  mergeJunctions,
  createNetClass,
  deleteNetClass,
  listNetClasses,
  getNetClass,
  clearNetClasses,
  assignNetToClass,
  getNetClassForNet
} from '../src/pro-schematic';

describe('Professional Schematic Editor Module Tests (Sprint 16-20)', () => {
  let objectEngine: ObjectEngine;
  let geometryEngine: GeometryEngine;
  let commandEngine: CommandEngine;
  let historyEngine: HistoryEngine;
  let eventBus: EventBus;

  beforeEach(() => {
    objectEngine = new ObjectEngine('pro-proj-1', 'Pro Schematic Project');
    objectEngine.addPage({
      id: 'page-1',
      name: 'Schematic Page 1',
      layers: [],
      viewport: { zoom: 1.0, panX: 0, panY: 0 },
    });
    objectEngine.addLayer('page-1', {
      id: 'layer-1',
      name: 'Copper Layer',
      visible: true,
      locked: false,
      objects: [],
    });

    geometryEngine = new GeometryEngine();

    clearBuses();
    clearConnectors();
    clearNoConnectMarkers();
    clearAnnotations();
    clearJunctions();
    clearNetClasses();

    eventBus = new EventBus();
    const reverserReplayer = {
      executeReverse: (delta: any) => commandEngine.executeReverseDelta(delta),
      executeReplay: (delta: any) => commandEngine.executeReplay(delta),
    };
    historyEngine = new HistoryEngine(eventBus, reverserReplayer);
    commandEngine = new CommandEngine(objectEngine, historyEngine, eventBus);
  });

  describe('Part 1: Bus System', () => {
    it('should create and retrieve buses', () => {
      const bus = createBus('b1', 'DATA[0..7]', [{ start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }]);
      expect(bus.name).toBe('DATA[0..7]');
      expect(listBuses().length).toBe(1);
      expect(getBus('b1')).toBeDefined();
    });

    it('should delete buses', () => {
      createBus('b1', 'DATA[0..7]', []);
      deleteBus('b1');
      expect(listBuses().length).toBe(0);
    });

    it('should clear buses', () => {
      createBus('b1', 'DATA[0..7]', []);
      clearBuses();
      expect(listBuses().length).toBe(0);
    });

    it('should create and retrieve bus entries', () => {
      const entry = createBusEntry('e1', 'b1', 'DATA[0]', { x: 10, y: 0 }, 45);
      expect(entry.netName).toBe('DATA[0]');
      expect(listBusEntries().length).toBe(1);
    });

    it('should delete bus entries', () => {
      createBusEntry('e1', 'b1', 'DATA[0]', { x: 10, y: 0 }, 45);
      deleteBusEntry('e1');
      expect(listBusEntries().length).toBe(0);
    });

    it('should create and retrieve bus taps', () => {
      const tap = createBusTap('t1', 'b1', 'DATA[1]', { x: 20, y: 0 });
      expect(tap.netName).toBe('DATA[1]');
      expect(listBusTaps().length).toBe(1);
    });

    it('should delete bus taps', () => {
      createBusTap('t1', 'b1', 'DATA[1]', { x: 20, y: 0 });
      deleteBusTap('t1');
      expect(listBusTaps().length).toBe(0);
    });

    it('should create and retrieve bus junctions', () => {
      const j = createBusJunction('bj1', 'b1', { x: 30, y: 0 });
      expect(j.busId).toBe('b1');
      expect(listBusJunctions().length).toBe(1);
    });

    it('should delete bus junctions', () => {
      createBusJunction('bj1', 'b1', { x: 30, y: 0 });
      deleteBusJunction('bj1');
      expect(listBusJunctions().length).toBe(0);
    });

    it('should reject duplicate bus IDs', () => {
      createBus('b1', 'DATA[0..7]', []);
      expect(() => createBus('b1', 'DATA[0..7]', [])).toThrow();
    });

    it('should parse bus labels', () => {
      const parsed = parseBusLabel('DATA[0..7]');
      expect(parsed).toEqual({ prefix: 'DATA', startRange: 0, endRange: 7 });
    });

    it('should return null for invalid label format', () => {
      expect(parseBusLabel('INVALID')).toBeNull();
    });

    it('should expand bus labels sequentially', () => {
      const expanded = expandBusLabel('DATA[0..3]');
      expect(expanded).toEqual(['DATA[0]', 'DATA[1]', 'DATA[2]', 'DATA[3]']);
    });

    it('should expand bus labels backwards', () => {
      const expanded = expandBusLabel('DATA[3..0]');
      expect(expanded).toEqual(['DATA[3]', 'DATA[2]', 'DATA[1]', 'DATA[0]']);
    });

    it('should fallback expand single labels', () => {
      expect(expandBusLabel('RESET')).toEqual(['RESET']);
    });

    it('should validate correct bus labels', () => {
      expect(validateBusLabel('DATA[0..7]')).toBe(true);
    });

    it('should validate standard net name labels', () => {
      expect(validateBusLabel('RESET')).toBe(true);
    });

    it('should reject invalid bus label formats', () => {
      expect(validateBusLabel('DATA[a..b]')).toBe(false);
    });

    it('should reject out of range label bounds', () => {
      expect(validateBusLabel('DATA[0..2000]')).toBe(false);
    });

    it('should check parsed bounds are correct', () => {
      const parsed = parseBusLabel('ADDR[16..31]');
      expect(parsed?.startRange).toBe(16);
      expect(parsed?.endRange).toBe(31);
    });

    it('should connect bus entries with identical netNames on same bus', () => {
      createBus('b1', 'DATA[0..7]', []);
      createBusEntry('e1', 'b1', 'DATA[0]', { x: 10, y: 0 }, 45);
      createBusEntry('e2', 'b1', 'DATA[0]', { x: 50, y: 0 }, 45);

      const graph = resolveHierarchy(objectEngine);
      const edges = graph.edges;
      expect(edges.length).toBe(1);
    });

    it('should not connect bus entries with different netNames', () => {
      createBus('b1', 'DATA[0..7]', []);
      createBusEntry('e1', 'b1', 'DATA[0]', { x: 10, y: 0 }, 45);
      createBusEntry('e2', 'b1', 'DATA[1]', { x: 50, y: 0 }, 45);

      const graph = resolveHierarchy(objectEngine);
      expect(graph.edges.length).toBe(0);
    });

    it('should connect bus taps with matching entries', () => {
      createBus('b1', 'DATA[0..7]', []);
      createBusEntry('e1', 'b1', 'DATA[1]', { x: 10, y: 0 }, 45);
      createBusTap('t1', 'b1', 'DATA[1]', { x: 30, y: 0 });

      const graph = resolveHierarchy(objectEngine);
      expect(graph.edges.length).toBe(1);
    });

    it('should not connect entries on different buses', () => {
      createBus('b1', 'DATA[0..7]', []);
      createBus('b2', 'DATA[0..7]', []);
      createBusEntry('e1', 'b1', 'DATA[0]', { x: 10, y: 0 }, 45);
      createBusEntry('e2', 'b2', 'DATA[0]', { x: 50, y: 0 }, 45);

      const graph = resolveHierarchy(objectEngine);
      expect(graph.edges.length).toBe(0);
    });

    it('should handle zero segments bus resolution safely', () => {
      createBus('b1', 'DATA[0..7]', []);
      const graph = resolveHierarchy(objectEngine);
      expect(graph.edges.length).toBe(0);
    });
  });

  describe('Part 2: Connectors', () => {
    it('should create and retrieve connectors', () => {
      const conn = createConnector('c1', 'VCC', 'Power' as any, { x: 0, y: 0 });
      expect(conn.name).toBe('VCC');
      expect(listConnectors().length).toBe(1);
      expect(getConnector('c1')).toBeDefined();
    });

    it('should delete connectors', () => {
      createConnector('c1', 'VCC', 'Power' as any, { x: 0, y: 0 });
      deleteConnector('c1');
      expect(listConnectors().length).toBe(0);
    });

    it('should create and retrieve no-connect markers', () => {
      const nc = createNoConnectMarker('nc1', 'comp-1', 'pin-1', { x: 10, y: 10 });
      expect(nc.targetObjectId).toBe('comp-1');
      expect(listNoConnectMarkers().length).toBe(1);
    });

    it('should delete no-connect markers', () => {
      createNoConnectMarker('nc1', 'comp-1', 'pin-1', { x: 10, y: 10 });
      deleteNoConnectMarker('nc1');
      expect(listNoConnectMarkers().length).toBe(0);
    });

    it('should clear connectors and nc markers', () => {
      createConnector('c1', 'VCC', 'Power' as any, { x: 0, y: 0 });
      createNoConnectMarker('nc1', 'comp-1', 'pin-1', { x: 10, y: 10 });
      clearConnectors();
      clearNoConnectMarkers();
      expect(listConnectors().length).toBe(0);
      expect(listNoConnectMarkers().length).toBe(0);
    });

    it('should connect pins sharing matching global connectors', () => {
      createConnector('c1', 'CLK_GEN', 'Global', { x: 0, y: 0 }, 'comp-1', 'pin-1');
      createConnector('c2', 'CLK_GEN', 'Global', { x: 100, y: 100 }, 'comp-2', 'pin-1');

      const graph = resolveHierarchy(objectEngine);
      expect(graph.edges.length).toBe(1);
    });

    it('should not connect pins with different global connector names', () => {
      createConnector('c1', 'CLK_A', 'Global', { x: 0, y: 0 }, 'comp-1', 'pin-1');
      createConnector('c2', 'CLK_B', 'Global', { x: 100, y: 100 }, 'comp-2', 'pin-1');

      const graph = resolveHierarchy(objectEngine);
      expect(graph.edges.length).toBe(0);
    });

    it('should connect matching local connectors in the same context', () => {
      createConnector('c1', 'LOCAL_BUS', 'Local', { x: 0, y: 0 }, 'comp-1', 'pin-1');
      createConnector('c2', 'LOCAL_BUS', 'Local', { x: 10, y: 10 }, 'comp-2', 'pin-1');

      const graph = resolveHierarchy(objectEngine);
      expect(graph.edges.length).toBe(1);
    });

    it('should not connect local connectors residing in different instance paths', () => {
      createConnector('c1', 'LOCAL_BUS', 'Local', { x: 0, y: 0 }, 'u1/comp-1', 'pin-1');
      createConnector('c2', 'LOCAL_BUS', 'Local', { x: 10, y: 10 }, 'u2/comp-2', 'pin-1');

      const graph = resolveHierarchy(objectEngine);
      expect(graph.edges.length).toBe(0);
    });

    it('should ignore connectors without target components', () => {
      createConnector('c1', 'CLK_GEN', 'Global', { x: 0, y: 0 });
      const graph = resolveHierarchy(objectEngine);
      expect(graph.edges.length).toBe(0);
    });
  });

  describe('Part 3: Annotation Objects', () => {
    it('should create and list text annotations', () => {
      createAnnotation({
        id: 'a1',
        kind: 'Text',
        position: { x: 0, y: 0 },
        text: 'Hello schematic annotation',
      });
      expect(listAnnotations().length).toBe(1);
      expect(getAnnotation('a1')?.kind).toBe('Text');
    });

    it('should delete annotations', () => {
      createAnnotation({ id: 'a1', kind: 'Text', position: { x: 0, y: 0 }, text: 'Hello' });
      deleteAnnotation('a1');
      expect(listAnnotations().length).toBe(0);
    });

    it('should clear annotations', () => {
      createAnnotation({ id: 'a1', kind: 'Text', position: { x: 0, y: 0 }, text: 'Hello' });
      clearAnnotations();
      expect(listAnnotations().length).toBe(0);
    });

    it('should move annotations', () => {
      createAnnotation({ id: 'a1', kind: 'Text', position: { x: 0, y: 0 }, text: 'Hello' });
      moveAnnotation('a1', { x: 50, y: 50 });
      expect(getAnnotation('a1')?.position).toEqual({ x: 50, y: 50 });
    });

    it('should throw when moving non-existent annotation', () => {
      expect(() => moveAnnotation('invalid', { x: 10, y: 10 })).toThrow();
    });

    it('should search annotations case-insensitively', () => {
      createAnnotation({ id: 'a1', kind: 'Text', position: { x: 0, y: 0 }, text: 'Voltage supply note' });
      const results = searchAnnotations('VOLTAGE');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('a1');
    });

    it('should return empty search results if no match', () => {
      createAnnotation({ id: 'a1', kind: 'Text', position: { x: 0, y: 0 }, text: 'Voltage supply note' });
      expect(searchAnnotations('GROUND').length).toBe(0);
    });

    it('should support rich text annotations', () => {
      const rich = createAnnotation({
        id: 'r1',
        kind: 'RichText',
        position: { x: 0, y: 0 },
        htmlText: '<b>VCC supply</b>',
      });
      expect(rich.kind).toBe('RichText');
    });

    it('should support note annotations', () => {
      const note = createAnnotation({ id: 'n1', kind: 'Note', position: { x: 0, y: 0 }, text: 'Todo later' });
      expect(note.kind).toBe('Note');
    });

    it('should support callout annotations', () => {
      const call = createAnnotation({
        id: 'c1',
        kind: 'Callout',
        position: { x: 0, y: 0 },
        text: 'Look here',
        points: [{ x: 10, y: 10 }],
      });
      expect(call.kind).toBe('Callout');
    });
  });

  describe('Part 4: Professional Editing', () => {
    it('should align left edges of objects', () => {
      const objects = [
        { id: 'comp-1', type: 'ESP32', properties: { x: 50, y: 10 } },
        { id: 'comp-2', type: 'ESP32', properties: { x: 100, y: 20 } },
      ];
      alignLeft(objects, geometryEngine);
      expect(objects[0].properties.x).toBe(50);
      expect(objects[1].properties.x).toBe(50);
    });

    it('should align right edges of objects', () => {
      const objects = [
        { id: 'comp-1', type: 'ESP32', properties: { x: 50, y: 10 } },
        { id: 'comp-2', type: 'ESP32', properties: { x: 100, y: 20 } },
      ];
      alignRight(objects, geometryEngine);
      expect(objects[0].properties.x).toBe(100);
      expect(objects[1].properties.x).toBe(100);
    });

    it('should align top edges of objects', () => {
      const objects = [
        { id: 'comp-1', type: 'ESP32', properties: { x: 10, y: 10 } },
        { id: 'comp-2', type: 'ESP32', properties: { x: 20, y: 100 } },
      ];
      alignTop(objects, geometryEngine);
      expect(objects[0].properties.y).toBe(10);
      expect(objects[1].properties.y).toBe(10);
    });

    it('should align bottom edges of objects', () => {
      const objects = [
        { id: 'comp-1', type: 'ESP32', properties: { x: 10, y: 10 } },
        { id: 'comp-2', type: 'ESP32', properties: { x: 20, y: 100 } },
      ];
      alignBottom(objects, geometryEngine);
      expect(objects[0].properties.y).toBe(100);
      expect(objects[1].properties.y).toBe(100);
    });

    it('should align centers of objects', () => {
      const objects = [
        { id: 'comp-1', type: 'ESP32', properties: { x: 10, y: 10 } },
        { id: 'comp-2', type: 'ESP32', properties: { x: 130, y: 130 } },
      ];
      alignCenter(objects, geometryEngine);
      expect(objects[0].properties.x).toBe(70);
      expect(objects[1].properties.x).toBe(70);
    });

    it('should distribute objects horizontally with equal intervals', () => {
      const objects = [
        { id: 'comp-1', type: 'ESP32', properties: { x: 10, y: 0 } },
        { id: 'comp-2', type: 'ESP32', properties: { x: 50, y: 0 } },
        { id: 'comp-3', type: 'ESP32', properties: { x: 110, y: 0 } },
      ];
      distributeHorizontal(objects, geometryEngine);
      expect(objects[1].properties.x).toBe(60);
    });

    it('should distribute objects vertically with equal intervals', () => {
      const objects = [
        { id: 'comp-1', type: 'ESP32', properties: { x: 0, y: 10 } },
        { id: 'comp-2', type: 'ESP32', properties: { x: 0, y: 50 } },
        { id: 'comp-3', type: 'ESP32', properties: { x: 0, y: 110 } },
      ];
      distributeVertical(objects, geometryEngine);
      expect(objects[1].properties.y).toBe(60);
    });

    it('should do nothing for distribution on fewer than 3 objects', () => {
      const objects = [{ id: 'comp-1', type: 'ESP32', properties: { x: 10, y: 0 } }];
      distributeHorizontal(objects, geometryEngine);
      expect(objects[0].properties.x).toBe(10);
    });

    it('should handle alignment safely for single object list', () => {
      const objects = [{ id: 'comp-1', type: 'ESP32', properties: { x: 10, y: 10 } }];
      alignLeft(objects, geometryEngine);
      expect(objects[0].properties.x).toBe(10);
    });

    it('should handle alignment safely for empty list', () => {
      alignLeft([], geometryEngine);
    });

    it('should copy objects to clipboard memory', () => {
      const target = [{ id: 'c1', type: 'ESP32', properties: { x: 10, y: 10 } }];
      copy(target);
      expect(getClipboardContent().length).toBe(1);
      expect(getClipboardContent()[0].type).toBe('ESP32');
    });

    it('should cut objects from engine and copy to clipboard', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-cut',
        type: 'ESP32',
        name: 'ESP_Cut',
        ports: [],
        pins: [],
        properties: { x: 10, y: 10 },
      });

      const targets = [objectEngine.getObject('comp-cut')];
      cut(targets, commandEngine);

      expect(getClipboardContent().length).toBe(1);
      expect(objectEngine.getObject('comp-cut')).toBeUndefined();
    });

    it('should paste objects with coordinate offsets and new IDs', () => {
      const item = { id: 'c1', type: 'ESP32', name: 'ESP1', ports: [], pins: [], properties: { x: 10, y: 10 } };
      copy([item]);
      const pasted = paste(commandEngine, { x: 20, y: 20 });

      expect(pasted.length).toBe(1);
      expect(pasted[0].id).not.toBe('c1');
      expect(pasted[0].properties).toEqual({ x: 30, y: 30 });
    });

    it('should paste in place at exactly same coordinates', () => {
      const item = { id: 'c1', type: 'ESP32', name: 'ESP1', ports: [], pins: [], properties: { x: 10, y: 10 } };
      copy([item]);
      const pasted = pasteInPlace(commandEngine);
      expect(pasted[0].properties).toEqual({ x: 10, y: 10 });
    });

    it('should duplicate objects offset by 10 units', () => {
      const item = { id: 'c1', type: 'ESP32', name: 'ESP1', ports: [], pins: [], properties: { x: 10, y: 10 } };
      const duplicated = duplicate([item], commandEngine);
      expect(duplicated[0].properties).toEqual({ x: 20, y: 20 });
    });

    it('should handle copy/paste on empty lists safely', () => {
      copy([]);
      expect(paste(commandEngine).length).toBe(0);
    });

    it('should rotate objects around common center', () => {
      const list = [
        { id: 'comp-1', type: 'ESP32', properties: { x: 10, y: 10 } },
        { id: 'comp-2', type: 'ESP32', properties: { x: 90, y: 90 } },
      ];
      rotate(list, 90, geometryEngine);
      expect(list[0].properties.x).toBeCloseTo(90);
      expect(list[0].properties.y).toBeCloseTo(10);
    });

    it('should mirror objects horizontally around center', () => {
      const list = [
        { id: 'comp-1', type: 'ESP32', properties: { x: 10, y: 10 } },
        { id: 'comp-2', type: 'ESP32', properties: { x: 90, y: 90 } },
      ];
      mirror(list, 'H', geometryEngine);
      expect(list[0].properties.x).toBe(90);
    });

    it('should mirror objects vertically around center', () => {
      const list = [
        { id: 'comp-1', type: 'ESP32', properties: { x: 10, y: 10 } },
        { id: 'comp-2', type: 'ESP32', properties: { x: 90, y: 90 } },
      ];
      mirror(list, 'V', geometryEngine);
      expect(list[0].properties.y).toBe(90);
    });

    it('should array copy objects count times along X axis', () => {
      const list = [{ id: 'c1', type: 'ESP32', name: 'ESP1', ports: [], pins: [], properties: { x: 10, y: 10 } }];
      const duplicateFn = (objs: any[], offset: { x: number; y: number }) => {
        copy(objs);
        return paste(commandEngine, offset);
      };
      const copied = arrayCopy(list, 3, 50, 'X', duplicateFn);
      expect(copied.length).toBe(3);
      expect(copied[0].properties.x).toBe(60);
      expect(copied[1].properties.x).toBe(110);
    });
  });

  describe('Part 5: Smart Snapping', () => {
    it('should snap coordinate to grid nodes', () => {
      const engine = new SnapEngine(10, 5);
      const res = engine.snap({ x: 8, y: 22 }, objectEngine);
      expect(res.co).toEqual({ x: 10, y: 20 });
      expect(res.type).toBe('Grid');
    });

    it('should snap to component pin if within tolerance', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-1',
        type: 'Lamp',
        name: 'L1',
        ports: [{ id: '+', name: '+', direction: 'passive', signalCategory: 'passive' }],
        pins: [],
        properties: { x: 50, y: 50 },
      });

      const engine = new SnapEngine(10, 8);
      const res = engine.snap({ x: 48, y: 92 }, objectEngine);
      expect(res.co).toEqual({ x: 50, y: 90 });
      expect(res.type).toBe('Pin');
    });

    it('should not snap to pin if outside tolerance limit', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-1',
        type: 'Lamp',
        name: 'L1',
        ports: [{ id: '+', name: '+', direction: 'passive', signalCategory: 'passive' }],
        pins: [],
        properties: { x: 50, y: 50 },
      });

      const engine = new SnapEngine(10, 2);
      const res = engine.snap({ x: 44, y: 95 }, objectEngine);
      expect(res.type).not.toBe('Pin');
    });

    it('should snap to midpoint of wire segments', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-mock-2',
        type: 'Lamp',
        name: 'Mock2',
        ports: [
          { id: 'p1', name: 'P1', direction: 'passive', signalCategory: 'passive' },
          { id: 'p2', name: 'P2', direction: 'passive', signalCategory: 'passive' },
        ],
        pins: [],
        properties: {},
      });
      objectEngine.addLogicalConnection({
        id: 'conn-mid',
        netId: 'N_MID',
        source: { type: 'PORT', targetId: 'p1' },
        target: { type: 'PORT', targetId: 'p2' },
      });

      const engine = new SnapEngine(10, 8);
      objectEngine.addWire({
        id: 'w1',
        logicalConnectionId: 'conn-mid',
        segments: [{ start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }],
      });
      const res = engine.snap({ x: 48, y: 2 }, objectEngine);
      expect(res.co).toEqual({ x: 50, y: 0 });
      expect(res.type).toBe('Midpoint');
    });

    it('should snap to center point of graphics', () => {
      const engine = new SnapEngine(10, 8);
      const res = engine.snap({ x: 48, y: 52 }, objectEngine, [{ x: 50, y: 50 }]);
      expect(res.co).toEqual({ x: 50, y: 50 });
      expect(res.type).toBe('Center');
    });
  });

  describe('Part 6: Junction Engine', () => {
    it('should place auto junction on 3-way wire crossings', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-mock-3',
        type: 'Lamp',
        name: 'Mock3',
        ports: [
          { id: 'p1', name: 'P1', direction: 'passive', signalCategory: 'passive' },
          { id: 'p2', name: 'P2', direction: 'passive', signalCategory: 'passive' },
        ],
        pins: [],
        properties: {},
      });
      objectEngine.addLogicalConnection({
        id: 'conn-junc-1',
        netId: 'N_J1',
        source: { type: 'PORT', targetId: 'p1' },
        target: { type: 'PORT', targetId: 'p2' },
      });

      objectEngine.addWire({
        id: 'w1',
        logicalConnectionId: 'conn-junc-1',
        segments: [{ start: { x: 50, y: 50 }, end: { x: 100, y: 50 } }],
      });
      objectEngine.addWire({
        id: 'w2',
        logicalConnectionId: 'conn-junc-1',
        segments: [{ start: { x: 50, y: 50 }, end: { x: 50, y: 100 } }],
      });
      objectEngine.addWire({
        id: 'w3',
        logicalConnectionId: 'conn-junc-1',
        segments: [{ start: { x: 50, y: 50 }, end: { x: 0, y: 50 } }],
      });

      autoJunction(objectEngine);
      expect(listJunctions().length).toBe(1);
      expect(listJunctions()[0].type).toBe('Auto');
      expect(listJunctions()[0].position).toEqual({ x: 50, y: 50 });
    });

    it('should not place auto junction on 2-way wire ends', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-mock-4',
        type: 'Lamp',
        name: 'Mock4',
        ports: [
          { id: 'p1', name: 'P1', direction: 'passive', signalCategory: 'passive' },
          { id: 'p2', name: 'P2', direction: 'passive', signalCategory: 'passive' },
        ],
        pins: [],
        properties: {},
      });
      objectEngine.addLogicalConnection({
        id: 'conn-junc-2',
        netId: 'N_J2',
        source: { type: 'PORT', targetId: 'p1' },
        target: { type: 'PORT', targetId: 'p2' },
      });

      objectEngine.addWire({
        id: 'w1',
        logicalConnectionId: 'conn-junc-2',
        segments: [{ start: { x: 50, y: 50 }, end: { x: 100, y: 50 } }],
      });
      objectEngine.addWire({
        id: 'w2',
        logicalConnectionId: 'conn-junc-2',
        segments: [{ start: { x: 50, y: 50 }, end: { x: 50, y: 100 } }],
      });

      autoJunction(objectEngine);
      expect(listJunctions().length).toBe(0);
    });

    it('should cleanup floating junctions with no connected wires', () => {
      createJunction({
        id: 'j1',
        type: 'Manual',
        position: { x: 200, y: 200 },
        connectedWireIds: [],
      });

      cleanupJunctions(objectEngine);
      expect(listJunctions().length).toBe(0);
    });

    it('should keep manual junctions if connected to wires', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-mock-5',
        type: 'Lamp',
        name: 'Mock5',
        ports: [
          { id: 'p1', name: 'P1', direction: 'passive', signalCategory: 'passive' },
          { id: 'p2', name: 'P2', direction: 'passive', signalCategory: 'passive' },
        ],
        pins: [],
        properties: {},
      });
      objectEngine.addLogicalConnection({
        id: 'conn-junc-3',
        netId: 'N_J3',
        source: { type: 'PORT', targetId: 'p1' },
        target: { type: 'PORT', targetId: 'p2' },
      });

      objectEngine.addWire({
        id: 'w1',
        logicalConnectionId: 'conn-junc-3',
        segments: [{ start: { x: 50, y: 50 }, end: { x: 100, y: 50 } }],
      });
      createJunction({
        id: 'j1',
        type: 'Manual',
        position: { x: 50, y: 50 },
        connectedWireIds: ['w1'],
      });

      cleanupJunctions(objectEngine);
      expect(listJunctions().length).toBe(1);
    });

    it('should detect duplicate junctions at same coordinate', () => {
      createJunction({ id: 'j1', type: 'Manual', position: { x: 50, y: 50 }, connectedWireIds: ['w1'] });
      createJunction({ id: 'j2', type: 'Manual', position: { x: 50, y: 50 }, connectedWireIds: ['w1'] });

      const diags = validateJunctions(objectEngine);
      expect(diags.some(d => d.type === 'duplicate')).toBe(true);
    });

    it('should merge overlap junctions correctly', () => {
      objectEngine.addComponent('layer-1', {
        id: 'comp-mock-6',
        type: 'Lamp',
        name: 'Mock6',
        ports: [
          { id: 'p1', name: 'P1', direction: 'passive', signalCategory: 'passive' },
          { id: 'p2', name: 'P2', direction: 'passive', signalCategory: 'passive' },
        ],
        pins: [],
        properties: {},
      });
      objectEngine.addLogicalConnection({
        id: 'conn-junc-4',
        netId: 'N_J4',
        source: { type: 'PORT', targetId: 'p1' },
        target: { type: 'PORT', targetId: 'p2' },
      });

      objectEngine.addWire({ id: 'w1', logicalConnectionId: 'conn-junc-4', segments: [{ start: { x: 50, y: 50 }, end: { x: 100, y: 50 } }] });
      objectEngine.addWire({ id: 'w2', logicalConnectionId: 'conn-junc-4', segments: [{ start: { x: 50, y: 50 }, end: { x: 50, y: 100 } }] });
      objectEngine.addWire({ id: 'w3', logicalConnectionId: 'conn-junc-4', segments: [{ start: { x: 50, y: 50 }, end: { x: 0, y: 50 } }] });

      mergeJunctions(objectEngine);
      expect(listJunctions().length).toBe(1);
    });
  });

  describe('Part 7: Net Classes', () => {
    it('should create and retrieve net classes', () => {
      const nc = createNetClass('PowerRail', 0.5, 0.2, '#ff0000', 10);
      expect(nc.name).toBe('PowerRail');
      expect(nc.width).toBe(0.5);
      expect(listNetClasses().length).toBe(1);
      expect(getNetClass('PowerRail')).toBeDefined();
    });

    it('should delete net classes', () => {
      createNetClass('PowerRail', 0.5, 0.2, '#ff0000', 10);
      deleteNetClass('PowerRail');
      expect(listNetClasses().length).toBe(0);
    });

    it('should assign nets to class', () => {
      createNetClass('PowerRail', 0.5, 0.2, '#ff0000', 10);
      assignNetToClass('VCC_NET', 'PowerRail');
      expect(getNetClassForNet('VCC_NET')?.name).toBe('PowerRail');
    });

    it('should reassign net to new class cleanly', () => {
      createNetClass('PowerRail', 0.5, 0.2, '#ff0000', 10);
      createNetClass('SignalRail', 0.2, 0.1, '#00ff00', 5);
      assignNetToClass('VCC_NET', 'PowerRail');
      assignNetToClass('VCC_NET', 'SignalRail');

      expect(getNetClassForNet('VCC_NET')?.name).toBe('SignalRail');
    });

    it('should clear net classes', () => {
      createNetClass('PowerRail', 0.5, 0.2, '#ff0000', 10);
      clearNetClasses();
      expect(listNetClasses().length).toBe(0);
    });
  });

  describe('Part 8: Persistence Round-trip', () => {
    it('should serialize and deserialize new schematic editor objects successfully', () => {
      createBus('b1', 'DATA[0..7]', []);
      createConnector('c1', 'VCC', 'Power' as any, { x: 50, y: 50 });
      createAnnotation({ id: 'a1', kind: 'Text', position: { x: 10, y: 10 }, text: 'Pro Annotation' });
      createNetClass('PowerClass', 0.6, 0.3, '#ff0000', 12);

      const serializer = new PersistenceSerializer();
      const serialized = serializer.serialize(objectEngine);

      expect(serialized).toContain('"buses"');
      expect(serialized).toContain('"connectors"');
      expect(serialized).toContain('"annotations"');
      expect(serialized).toContain('"netClasses"');

      const destEngine = new ObjectEngine('dest-proj', 'Dest Project');
      const deserializer = new PersistenceDeserializer();
      const result = deserializer.deserialize(serialized, destEngine);

      expect(result.success).toBe(true);
      expect(listBuses().length).toBe(1);
      expect(getBus('b1')?.name).toBe('DATA[0..7]');
      expect(listConnectors().length).toBe(1);
      expect(listAnnotations().length).toBe(1);
      expect(listNetClasses().length).toBe(1);
    });
  });
});
