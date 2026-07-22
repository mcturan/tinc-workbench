/**
 * Physical Design Platform — Integration Test Suite
 * Tests: document model, layers, stackup, objects, geometry, spatial index,
 *        selection, viewport, snapping, rules, persistence, integration.
 */

import { generateUUID } from '../src/utils';
import {
  // Board
  BoardManager,
  createBoardDocument,
  createDefaultUnitSystem,
  createDefaultOrigin,
  // Unit system
  toNm,
  fromNm,
  UNIT_TO_NM,
  // BBox
  bboxWidth,
  bboxHeight,
  bboxCenter,
  bboxContainsPoint,
  bboxIntersects,
  bboxUnion,
  bboxExpand,
  // Transform
  identityTransform,
  // Layers
  createDefaultLayers,
  LayerManager,
  // Stackup
  createDefaultStackup,
  StackupManager,
  // Objects
  createPad,
  createVia,
  createTrack,
  createZone,
  createText,
  createGraphic,
  createDimension,
  createMountingHole,
  createMechanical,
  PhysicalObjectRegistry,
  // Geometry
  pointInCircle,
  pointOnSegment,
  pointToSegmentDistance,
  pointInPolygon,
  segmentsIntersect,
  hitTestObject,
  distancePoints,
  segmentLength,
  segmentMidpoint,
  polygonArea,
  polygonCentroid,
  convexHull,
  rotatePoint,
  computeObjectBBox,
  bboxArea,
  bboxFromPoints,
  // Spatial
  QuadTree,
  SpatialIndex,
  // Selection
  PhysicalSelectionEngine,
  defaultSelectionFilter,
  // Viewport
  PhysicalViewportManager,
  createDefaultGrid,
  computeGridRenderData,
  // Snapping
  PhysicalSnappingEngine,
  defaultSnapConfig,
  // Rules
  PhysicalRuleManager,
  createClearanceRule,
  createTrackWidthRule,
  createViaSizeRule,
  createHoleSizeRule,
  createKeepoutRule,
  DEFAULT_NET_CLASS,
  POWER_NET_CLASS,
  HIGH_SPEED_NET_CLASS,
  // Persistence
  PhysicalDesignSerializer,
  PhysicalDesignPersistenceManager,
  // Integration
  buildExplorerTree,
  getObjectProperties,
  getLayerProperties,
  buildAIContext,
  describeBoard,
} from '../src/physical-design';

// ─────────────────────────────────────────────────────────────────────────────
// PART 1 — Unit System & BBox
// ─────────────────────────────────────────────────────────────────────────────
describe('PART 1 — Unit System', () => {
  it('converts mm to nm correctly', () => {
    expect(toNm(1, 'mm')).toBe(1_000_000);
    expect(toNm(0.1, 'mm')).toBe(100_000);
    expect(toNm(25.4, 'mm')).toBe(25_400_000);
  });

  it('converts mil to nm correctly', () => {
    expect(toNm(1, 'mil')).toBe(25_400);
    expect(toNm(100, 'mil')).toBe(2_540_000);
  });

  it('converts inch to nm correctly', () => {
    expect(toNm(1, 'inch')).toBe(25_400_000);
  });

  it('converts um to nm correctly', () => {
    expect(toNm(1, 'um')).toBe(1_000);
  });

  it('fromNm round-trips mm', () => {
    const val = 5_000_000;
    expect(fromNm(val, 'mm')).toBeCloseTo(5, 6);
  });

  it('fromNm round-trips mil', () => {
    expect(fromNm(25_400, 'mil')).toBeCloseTo(1, 5);
  });

  it('createDefaultUnitSystem has correct fields', () => {
    const u = createDefaultUnitSystem();
    expect(u.primary).toBe('mm');
    expect(u.internalUnit).toBe('nm');
    expect(u.precision).toBeGreaterThan(0);
  });
});

describe('PART 1 — BBox utilities', () => {
  const bbox = { minX: 0, minY: 0, maxX: 100, maxY: 200 };

  it('bboxWidth', () => expect(bboxWidth(bbox)).toBe(100));
  it('bboxHeight', () => expect(bboxHeight(bbox)).toBe(200));
  it('bboxCenter', () => {
    const c = bboxCenter(bbox);
    expect(c.x).toBe(50);
    expect(c.y).toBe(100);
  });
  it('bboxContainsPoint inside', () => expect(bboxContainsPoint(bbox, { x: 50, y: 100 })).toBe(true));
  it('bboxContainsPoint outside', () => expect(bboxContainsPoint(bbox, { x: 200, y: 100 })).toBe(false));
  it('bboxIntersects overlap', () => expect(bboxIntersects(bbox, { minX: 50, minY: 50, maxX: 150, maxY: 150 })).toBe(true));
  it('bboxIntersects no overlap', () => expect(bboxIntersects(bbox, { minX: 200, minY: 200, maxX: 300, maxY: 300 })).toBe(false));
  it('bboxUnion', () => {
    const u = bboxUnion(bbox, { minX: -10, minY: -10, maxX: 50, maxY: 50 });
    expect(u.minX).toBe(-10);
    expect(u.maxX).toBe(100);
  });
  it('bboxExpand', () => {
    const e = bboxExpand(bbox, 10);
    expect(e.minX).toBe(-10);
    expect(e.maxX).toBe(110);
  });
  it('identityTransform defaults', () => {
    const t = identityTransform();
    expect(t.x).toBe(0);
    expect(t.rotation).toBe(0);
    expect(t.mirrorX).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 1 — Physical Document Model (Board)
// ─────────────────────────────────────────────────────────────────────────────
describe('PART 1 — BoardManager', () => {
  let bm: BoardManager;

  beforeEach(() => { bm = new BoardManager(); });

  it('creates a board with default values', () => {
    const board = bm.createBoard({ name: 'Test Board' });
    expect(board.name).toBe('Test Board');
    expect(board.id).toBeTruthy();
    expect(board.uuid).toBeTruthy();
    expect(board.id).not.toBe(board.uuid);
    expect(board.layers.length).toBeGreaterThan(0);
    expect(board.stackup).toBeTruthy();
  });

  it('sets active board correctly', () => {
    const b1 = bm.createBoard({ name: 'B1' });
    const b2 = bm.createBoard({ name: 'B2' });
    bm.setActiveBoard(b2.id);
    expect(bm.getActiveBoard()?.id).toBe(b2.id);
  });

  it('lists all boards', () => {
    bm.createBoard({ name: 'A' });
    bm.createBoard({ name: 'B' });
    expect(bm.listBoards().length).toBe(2);
  });

  it('deletes a board', () => {
    const b = bm.createBoard();
    bm.deleteBoard(b.id);
    expect(bm.getBoard(b.id)).toBeUndefined();
  });

  it('falls back active board after deletion', () => {
    const b1 = bm.createBoard({ name: 'B1' });
    const b2 = bm.createBoard({ name: 'B2' });
    bm.setActiveBoard(b1.id);
    bm.deleteBoard(b1.id);
    expect(bm.getActiveBoard()).not.toBeNull();
  });

  it('updates board metadata', () => {
    const b = bm.createBoard({ name: 'Old' });
    bm.updateBoardMetadata(b.id, { name: 'New', description: 'desc' });
    expect(bm.getBoard(b.id)?.name).toBe('New');
    expect(bm.getBoard(b.id)?.description).toBe('desc');
  });

  it('sets board origin', () => {
    const b = bm.createBoard();
    bm.setOrigin(b.id, 1_000_000, 2_000_000);
    expect(bm.getBoard(b.id)?.origin.x).toBe(1_000_000);
  });

  it('sets unit system', () => {
    const b = bm.createBoard();
    bm.setUnitSystem(b.id, { primary: 'mil', display: 'mil', precision: 2, internalUnit: 'nm' });
    expect(bm.getBoard(b.id)?.unitSystem.primary).toBe('mil');
  });

  it('adds and removes objects', () => {
    const b = bm.createBoard();
    const layerId = b.layers[0].id;
    const pad = createPad({ layerId });
    bm.addObject(b.id, pad);
    expect(bm.getBoard(b.id)!.objects.length).toBe(1);
    bm.removeObject(b.id, pad.id);
    expect(bm.getBoard(b.id)!.objects.length).toBe(0);
  });

  it('computes board bbox', () => {
    const b = bm.createBoard();
    const layerId = b.layers[0].id;
    bm.addObject(b.id, createPad({ layerId, x: 0, y: 0, sizeX: 1_000_000, sizeY: 1_000_000 }));
    bm.addObject(b.id, createPad({ layerId, x: 5_000_000, y: 5_000_000, sizeX: 1_000_000, sizeY: 1_000_000 }));
    const bbox = bm.computeBoardBBox(b.id);
    expect(bbox).not.toBeNull();
    expect(bbox!.maxX).toBeGreaterThan(bbox!.minX);
  });

  it('serializes and deserializes board', () => {
    const b = bm.createBoard({ name: 'SerTest' });
    const json = bm.serializeBoard(b.id);
    const bm2 = new BoardManager();
    const restored = bm2.deserializeBoard(json);
    expect(restored.name).toBe('SerTest');
    expect(restored.id).toBe(b.id);
    expect(restored.uuid).toBe(b.uuid);
  });

  it('clears all boards', () => {
    bm.createBoard();
    bm.createBoard();
    bm.clear();
    expect(bm.listBoards().length).toBe(0);
    expect(bm.getActiveBoard()).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 2 — Layer System
// ─────────────────────────────────────────────────────────────────────────────
describe('PART 2 — LayerManager', () => {
  let lm: LayerManager;

  beforeEach(() => {
    lm = new LayerManager(createDefaultLayers());
  });

  it('creates default layers', () => {
    const layers = createDefaultLayers();
    expect(layers.length).toBeGreaterThan(10);
    expect(layers.some(l => l.name === 'F.Cu')).toBe(true);
    expect(layers.some(l => l.name === 'B.Cu')).toBe(true);
    expect(layers.some(l => l.name === 'Edge.Cuts')).toBe(true);
  });

  it('gets layers by kind', () => {
    const copper = lm.getLayersByKind('copper');
    expect(copper.length).toBeGreaterThan(0);
    copper.forEach(l => expect(l.kind).toBe('copper'));
  });

  it('gets visible layers', () => {
    const all = lm.getAllLayers();
    lm.setVisible(all[0].id, false);
    const visible = lm.getVisibleLayers();
    expect(visible.length).toBe(all.length - 1);
  });

  it('creates custom layer', () => {
    const layer = lm.createLayer({ name: 'My Layer', kind: 'user', side: 'both' });
    expect(lm.getLayer(layer.id)).toBeTruthy();
    expect(lm.getLayerByName('My Layer')).toBeTruthy();
  });

  it('updates layer properties', () => {
    const layer = lm.createLayer({ name: 'Upd', kind: 'user', side: 'both' });
    lm.updateLayer(layer.id, { color: '#FF0000', opacity: 0.5 });
    expect(lm.getLayer(layer.id)?.color).toBe('#FF0000');
    expect(lm.getLayer(layer.id)?.opacity).toBe(0.5);
  });

  it('removes layer', () => {
    const layer = lm.createLayer({ name: 'Del', kind: 'user', side: 'both' });
    lm.removeLayer(layer.id);
    expect(lm.getLayer(layer.id)).toBeUndefined();
  });

  it('sets visible', () => {
    const layer = lm.createLayer({ name: 'V', kind: 'user', side: 'both' });
    lm.setVisible(layer.id, false);
    expect(lm.getLayer(layer.id)?.visible).toBe(false);
    lm.setVisible(layer.id, true);
    expect(lm.getLayer(layer.id)?.visible).toBe(true);
  });

  it('sets locked', () => {
    const layer = lm.createLayer({ name: 'L', kind: 'user', side: 'both' });
    lm.setLocked(layer.id, true);
    expect(lm.getLayer(layer.id)?.locked).toBe(true);
  });

  it('sets color and opacity', () => {
    const layer = lm.createLayer({ name: 'C', kind: 'user', side: 'both' });
    lm.setColor(layer.id, '#ABCDEF');
    lm.setOpacity(layer.id, 0.7);
    expect(lm.getLayer(layer.id)?.color).toBe('#ABCDEF');
    expect(lm.getLayer(layer.id)?.opacity).toBe(0.7);
  });

  it('clamps opacity between 0 and 1', () => {
    const layer = lm.createLayer({ name: 'O', kind: 'user', side: 'both' });
    lm.setOpacity(layer.id, 2.0);
    expect(lm.getLayer(layer.id)?.opacity).toBe(1.0);
    lm.setOpacity(layer.id, -0.5);
    expect(lm.getLayer(layer.id)?.opacity).toBe(0.0);
  });

  it('creates and retrieves layer groups', () => {
    const layers = lm.getAllLayers();
    const g = lm.createGroup('My Group', [layers[0].id, layers[1].id]);
    expect(lm.getGroup(g.id)).toBeTruthy();
    expect(lm.getGroup(g.id)?.layerIds).toHaveLength(2);
  });

  it('setGroupVisible sets all layers in group', () => {
    const layers = lm.getAllLayers();
    const g = lm.createGroup('G', [layers[0].id, layers[1].id]);
    lm.setGroupVisible(g.id, false);
    expect(lm.getLayer(layers[0].id)?.visible).toBe(false);
    expect(lm.getLayer(layers[1].id)?.visible).toBe(false);
  });

  it('creates and applies preset', () => {
    const layers = lm.getAllLayers();
    const preset = lm.capturePreset('test', 'Test preset');
    // Hide all
    layers.forEach(l => lm.setVisible(l.id, false));
    // Apply preset
    lm.applyPreset('test');
    // All should be visible again
    const visibleCount = lm.getVisibleLayers().length;
    expect(visibleCount).toBeGreaterThan(0);
  });

  it('serializes and deserializes', () => {
    const data = lm.serialize();
    const lm2 = LayerManager.deserialize(data);
    expect(lm2.getAllLayers().length).toBe(lm.getAllLayers().length);
  });

  it('reorders layers', () => {
    const layers = lm.getAllLayers();
    const ids = layers.map(l => l.id).reverse();
    lm.reorder(ids);
    const reordered = lm.getAllLayers();
    expect(reordered[0].id).toBe(ids[0]);
  });

  it('moves layer up', () => {
    const layers = lm.getAllLayers();
    const second = layers[1];
    lm.moveLayerUp(second.id);
    const updated = lm.getAllLayers();
    expect(updated[0].id).toBe(second.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 3 — Board Stackup
// ─────────────────────────────────────────────────────────────────────────────
describe('PART 3 — StackupManager', () => {
  let sm: StackupManager;

  beforeEach(() => {
    const layers = createDefaultLayers();
    const stackup = createDefaultStackup(layers);
    sm = new StackupManager(stackup);
  });

  it('has copper layers', () => {
    expect(sm.getCopperLayerCount()).toBeGreaterThanOrEqual(2);
  });

  it('total thickness is positive', () => {
    expect(sm.getTotalThicknessUm()).toBeGreaterThan(0);
    expect(sm.getTotalThicknessMm()).toBeGreaterThan(0);
  });

  it('gets layer by name', () => {
    const layer = sm.getLayerByName('F.Cu');
    expect(layer).toBeTruthy();
    expect(layer?.materialType).toBe('copper');
  });

  it('updates layer thickness', () => {
    const stackup = sm.getStackup();
    const layer = stackup.layers[0];
    const origThickness = stackup.totalThicknessUm;
    sm.updateLayerThickness(layer.id, layer.thicknessUm + 100);
    expect(sm.getTotalThicknessUm()).toBe(origThickness + 100);
  });

  it('updates layer material', () => {
    const stackup = sm.getStackup();
    const coreLayer = stackup.layers.find(l => l.materialType === 'core');
    if (coreLayer) {
      sm.updateLayerMaterial(coreLayer.id, 'Rogers 4003C', 3.55, 0.0027);
      const updated = sm.getLayerByName(coreLayer.name);
      expect(updated?.material).toBe('Rogers 4003C');
      expect(updated?.dielectricConstant).toBe(3.55);
    }
  });

  it('sets IPC class', () => {
    sm.setIpcClass('3');
    expect(sm.getStackup().ipcClass).toBe('3');
  });

  it('sets surface finish', () => {
    sm.setSurfaceFinish('ENIG');
    expect(sm.getStackup().surfaceFinish).toBe('ENIG');
    expect(sm.getStackup().finishType).toBe('ENIG');
  });

  it('stores impedance metadata', () => {
    const stackup = sm.getStackup();
    const copperLayer = stackup.layers.find(l => l.materialType === 'copper');
    if (copperLayer) {
      sm.setImpedanceMetadata(copperLayer.id, 50);
      expect(sm.getImpedanceMetadata(copperLayer.id)).toBe(50);
    }
  });

  it('serializes and deserializes', () => {
    const data = sm.serialize();
    const sm2 = StackupManager.deserialize(data);
    expect(sm2.getCopperLayerCount()).toBe(sm.getCopperLayerCount());
    expect(sm2.getTotalThicknessUm()).toBe(sm.getTotalThicknessUm());
  });

  it('adds a new stackup layer', () => {
    const initial = sm.getStackup().layers.length;
    sm.addLayer({ id: generateUUID(), name: 'Extra', materialType: 'copper', thicknessUm: 35 });
    expect(sm.getStackup().layers.length).toBe(initial + 1);
  });

  it('removes a stackup layer', () => {
    const layer = sm.getStackup().layers[0];
    const initial = sm.getStackup().layers.length;
    sm.removeLayer(layer.id);
    expect(sm.getStackup().layers.length).toBe(initial - 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 4 — Physical Object Model
// ─────────────────────────────────────────────────────────────────────────────
describe('PART 4 — Physical Objects', () => {
  const layerId = 'test-layer';

  describe('Pads', () => {
    it('creates SMD pad', () => {
      const pad = createPad({ layerId, padType: 'smd', padShape: 'circle', sizeX: 1_000_000, sizeY: 1_000_000 });
      expect(pad.kind).toBe('pad');
      expect(pad.padType).toBe('smd');
      expect(pad.padShape).toBe('circle');
      expect(pad.id).toBeTruthy();
      expect(pad.bbox).toBeTruthy();
    });

    it('creates thru-hole pad', () => {
      const pad = createPad({ layerId, padType: 'thru-hole', drillDiameter: 600_000, sizeX: 1_200_000, sizeY: 1_200_000 });
      expect(pad.drillDiameter).toBe(600_000);
    });

    it('pad bbox is correct', () => {
      const pad = createPad({ layerId, x: 0, y: 0, sizeX: 2_000_000, sizeY: 2_000_000 });
      expect(pad.bbox!.minX).toBe(-1_000_000);
      expect(pad.bbox!.maxX).toBe(1_000_000);
      expect(pad.bbox!.minY).toBe(-1_000_000);
    });

    it('pad has UUID and default properties', () => {
      const pad = createPad({ layerId });
      expect(pad.visible).toBe(true);
      expect(pad.locked).toBe(false);
      expect(pad.selected).toBe(false);
    });
  });

  describe('Vias', () => {
    it('creates via', () => {
      const via = createVia({ layerId, x: 5_000_000, y: 3_000_000, diameter: 800_000, drillDiameter: 400_000 });
      expect(via.kind).toBe('via');
      expect(via.diameter).toBe(800_000);
      expect(via.drillDiameter).toBe(400_000);
      expect(via.bbox).toBeTruthy();
    });

    it('via bbox is symmetric around center', () => {
      const via = createVia({ layerId, x: 0, y: 0, diameter: 1_000_000, drillDiameter: 500_000 });
      expect(via.bbox!.minX).toBe(-500_000);
      expect(via.bbox!.maxX).toBe(500_000);
    });

    it('creates micro via', () => {
      const via = createVia({ layerId, viaType: 'micro', diameter: 200_000, drillDiameter: 100_000 });
      expect(via.viaType).toBe('micro');
    });
  });

  describe('Tracks', () => {
    it('creates track', () => {
      const t = createTrack({ layerId, startX: 0, startY: 0, endX: 10_000_000, endY: 0, width: 250_000 });
      expect(t.kind).toBe('track');
      expect(t.width).toBe(250_000);
      expect(t.bbox).toBeTruthy();
    });

    it('track bbox includes width padding', () => {
      const t = createTrack({ layerId, startX: 0, startY: 0, endX: 10_000_000, endY: 0, width: 500_000 });
      expect(t.bbox!.minY).toBe(-250_000);
      expect(t.bbox!.maxY).toBe(250_000);
    });

    it('diagonal track bbox is correct', () => {
      const t = createTrack({ layerId, startX: 0, startY: 0, endX: 5_000_000, endY: 5_000_000, width: 200_000 });
      expect(t.bbox!.maxX).toBeGreaterThan(0);
      expect(t.bbox!.maxY).toBeGreaterThan(0);
    });
  });

  describe('Zones', () => {
    it('creates copper zone', () => {
      const z = createZone({
        layerId,
        zoneType: 'copper-fill',
        outlinePoints: [{ x: 0, y: 0 }, { x: 10_000_000, y: 0 }, { x: 10_000_000, y: 10_000_000 }, { x: 0, y: 10_000_000 }],
        netId: 'GND',
      });
      expect(z.kind).toBe('zone');
      expect(z.netId).toBe('GND');
      expect(z.bbox).toBeTruthy();
    });

    it('creates keepout zone', () => {
      const z = createZone({ layerId, zoneType: 'keepout', outlinePoints: [{ x: 0, y: 0 }, { x: 5_000_000, y: 0 }, { x: 5_000_000, y: 5_000_000 }] });
      expect(z.zoneType).toBe('keepout');
    });
  });

  describe('Text', () => {
    it('creates text object', () => {
      const t = createText({ layerId, text: 'R1', textType: 'reference', fontSizeUm: 1000 });
      expect(t.kind).toBe('text');
      expect(t.text).toBe('R1');
      expect(t.textType).toBe('reference');
    });
  });

  describe('Graphics', () => {
    it('creates line graphic', () => {
      const g = createGraphic({ layerId, shape: 'line', startX: 0, startY: 0, endX: 5_000_000, endY: 0, width: 100_000 });
      expect(g.kind).toBe('graphic');
      expect(g.shape).toBe('line');
      expect(g.bbox).toBeTruthy();
    });

    it('creates circle graphic', () => {
      const g = createGraphic({ layerId, shape: 'circle', centerX: 0, centerY: 0, radius: 2_000_000, width: 100_000 });
      expect(g.shape).toBe('circle');
      expect(g.bbox!.maxX).toBe(2_000_000 + 50_000); // radius + half stroke
    });

    it('creates polygon graphic', () => {
      const pts = [{ x: 0, y: 0 }, { x: 1e6, y: 0 }, { x: 0.5e6, y: 1e6 }];
      const g = createGraphic({ layerId, shape: 'polygon', points: pts, width: 50_000 });
      expect(g.shape).toBe('polygon');
    });
  });

  describe('Dimensions', () => {
    it('creates dimension', () => {
      const d = createDimension({ layerId, dimensionType: 'aligned', startX: 0, startY: 0, endX: 10_000_000, endY: 0 });
      expect(d.kind).toBe('dimension');
      expect(d.dimensionType).toBe('aligned');
    });
  });

  describe('Mounting Holes', () => {
    it('creates mounting hole', () => {
      const mh = createMountingHole({ layerId, x: 0, y: 0, drillDiameter: 3_200_000, padDiameter: 6_400_000 });
      expect(mh.kind).toBe('mounting-hole');
      expect(mh.drillDiameter).toBe(3_200_000);
      expect(mh.bbox!.maxX).toBe(3_200_000);
    });
  });

  describe('Mechanical Objects', () => {
    it('creates mechanical', () => {
      const m = createMechanical({ layerId, shape: 'line', width: 100_000 });
      expect(m.kind).toBe('mechanical');
    });
  });
});

describe('PART 4 — PhysicalObjectRegistry', () => {
  let reg: PhysicalObjectRegistry;
  const layerId = 'L1';

  beforeEach(() => { reg = new PhysicalObjectRegistry(); });

  it('adds and retrieves objects', () => {
    const pad = createPad({ layerId });
    reg.add(pad);
    expect(reg.get(pad.id)?.id).toBe(pad.id);
  });

  it('throws on ID collision', () => {
    const pad = createPad({ layerId });
    reg.add(pad);
    expect(() => reg.add(pad)).toThrow();
  });

  it('updates object', () => {
    const pad = createPad({ layerId });
    reg.add(pad);
    reg.update(pad.id, { locked: true });
    expect(reg.get(pad.id)?.locked).toBe(true);
  });

  it('removes object', () => {
    const pad = createPad({ layerId });
    reg.add(pad);
    reg.remove(pad.id);
    expect(reg.get(pad.id)).toBeUndefined();
  });

  it('getByLayer filters correctly', () => {
    reg.add(createPad({ layerId: 'L1' }));
    reg.add(createPad({ layerId: 'L2' }));
    reg.add(createTrack({ layerId: 'L1' }));
    expect(reg.getByLayer('L1').length).toBe(2);
    expect(reg.getByLayer('L2').length).toBe(1);
  });

  it('getByKind filters correctly', () => {
    reg.add(createPad({ layerId }));
    reg.add(createPad({ layerId }));
    reg.add(createTrack({ layerId }));
    expect(reg.getByKind('pad').length).toBe(2);
    expect(reg.getByKind('track').length).toBe(1);
  });

  it('getByNet filters correctly', () => {
    reg.add(createPad({ layerId, netId: 'VCC' }));
    reg.add(createPad({ layerId, netId: 'GND' }));
    expect(reg.getByNet('VCC').length).toBe(1);
  });

  it('count returns correct number', () => {
    reg.add(createPad({ layerId }));
    reg.add(createVia({ layerId }));
    expect(reg.count()).toBe(2);
  });

  it('serializes registry', () => {
    reg.add(createPad({ layerId }));
    reg.add(createTrack({ layerId }));
    const data = reg.serialize();
    expect(data.objects.length).toBe(2);
  });

  it('footprint operations', () => {
    const fp = {
      id: 'fp1',
      definitionId: 'def1',
      reference: 'U1',
      value: 'IC',
      transform: identityTransform(),
      layerId: 'L1',
      locked: false,
      selected: false,
      netIds: {},
    };
    reg.addFootprint(fp);
    expect(reg.getFootprint('fp1')).toBeTruthy();
    expect(reg.getFootprintByReference('U1')).toBeTruthy();
    expect(reg.getAllFootprints().length).toBe(1);
    reg.removeFootprint('fp1');
    expect(reg.getAllFootprints().length).toBe(0);
  });

  it('clears registry', () => {
    reg.add(createPad({ layerId }));
    reg.clear();
    expect(reg.count()).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 5 — Geometry Framework
// ─────────────────────────────────────────────────────────────────────────────
describe('PART 5 — Geometry Framework', () => {
  it('pointInCircle: inside', () => {
    expect(pointInCircle({ x: 0, y: 0 }, { x: 0, y: 0 }, 100)).toBe(true);
    expect(pointInCircle({ x: 50, y: 0 }, { x: 0, y: 0 }, 100)).toBe(true);
  });

  it('pointInCircle: outside', () => {
    expect(pointInCircle({ x: 200, y: 0 }, { x: 0, y: 0 }, 100)).toBe(false);
  });

  it('pointToSegmentDistance: on segment', () => {
    const d = pointToSegmentDistance({ x: 5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(d).toBeCloseTo(0);
  });

  it('pointToSegmentDistance: off segment', () => {
    const d = pointToSegmentDistance({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(d).toBeCloseTo(5);
  });

  it('pointToSegmentDistance: zero-length segment', () => {
    const d = pointToSegmentDistance({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 });
    expect(d).toBeCloseTo(5);
  });

  it('pointOnSegment: on track', () => {
    expect(pointOnSegment({ x: 5, y: 0 }, { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } }, 1)).toBe(true);
  });

  it('pointOnSegment: off track', () => {
    expect(pointOnSegment({ x: 5, y: 10 }, { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } }, 1)).toBe(false);
  });

  it('pointInPolygon: inside triangle', () => {
    const poly = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }];
    expect(pointInPolygon({ x: 5, y: 3 }, poly)).toBe(true);
  });

  it('pointInPolygon: outside triangle', () => {
    const poly = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }];
    expect(pointInPolygon({ x: 15, y: 3 }, poly)).toBe(false);
  });

  it('segmentsIntersect: crossing', () => {
    expect(segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 10, y: 0 }, { x: 0, y: 10 })).toBe(true);
  });

  it('segmentsIntersect: parallel', () => {
    expect(segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 })).toBe(false);
  });

  it('distancePoints', () => {
    expect(distancePoints({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('segmentLength', () => {
    expect(segmentLength({ start: { x: 0, y: 0 }, end: { x: 3, y: 4 } })).toBe(5);
  });

  it('segmentMidpoint', () => {
    const mid = segmentMidpoint({ start: { x: 0, y: 0 }, end: { x: 10, y: 10 } });
    expect(mid.x).toBe(5);
    expect(mid.y).toBe(5);
  });

  it('polygonArea: unit square', () => {
    const sq = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    expect(polygonArea(sq)).toBeCloseTo(1);
  });

  it('polygonCentroid: unit square', () => {
    const sq = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }];
    const c = polygonCentroid(sq);
    expect(c.x).toBeCloseTo(1);
    expect(c.y).toBeCloseTo(1);
  });

  it('convexHull: produces hull', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 5, y: 5 }];
    const hull = convexHull(pts);
    expect(hull.length).toBe(4); // inner point removed
  });

  it('rotatePoint: 90 degrees', () => {
    const p = rotatePoint({ x: 1, y: 0 }, { x: 0, y: 0 }, 90);
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.y).toBeCloseTo(1, 5);
  });

  it('hitTestObject: pad circle', () => {
    const pad = createPad({ layerId: 'L', x: 0, y: 0, sizeX: 1_000_000, sizeY: 1_000_000, padShape: 'circle' });
    expect(hitTestObject(pad, { x: 0, y: 0 }, 100)).toBe(true);
    expect(hitTestObject(pad, { x: 2_000_000, y: 0 }, 100)).toBe(false);
  });

  it('hitTestObject: track', () => {
    const t = createTrack({ layerId: 'L', startX: 0, startY: 0, endX: 10_000_000, endY: 0, width: 500_000 });
    expect(hitTestObject(t, { x: 5_000_000, y: 0 }, 100)).toBe(true);
    expect(hitTestObject(t, { x: 5_000_000, y: 10_000_000 }, 100)).toBe(false);
  });

  it('hitTestObject: via', () => {
    const v = createVia({ layerId: 'L', x: 0, y: 0, diameter: 1_000_000, drillDiameter: 500_000 });
    expect(hitTestObject(v, { x: 0, y: 0 }, 100)).toBe(true);
    expect(hitTestObject(v, { x: 2_000_000, y: 0 }, 100)).toBe(false);
  });

  it('hitTestObject: mounting hole', () => {
    const mh = createMountingHole({ layerId: 'L', x: 0, y: 0, drillDiameter: 3_200_000, padDiameter: 6_400_000 });
    expect(hitTestObject(mh, { x: 0, y: 0 }, 100)).toBe(true);
  });

  it('bboxArea', () => {
    expect(bboxArea({ minX: 0, minY: 0, maxX: 10, maxY: 5 })).toBe(50);
  });

  it('bboxFromPoints', () => {
    const pts = [{ x: 0, y: 5 }, { x: 10, y: 0 }, { x: -5, y: 8 }];
    const b = bboxFromPoints(pts);
    expect(b.minX).toBe(-5);
    expect(b.maxX).toBe(10);
    expect(b.minY).toBe(0);
    expect(b.maxY).toBe(8);
  });

  it('computeObjectBBox: zone', () => {
    const z = createZone({
      layerId: 'L',
      outlinePoints: [{ x: 0, y: 0 }, { x: 5_000_000, y: 0 }, { x: 5_000_000, y: 5_000_000 }, { x: 0, y: 5_000_000 }],
    });
    const bbox = computeObjectBBox(z);
    expect(bbox?.maxX).toBe(5_000_000);
    expect(bbox?.maxY).toBe(5_000_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 6 — Spatial Index
// ─────────────────────────────────────────────────────────────────────────────
describe('PART 6 — QuadTree', () => {
  let qt: QuadTree;

  beforeEach(() => {
    qt = new QuadTree({ minX: -1e9, minY: -1e9, maxX: 1e9, maxY: 1e9 });
  });

  it('inserts and retrieves entry', () => {
    const entry = { id: 'e1', bbox: { minX: 0, minY: 0, maxX: 100, maxY: 100 }, layerId: 'L' };
    qt.upsert(entry);
    expect(qt.has('e1')).toBe(true);
    expect(qt.get('e1')).toBeTruthy();
  });

  it('queries overlapping box', () => {
    qt.upsert({ id: 'e1', bbox: { minX: 0, minY: 0, maxX: 100, maxY: 100 }, layerId: 'L' });
    qt.upsert({ id: 'e2', bbox: { minX: 200, minY: 200, maxX: 300, maxY: 300 }, layerId: 'L' });
    const results = qt.query({ minX: -10, minY: -10, maxX: 150, maxY: 150 });
    expect(results.map(r => r.id)).toContain('e1');
    expect(results.map(r => r.id)).not.toContain('e2');
  });

  it('removes entry', () => {
    qt.upsert({ id: 'e1', bbox: { minX: 0, minY: 0, maxX: 100, maxY: 100 }, layerId: 'L' });
    qt.remove('e1');
    expect(qt.has('e1')).toBe(false);
  });

  it('upserts (updates) existing entry', () => {
    qt.upsert({ id: 'e1', bbox: { minX: 0, minY: 0, maxX: 100, maxY: 100 }, layerId: 'L' });
    qt.upsert({ id: 'e1', bbox: { minX: 500, minY: 500, maxX: 600, maxY: 600 }, layerId: 'L' });
    const results = qt.query({ minX: 490, minY: 490, maxX: 610, maxY: 610 });
    expect(results.some(r => r.id === 'e1')).toBe(true);
  });

  it('queryPoint finds entry', () => {
    qt.upsert({ id: 'e1', bbox: { minX: 0, minY: 0, maxX: 100, maxY: 100 }, layerId: 'L' });
    const results = qt.queryPoint({ x: 50, y: 50 });
    expect(results.some(r => r.id === 'e1')).toBe(true);
  });

  it('handles many insertions', () => {
    for (let i = 0; i < 100; i++) {
      qt.upsert({ id: `e${i}`, bbox: { minX: i * 100, minY: 0, maxX: i * 100 + 50, maxY: 50 }, layerId: 'L' });
    }
    expect(qt.size()).toBe(100);
    const results = qt.query({ minX: 0, minY: -10, maxX: 10_050, maxY: 60 });
    expect(results.length).toBe(100);
  });

  it('clear empties tree', () => {
    qt.upsert({ id: 'e1', bbox: { minX: 0, minY: 0, maxX: 100, maxY: 100 }, layerId: 'L' });
    qt.clear();
    expect(qt.size()).toBe(0);
  });
});

describe('PART 6 — SpatialIndex', () => {
  let si: SpatialIndex;

  beforeEach(() => { si = new SpatialIndex(); });

  it('upserts and queries', () => {
    si.upsert({ id: 'a', bbox: { minX: 0, minY: 0, maxX: 100, maxY: 100 }, layerId: 'L1' });
    const results = si.queryBox({ minX: -10, minY: -10, maxX: 200, maxY: 200 });
    expect(results.some(r => r.id === 'a')).toBe(true);
  });

  it('queryByLayer filters by layer', () => {
    si.upsert({ id: 'a', bbox: { minX: 0, minY: 0, maxX: 100, maxY: 100 }, layerId: 'L1' });
    si.upsert({ id: 'b', bbox: { minX: 0, minY: 0, maxX: 100, maxY: 100 }, layerId: 'L2' });
    const r = si.queryBoxByLayer({ minX: -10, minY: -10, maxX: 200, maxY: 200 }, 'L1');
    expect(r.length).toBe(1);
    expect(r[0].id).toBe('a');
  });

  it('queryPoint returns candidates', () => {
    si.upsert({ id: 'a', bbox: { minX: 0, minY: 0, maxX: 100, maxY: 100 }, layerId: 'L1' });
    const r = si.queryPoint({ x: 50, y: 50 });
    expect(r.some(x => x.id === 'a')).toBe(true);
  });

  it('remove works', () => {
    si.upsert({ id: 'a', bbox: { minX: 0, minY: 0, maxX: 100, maxY: 100 }, layerId: 'L1' });
    si.remove('a', 'L1');
    expect(si.has('a')).toBe(false);
  });

  it('collisionCandidates respects clearance', () => {
    si.upsert({ id: 'a', bbox: { minX: 100, minY: 100, maxX: 200, maxY: 200 }, layerId: 'L1' });
    const r = si.collisionCandidates({ minX: 250, minY: 250, maxX: 300, maxY: 300 }, 100);
    expect(r.some(x => x.id === 'a')).toBe(true);
  });

  it('queryNearest returns closest first', () => {
    si.upsert({ id: 'close', bbox: { minX: 5, minY: 5, maxX: 15, maxY: 15 }, layerId: 'L1' });
    si.upsert({ id: 'far', bbox: { minX: 500, minY: 500, maxX: 600, maxY: 600 }, layerId: 'L1' });
    const r = si.queryNearest({ x: 10, y: 10 }, 1, 1000);
    expect(r[0].id).toBe('close');
  });

  it('rebuild works', () => {
    si.upsert({ id: 'old', bbox: { minX: 0, minY: 0, maxX: 10, maxY: 10 }, layerId: 'L1' });
    si.rebuild([{ id: 'new', bbox: { minX: 0, minY: 0, maxX: 10, maxY: 10 }, layerId: 'L1' }]);
    expect(si.has('old')).toBe(false);
    expect(si.has('new')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 7 — Selection Framework
// ─────────────────────────────────────────────────────────────────────────────
describe('PART 7 — PhysicalSelectionEngine', () => {
  const layerId = 'L1';
  let reg: PhysicalObjectRegistry;
  let si: SpatialIndex;
  let sel: PhysicalSelectionEngine;

  beforeEach(() => {
    reg = new PhysicalObjectRegistry();
    si = new SpatialIndex();
    sel = new PhysicalSelectionEngine((id) => reg.get(id), si);

    const pad = createPad({ layerId, x: 0, y: 0, sizeX: 1_000_000, sizeY: 1_000_000 });
    reg.add(pad);
    si.upsert({ id: pad.id, bbox: pad.bbox!, layerId });

    const track = createTrack({ layerId, startX: 5_000_000, startY: 0, endX: 15_000_000, endY: 0, width: 250_000 });
    reg.add(track);
    si.upsert({ id: track.id, bbox: track.bbox!, layerId });
  });

  it('selects single object', () => {
    const [pad] = reg.getByKind('pad');
    expect(sel.selectSingle(pad.id)).toBe(true);
    expect(sel.isSelected(pad.id)).toBe(true);
    expect(sel.getSelectionCount()).toBe(1);
  });

  it('clears previous selection on non-additive select', () => {
    const [pad] = reg.getByKind('pad');
    const [track] = reg.getByKind('track');
    sel.selectSingle(pad.id);
    sel.selectSingle(track.id);
    expect(sel.isSelected(pad.id)).toBe(false);
    expect(sel.isSelected(track.id)).toBe(true);
  });

  it('additive select keeps previous', () => {
    const [pad] = reg.getByKind('pad');
    const [track] = reg.getByKind('track');
    sel.selectSingle(pad.id);
    sel.selectSingle(track.id, true);
    expect(sel.isSelected(pad.id)).toBe(true);
    expect(sel.isSelected(track.id)).toBe(true);
    expect(sel.getSelectionCount()).toBe(2);
  });

  it('deselect removes one', () => {
    const [pad] = reg.getByKind('pad');
    sel.selectSingle(pad.id);
    sel.deselect(pad.id);
    expect(sel.isSelected(pad.id)).toBe(false);
  });

  it('clearSelection empties selection', () => {
    const [pad] = reg.getByKind('pad');
    sel.selectSingle(pad.id);
    sel.clearSelection();
    expect(sel.isEmpty()).toBe(true);
  });

  it('toggleSelection: select then deselect', () => {
    const [pad] = reg.getByKind('pad');
    sel.toggleSelection(pad.id);
    expect(sel.isSelected(pad.id)).toBe(true);
    sel.toggleSelection(pad.id);
    expect(sel.isSelected(pad.id)).toBe(false);
  });

  it('selectMultiple selects all valid ids', () => {
    const ids = reg.getAll().map(o => o.id);
    const added = sel.selectMultiple(ids);
    expect(added.length).toBe(ids.length);
    expect(sel.getSelectionCount()).toBe(ids.length);
  });

  it('box selection returns objects in box', () => {
    sel.beginBoxSelect({ x: -2_000_000, y: -2_000_000 });
    sel.updateBoxSelect({ x: 2_000_000, y: 2_000_000 });
    const ids = sel.commitBoxSelect();
    const [pad] = reg.getByKind('pad');
    expect(ids).toContain(pad.id);
  });

  it('cancelBoxSelect resets state', () => {
    sel.beginBoxSelect({ x: 0, y: 0 });
    sel.cancelBoxSelect();
    expect(sel.getBoxSelectRect()).toBeNull();
  });

  it('filter excludes locked objects', () => {
    const [pad] = reg.getByKind('pad');
    reg.update(pad.id, { locked: true });
    expect(sel.selectSingle(pad.id)).toBe(false);
  });

  it('setFilter allows locked', () => {
    const [pad] = reg.getByKind('pad');
    reg.update(pad.id, { locked: true });
    sel.setFilter({ includeLocked: true });
    expect(sel.selectSingle(pad.id)).toBe(true);
  });

  it('getPrimaryId is first selected', () => {
    const [pad] = reg.getByKind('pad');
    sel.selectSingle(pad.id);
    expect(sel.getPrimaryId()).toBe(pad.id);
  });

  it('creates and selects groups', () => {
    const ids = reg.getAll().map(o => o.id);
    sel.selectMultiple(ids);
    const g = sel.createGroup('my-group');
    sel.clearSelection();
    sel.selectGroup(g.id);
    expect(sel.getSelectionCount()).toBe(ids.length);
  });

  it('removes group', () => {
    const g = sel.createGroup('g', []);
    sel.removeGroup(g.id);
    expect(sel.getGroup(g.id)).toBeUndefined();
  });

  it('hover state', () => {
    const [pad] = reg.getByKind('pad');
    sel.setHovered(pad.id);
    expect(sel.getHoveredId()).toBe(pad.id);
    sel.setHovered(null);
    expect(sel.getHoveredId()).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 8 — Viewport Framework
// ─────────────────────────────────────────────────────────────────────────────
describe('PART 8 — PhysicalViewportManager', () => {
  let vp: PhysicalViewportManager;

  beforeEach(() => { vp = new PhysicalViewportManager(800, 600); });

  it('worldToScreen: origin maps to center', () => {
    const screen = vp.worldToScreen({ x: 0, y: 0 });
    expect(screen.x).toBeCloseTo(400);
    expect(screen.y).toBeCloseTo(300);
  });

  it('screenToWorld: center maps to origin', () => {
    const world = vp.screenToWorld({ x: 400, y: 300 });
    expect(world.x).toBeCloseTo(0);
    expect(world.y).toBeCloseTo(0);
  });

  it('worldToScreen/screenToWorld round-trip', () => {
    vp.setZoom(1e-4);
    const world = { x: 5_000_000, y: 3_000_000 };
    const screen = vp.worldToScreen(world);
    const back = vp.screenToWorld(screen);
    expect(back.x).toBeCloseTo(world.x, 0);
    expect(back.y).toBeCloseTo(world.y, 0);
  });

  it('pan moves origin', () => {
    vp.panByScreen(100, 0);
    const world = vp.screenToWorld({ x: 400, y: 300 });
    expect(world.x).not.toBe(0);
  });

  it('zoomIn increases zoom', () => {
    const z0 = vp.getZoom();
    vp.zoomIn();
    expect(vp.getZoom()).toBeGreaterThan(z0);
  });

  it('zoomOut decreases zoom', () => {
    vp.setZoom(1e-3); // zoom in first
    const z0 = vp.getZoom();
    vp.zoomOut();
    expect(vp.getZoom()).toBeLessThan(z0);
  });

  it('zoomAtScreenPoint keeps point stable', () => {
    vp.setZoom(1e-5);
    const screenPt = { x: 400, y: 300 };
    const worldBefore = vp.screenToWorld(screenPt);
    vp.zoomAtScreenPoint(2, screenPt);
    const worldAfter = vp.screenToWorld(screenPt);
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, -2);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, -2);
  });

  it('zoomToFit contains bbox', () => {
    const bbox = { minX: 0, minY: 0, maxX: 100_000_000, maxY: 50_000_000 };
    vp.zoomToFit(bbox);
    const visible = vp.getVisibleWorldBBox();
    expect(visible.minX).toBeLessThanOrEqual(0);
    expect(visible.maxX).toBeGreaterThanOrEqual(100_000_000);
  });

  it('getVisibleWorldBBox changes with pan', () => {
    vp.setZoom(1e-5);
    const b1 = vp.getVisibleWorldBBox();
    vp.panByWorld(10_000_000, 0);
    const b2 = vp.getVisibleWorldBBox();
    expect(b2.minX).toBeGreaterThan(b1.minX);
  });

  it('setState/getState roundtrip', () => {
    const state = { panX: 100, panY: 200, zoom: 1e-5, width: 800, height: 600 };
    vp.setState(state);
    const got = vp.getState();
    expect(got.panX).toBe(100);
    expect(got.zoom).toBe(1e-5);
  });

  it('setDimensions updates size', () => {
    vp.setDimensions(1920, 1080);
    expect(vp.getState().width).toBe(1920);
    expect(vp.getState().height).toBe(1080);
  });

  it('worldDistanceToScreen converts correctly', () => {
    vp.setZoom(1e-4);
    expect(vp.worldDistanceToScreen(1_000_000)).toBeCloseTo(100, 1);
  });

  it('centerOn sets pan', () => {
    vp.centerOn({ x: 5_000_000, y: 3_000_000 });
    expect(vp.getState().panX).toBe(5_000_000);
    expect(vp.getState().panY).toBe(3_000_000);
  });
});

describe('PART 8 — Grid', () => {
  it('createDefaultGrid with 0.1 mm spacing', () => {
    const g = createDefaultGrid(0.1);
    expect(g.spacingX).toBe(100_000);
    expect(g.kind).toBe('dots');
    expect(g.visible).toBe(true);
    expect(g.snapEnabled).toBe(true);
  });

  it('computeGridRenderData returns dot positions when visible', () => {
    const vp = new PhysicalViewportManager(800, 600);
    vp.setZoom(1e-4);
    const grid = createDefaultGrid(1); // 1mm grid
    const data = computeGridRenderData(grid, vp);
    expect(data.kind).toBe('dots');
    expect(data.dotPositions.length).toBeGreaterThan(0);
  });

  it('computeGridRenderData returns empty when invisible', () => {
    const vp = new PhysicalViewportManager(800, 600);
    const grid = { ...createDefaultGrid(), visible: false };
    const data = computeGridRenderData(grid, vp);
    expect(data.kind).toBe('none');
    expect(data.dotPositions.length).toBe(0);
  });

  it('computeGridRenderData returns lines for lines grid', () => {
    const vp = new PhysicalViewportManager(800, 600);
    vp.setZoom(1e-4);
    const grid = { ...createDefaultGrid(1), kind: 'lines' as const };
    const data = computeGridRenderData(grid, vp);
    expect(data.kind).toBe('lines');
    expect(data.gridLines.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 9 — Snapping Framework
// ─────────────────────────────────────────────────────────────────────────────
describe('PART 9 — PhysicalSnappingEngine', () => {
  let vp: PhysicalViewportManager;
  let si: SpatialIndex;
  let reg: PhysicalObjectRegistry;
  let snapper: PhysicalSnappingEngine;
  let grid: ReturnType<typeof createDefaultGrid>;

  beforeEach(() => {
    vp = new PhysicalViewportManager(800, 600);
    vp.setZoom(1e-4); // 1e-4 px/nm -> reasonable for testing
    si = new SpatialIndex();
    reg = new PhysicalObjectRegistry();
    snapper = new PhysicalSnappingEngine((id) => reg.get(id), si, vp);
    grid = createDefaultGrid(0.5); // 0.5mm grid
  });

  it('snaps to grid when no objects nearby', () => {
    // Cursor near 500000,0 (0.5mm) — grid spacing 500000nm
    const result = snapper.snap({ x: 490_000, y: 10_000 }, grid);
    expect(result.snapped).toBe(true);
    expect(result.candidate?.type).toBe('grid');
  });

  it('snaps to pad center over grid', () => {
    const pad = createPad({ layerId: 'L', x: 1_000_000, y: 0, sizeX: 500_000, sizeY: 500_000 });
    reg.add(pad);
    si.upsert({ id: pad.id, bbox: pad.bbox!, layerId: 'L' });
    // Cursor very close to pad center
    const result = snapper.snap({ x: 1_005_000, y: 0 }, grid);
    expect(result.snapped).toBe(true);
    // Should prefer pad-center over grid
    expect(result.candidate?.type).toBe('pad-center');
  });

  it('snaps to track endpoint', () => {
    const track = createTrack({ layerId: 'L', startX: 0, startY: 0, endX: 10_000_000, endY: 0, width: 250_000 });
    reg.add(track);
    si.upsert({ id: track.id, bbox: track.bbox!, layerId: 'L' });
    const result = snapper.snap({ x: 5_000, y: 0 }, grid);
    expect(result.snapped).toBe(true);
    if (result.candidate?.type === 'endpoint') {
      expect(result.candidate.point.x).toBe(0);
    }
  });

  it('disabling grid snap returns no snap when no objects', () => {
    snapper.setConfig({ enableGrid: false });
    const result = snapper.snap({ x: 123_456, y: 789 }, { ...grid, snapEnabled: false });
    expect(result.snapped).toBe(false);
  });

  it('snapToGrid snaps to nearest grid point', () => {
    const pt = snapper.snapToGrid({ x: 490_000, y: 10_000 }, grid);
    expect(pt.x).toBe(500_000);
    expect(pt.y).toBe(0);
  });

  it('defaultSnapConfig has correct defaults', () => {
    const cfg = defaultSnapConfig();
    expect(cfg.enableGrid).toBe(true);
    expect(cfg.enablePadCenter).toBe(true);
    expect(cfg.snapRadiusPx).toBeGreaterThan(0);
  });

  it('setLayerFilter restricts snap candidates', () => {
    const pad = createPad({ layerId: 'L2', x: 1_000_000, y: 0, sizeX: 500_000, sizeY: 500_000 });
    reg.add(pad);
    si.upsert({ id: pad.id, bbox: pad.bbox!, layerId: 'L2' });
    snapper.setLayerFilter(['L1']); // only snap L1
    const result = snapper.snap({ x: 1_005_000, y: 0 }, { ...grid, snapEnabled: false });
    // Pad is on L2, should be filtered
    expect(result.candidate?.type).not.toBe('pad-center');
  });

  it('clearLayerFilter removes restriction', () => {
    snapper.setLayerFilter(['L1']);
    snapper.clearLayerFilter();
    expect(snapper.getConfig().layerFilter).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 10 — Physical Rule Framework
// ─────────────────────────────────────────────────────────────────────────────
describe('PART 10 — PhysicalRuleManager', () => {
  let rm: PhysicalRuleManager;

  beforeEach(() => { rm = new PhysicalRuleManager(); });

  it('has default net class', () => {
    const nc = rm.getNetClass('Default');
    expect(nc).toBeTruthy();
    expect(nc?.clearance).toBe(250_000);
  });

  it('adds and retrieves clearance rule', () => {
    const rule = createClearanceRule({ clearanceNm: 300_000 });
    rm.addRule(rule);
    expect(rm.getRule(rule.id)).toBeTruthy();
    expect(rm.getRule(rule.id)?.parameters.clearance).toBe(300_000);
  });

  it('throws on duplicate rule ID', () => {
    const rule = createClearanceRule({ clearanceNm: 200_000 });
    rm.addRule(rule);
    expect(() => rm.addRule(rule)).toThrow();
  });

  it('updates rule', () => {
    const rule = createClearanceRule({ clearanceNm: 200_000 });
    rm.addRule(rule);
    rm.updateRule(rule.id, { parameters: { clearance: 400_000 } });
    expect(rm.getRule(rule.id)?.parameters.clearance).toBe(400_000);
  });

  it('enables and disables rule', () => {
    const rule = createClearanceRule({ clearanceNm: 200_000 });
    rm.addRule(rule);
    rm.disableRule(rule.id);
    expect(rm.getRule(rule.id)?.enabled).toBe(false);
    rm.enableRule(rule.id);
    expect(rm.getRule(rule.id)?.enabled).toBe(true);
  });

  it('getEnabledRules excludes disabled', () => {
    const r1 = createClearanceRule({ clearanceNm: 200_000 });
    const r2 = createClearanceRule({ clearanceNm: 300_000 });
    rm.addRule(r1);
    rm.addRule(r2);
    rm.disableRule(r1.id);
    const enabled = rm.getEnabledRules();
    expect(enabled.some(r => r.id === r1.id)).toBe(false);
    expect(enabled.some(r => r.id === r2.id)).toBe(true);
  });

  it('getRulesByKind filters correctly', () => {
    rm.addRule(createClearanceRule({ clearanceNm: 200_000 }));
    rm.addRule(createTrackWidthRule({ minWidthNm: 150_000 }));
    rm.addRule(createViaSizeRule({ minDiameterNm: 800_000, minDrillNm: 400_000 }));
    expect(rm.getRulesByKind('clearance').length).toBe(1);
    expect(rm.getRulesByKind('track-width').length).toBe(1);
    expect(rm.getRulesByKind('via-size').length).toBe(1);
  });

  it('getEffectiveRules respects priority order', () => {
    const lo = createClearanceRule({ clearanceNm: 100_000, priority: 'low' });
    const hi = createClearanceRule({ clearanceNm: 300_000, priority: 'critical' });
    rm.addRule(lo);
    rm.addRule(hi);
    const rules = rm.getEffectiveRules('clearance');
    expect(rules[0].priority).toBe('critical');
  });

  it('adds net class', () => {
    rm.addNetClass(POWER_NET_CLASS);
    expect(rm.getNetClass('Power')).toBeTruthy();
    expect(rm.getNetClass('Power')?.trackWidth).toBe(500_000);
  });

  it('getClearanceForNet defaults to Default class', () => {
    expect(rm.getClearanceForNet('Nonexistent')).toBe(250_000);
  });

  it('getClearanceForNet uses net class', () => {
    rm.addNetClass(POWER_NET_CLASS);
    expect(rm.getClearanceForNet('Power')).toBe(300_000);
  });

  it('getTrackWidthForNet returns correct value', () => {
    rm.addNetClass(HIGH_SPEED_NET_CLASS);
    expect(rm.getTrackWidthForNet('HighSpeed')).toBe(150_000);
  });

  it('removes net class but not Default', () => {
    rm.addNetClass(POWER_NET_CLASS);
    rm.removeNetClass('Power');
    expect(rm.getNetClass('Power')).toBeUndefined();
    expect(rm.removeNetClass('Default')).toBe(false);
  });

  it('createKeepoutRule has correct params', () => {
    const rule = createKeepoutRule({ noTracks: true, noVias: true, noCopperFill: true });
    expect(rule.kind).toBe('keepout');
    expect(rule.parameters.noTracks).toBe(true);
    expect(rule.priority).toBe('critical');
  });

  it('createHoleSizeRule has correct params', () => {
    const rule = createHoleSizeRule({ minSizeNm: 200_000 });
    expect(rule.kind).toBe('hole-size');
    expect(rule.parameters.minSize).toBe(200_000);
  });

  it('serializes and deserializes', () => {
    rm.addRule(createClearanceRule({ clearanceNm: 200_000 }));
    rm.addNetClass(POWER_NET_CLASS);
    const data = rm.serialize();
    const rm2 = PhysicalRuleManager.deserialize(data);
    expect(rm2.getAllRules().length).toBe(rm.getAllRules().length);
    expect(rm2.getNetClass('Power')).toBeTruthy();
  });

  it('getEffectiveParameter returns highest priority value', () => {
    const lo = createClearanceRule({ clearanceNm: 100_000, priority: 'low' });
    const hi = createClearanceRule({ clearanceNm: 300_000, priority: 'high' });
    rm.addRule(lo);
    rm.addRule(hi);
    const val = rm.getEffectiveParameter('clearance', 'clearance');
    expect(val).toBe(300_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 11 — Persistence
// ─────────────────────────────────────────────────────────────────────────────
describe('PART 11 — PhysicalDesignSerializer', () => {
  let serializer: PhysicalDesignSerializer;
  let board: ReturnType<typeof createBoardDocument>;

  beforeEach(() => {
    serializer = new PhysicalDesignSerializer();
    board = createBoardDocument({ name: 'TestBoard' });
  });

  it('serializes to valid JSON', () => {
    const json = serializer.serialize(board);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('validates valid snapshot', () => {
    const json = serializer.serialize(board);
    const result = serializer.validate(json);
    expect(result.valid).toBe(true);
  });

  it('deserializes back to board', () => {
    const json = serializer.serialize(board);
    const restored = serializer.deserialize(json);
    expect(restored.id).toBe(board.id);
    expect(restored.name).toBe(board.name);
    expect(restored.uuid).toBe(board.uuid);
  });

  it('validate fails on missing boardDocument', () => {
    const r = serializer.validate('{"version":"1.0"}');
    expect(r.valid).toBe(false);
  });

  it('validate fails on invalid JSON', () => {
    const r = serializer.validate('not json');
    expect(r.valid).toBe(false);
  });

  it('validate fails on missing version', () => {
    const r = serializer.validate('{"boardDocument":{"id":"x","uuid":"u","layers":[],"objects":[]}}');
    expect(r.valid).toBe(false);
  });

  it('deserialize throws on wrong version', () => {
    const json = JSON.stringify({ version: '9.9', boardDocument: board });
    expect(() => serializer.deserialize(json)).toThrow();
  });
});

describe('PART 11 — PhysicalDesignPersistenceManager', () => {
  it('save and load round-trip', () => {
    const storage: Record<string, string> = {};
    const bm = new BoardManager();
    const pm = new PhysicalDesignPersistenceManager(bm, {
      getItem: (k) => storage[k] ?? null,
      setItem: (k, v) => { storage[k] = v; },
      removeItem: (k) => { delete storage[k]; },
    });

    bm.createBoard({ name: 'MyBoard' });
    pm.save();
    const bm2 = new BoardManager();
    const pm2 = new PhysicalDesignPersistenceManager(bm2, {
      getItem: (k) => storage[k] ?? null,
      setItem: (k, v) => { storage[k] = v; },
      removeItem: () => {},
    });
    const loaded = pm2.load();
    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe('MyBoard');
  });

  it('embedInProjectFile and extractFromProjectFile', () => {
    const storage: Record<string, string> = {};
    const bm = new BoardManager();
    const pm = new PhysicalDesignPersistenceManager(bm, {
      getItem: (k) => storage[k] ?? null,
      setItem: (k, v) => { storage[k] = v; },
      removeItem: () => {},
    });
    const b = bm.createBoard({ name: 'Embedded' });
    const projectJson = JSON.stringify({ version: '1.0', project: {} });
    const embedded = pm.embedInProjectFile(projectJson, b.id);
    const extracted = pm.extractFromProjectFile(embedded);
    expect(extracted?.name).toBe('Embedded');
  });

  it('returns null when nothing saved', () => {
    const bm = new BoardManager();
    const pm = new PhysicalDesignPersistenceManager(bm, {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    });
    expect(pm.load()).toBeNull();
  });

  it('export returns valid JSON', () => {
    const bm = new BoardManager();
    const pm = new PhysicalDesignPersistenceManager(bm, {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    });
    const b = bm.createBoard({ name: 'Exp' });
    const json = pm.export(b.id);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('import registers board', () => {
    const bm = new BoardManager();
    const pm = new PhysicalDesignPersistenceManager(bm, {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    });
    const serializer = new PhysicalDesignSerializer();
    const board = createBoardDocument({ name: 'Imported' });
    const json = serializer.serialize(board);
    const imported = pm.import(json);
    expect(imported.name).toBe('Imported');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 12 — Project Integration
// ─────────────────────────────────────────────────────────────────────────────
describe('PART 12 — Integration Adapters', () => {
  let board: ReturnType<typeof createBoardDocument>;

  beforeEach(() => {
    board = createBoardDocument({ name: 'IntegTest' });
  });

  it('buildExplorerTree returns tree with board root', () => {
    const tree = buildExplorerTree(board);
    expect(tree.kind).toBe('board');
    expect(tree.label).toBe('IntegTest');
    expect(tree.children).toBeTruthy();
    expect(tree.children!.length).toBeGreaterThan(0);
  });

  it('buildExplorerTree includes layer section', () => {
    const tree = buildExplorerTree(board);
    const layerSection = tree.children!.find(c => c.label === 'Layers');
    expect(layerSection).toBeTruthy();
    expect(layerSection!.children!.length).toBeGreaterThan(0);
  });

  it('buildExplorerTree includes footprint section', () => {
    const tree = buildExplorerTree(board);
    const fpSection = tree.children!.find(c => c.label === 'Footprints');
    expect(fpSection).toBeTruthy();
  });

  it('getObjectProperties returns groups', () => {
    const layerId = board.layers[0].id;
    const pad = createPad({ layerId });
    const groups = getObjectProperties(pad);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].name).toBe('General');
    expect(groups[0].properties.length).toBeGreaterThan(0);
  });

  it('getObjectProperties for track has Track group', () => {
    const layerId = board.layers[0].id;
    const t = createTrack({ layerId });
    const groups = getObjectProperties(t);
    expect(groups.some(g => g.name === 'Track')).toBe(true);
  });

  it('getObjectProperties for via has Via group', () => {
    const layerId = board.layers[0].id;
    const v = createVia({ layerId });
    const groups = getObjectProperties(v);
    expect(groups.some(g => g.name === 'Via')).toBe(true);
  });

  it('getObjectProperties for text has Text group', () => {
    const layerId = board.layers[0].id;
    const t = createText({ layerId, text: 'hi' });
    const groups = getObjectProperties(t);
    expect(groups.some(g => g.name === 'Text')).toBe(true);
  });

  it('getLayerProperties returns Layer group', () => {
    const layer = board.layers[0];
    const groups = getLayerProperties(layer);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].name).toBe('Layer');
    const colorProp = groups[0].properties.find(p => p.key === 'color');
    expect(colorProp).toBeTruthy();
  });

  it('buildAIContext returns summary', () => {
    const ctx = buildAIContext(board);
    expect(ctx.boardSummary).toContain('IntegTest');
    expect(ctx.layerCount).toBeGreaterThan(0);
    expect(ctx.stackupSummary).toContain('layer');
  });

  it('describeBoard returns descriptor', () => {
    const desc = describeBoard(board);
    expect(desc.boardId).toBe(board.id);
    expect(desc.boardName).toBe('IntegTest');
    expect(desc.layerCount).toBeGreaterThan(0);
    expect(desc.copperLayers).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PART 15 — Performance: O(1) UUID lookup, incremental spatial updates
// ─────────────────────────────────────────────────────────────────────────────
describe('PART 15 — Performance characteristics', () => {
  it('O(1) object lookup in registry by UUID', () => {
    const reg = new PhysicalObjectRegistry();
    for (let i = 0; i < 1000; i++) {
      reg.add(createPad({ layerId: 'L' }));
    }
    const target = createPad({ layerId: 'L' });
    reg.add(target);
    const start = Date.now();
    const obj = reg.get(target.id);
    const elapsed = Date.now() - start;
    expect(obj).toBeTruthy();
    expect(elapsed).toBeLessThan(10); // Must be O(1)
  });

  it('spatial index handles 1000+ objects', () => {
    const si = new SpatialIndex();
    const N = 1000;
    for (let i = 0; i < N; i++) {
      si.upsert({
        id: `e${i}`,
        bbox: { minX: i * 100, minY: 0, maxX: i * 100 + 50, maxY: 50 },
        layerId: 'L',
      });
    }
    expect(si.size()).toBe(N);
    const start = Date.now();
    const results = si.queryBox({ minX: 0, minY: -5, maxX: 5000, maxY: 55 });
    const elapsed = Date.now() - start;
    expect(results.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(100); // Spatial query should be fast
  });

  it('incremental spatial index update (upsert)', () => {
    const si = new SpatialIndex();
    si.upsert({ id: 'a', bbox: { minX: 0, minY: 0, maxX: 100, maxY: 100 }, layerId: 'L' });
    si.upsert({ id: 'a', bbox: { minX: 500, minY: 500, maxX: 600, maxY: 600 }, layerId: 'L' });
    const oldResults = si.queryBox({ minX: 0, minY: 0, maxX: 200, maxY: 200 });
    expect(oldResults.some(r => r.id === 'a')).toBe(false);
    const newResults = si.queryBox({ minX: 490, minY: 490, maxX: 610, maxY: 610 });
    expect(newResults.some(r => r.id === 'a')).toBe(true);
  });

  it('board creates quickly', () => {
    const start = Date.now();
    for (let i = 0; i < 50; i++) {
      createBoardDocument({ name: `Board-${i}` });
    }
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration: Full PCB workflow
// ─────────────────────────────────────────────────────────────────────────────
describe('Full PCB workflow integration', () => {
  it('creates board, adds objects, serializes, restores, selects', () => {
    // 1. Create board
    const bm = new BoardManager();
    const board = bm.createBoard({ name: 'PCB-Test' });
    const layerId = board.layers.find(l => l.name === 'F.Cu')!.id;

    // 2. Add objects
    const pad1 = createPad({ layerId, x: 0, y: 0, sizeX: 1_000_000, sizeY: 1_000_000, netId: 'VCC' });
    const pad2 = createPad({ layerId, x: 5_000_000, y: 0, sizeX: 1_000_000, sizeY: 1_000_000, netId: 'GND' });
    const track = createTrack({ layerId, startX: 500_000, startY: 0, endX: 4_500_000, endY: 0, width: 250_000, netId: 'VCC' });
    bm.addObject(board.id, pad1);
    bm.addObject(board.id, pad2);
    bm.addObject(board.id, track);

    // 3. Serialize
    const json = bm.serializeBoard(board.id);
    expect(JSON.parse(json).boardDocument.objects.length).toBe(3);

    // 4. Restore
    const bm2 = new BoardManager();
    const restored = bm2.deserializeBoard(json);
    expect(restored.objects.length).toBe(3);

    // 5. Build spatial index & selection
    const reg = new PhysicalObjectRegistry();
    const si = new SpatialIndex();
    for (const obj of restored.objects) {
      reg.add(obj);
      if (obj.bbox) si.upsert({ id: obj.id, bbox: obj.bbox, layerId: obj.layerId });
    }

    const sel = new PhysicalSelectionEngine((id) => reg.get(id), si);
    sel.beginBoxSelect({ x: -2_000_000, y: -2_000_000 });
    sel.updateBoxSelect({ x: 2_000_000, y: 2_000_000 });
    const selected = sel.commitBoxSelect();
    expect(selected).toContain(pad1.id);
  });

  it('layer manager + stackup manager integration', () => {
    const layers = createDefaultLayers();
    const lm = new LayerManager(layers);
    const stackup = createDefaultStackup(layers);
    const sm = new StackupManager(stackup);

    // Verify F.Cu exists in both
    const fcu = lm.getLayerByName('F.Cu');
    expect(fcu).toBeTruthy();

    const fcuInStackup = sm.getLayerByName('F.Cu');
    expect(fcuInStackup).toBeTruthy();
    expect(fcuInStackup?.layerId).toBe(fcu?.id);
  });

  it('rule manager + net class integration', () => {
    const rm = new PhysicalRuleManager();
    rm.addNetClass(POWER_NET_CLASS);
    rm.addRule(createClearanceRule({ clearanceNm: 200_000, condition: { netClassA: 'Power' } }));
    rm.addRule(createTrackWidthRule({ minWidthNm: 250_000 }));

    const clearanceForPower = rm.getEffectiveParameter('clearance', 'clearance', { netClassA: 'Power' });
    expect(clearanceForPower).toBe(200_000);

    const trackWidth = rm.getTrackWidthForNet('Power');
    expect(trackWidth).toBe(500_000);
  });

  it('viewport + snapping integration', () => {
    const vp = new PhysicalViewportManager(1920, 1080);
    vp.setZoom(1e-4);

    const si = new SpatialIndex();
    const reg = new PhysicalObjectRegistry();
    const snapper = new PhysicalSnappingEngine((id) => reg.get(id), si, vp);

    const pad = createPad({ layerId: 'L', x: 10_000_000, y: 5_000_000, sizeX: 1_000_000, sizeY: 1_000_000 });
    reg.add(pad);
    si.upsert({ id: pad.id, bbox: pad.bbox!, layerId: 'L' });

    const grid = createDefaultGrid(0.1);
    const result = snapper.snap({ x: 10_010_000, y: 5_010_000 }, grid);
    expect(result.snapped).toBe(true);
  });
});
