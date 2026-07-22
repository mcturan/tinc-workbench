/**
 * Physical Design Platform — Public API
 * PART 14: Clean exports, documented public interfaces, no duplicate exports
 *
 * This module is the sole public surface of the physical-design subsystem.
 * Import everything from here; do not import from internal submodules.
 */

// ── PART 1 — Types & Document Model ─────────────────────────────────────────
export type {
  PhysicalUnit,
  UnitSystem,
  PhysicalCoord,
  PhysicalBBox,
  PhysicalTransform,
  BoardOrigin,
  BoardDocument,
  PhysicalViewport,
  PhysicalGrid,
  PhysicalSnapResult,
  SnapCandidate,
  SnapType,
  SpatialEntry,
  PhysicalGridStyle,
  PhysicalSelectionMode,
  PhysicalSelectionFilter,
  PhysicalSelectionGroup,
  PhysicalDesignSnapshot,
} from './types';

export {
  UNIT_TO_NM,
  toNm,
  fromNm,
  bboxWidth,
  bboxHeight,
  bboxCenter,
  bboxContainsPoint,
  bboxIntersects,
  bboxUnion,
  bboxExpand,
  identityTransform,
} from './types';

// ── PART 2 — Layer System ────────────────────────────────────────────────────
export type {
  LayerKind,
  LayerSide,
  CopperLayerType,
  LayerPresetName,
  LayerGroup,
  LayerPreset,
} from './types';

export type { PhysicalLayer } from './types';

export { createDefaultLayers, LayerManager } from './layers';

// ── PART 3 — Board Stackup ───────────────────────────────────────────────────
export type {
  StackupLayer,
  StackupMaterialType,
  BoardStackup,
} from './types';

export { createDefaultStackup, StackupManager } from './stackup';

// ── PART 4 — Physical Object Model ───────────────────────────────────────────
export type {
  PhysicalObjectKind,
  PhysicalObjectBase,
  PadShape,
  PadType,
  PadObject,
  ViaType,
  ViaObject,
  TrackObject,
  ZoneType,
  ZoneObject,
  TextType,
  TextObject,
  GraphicShape,
  GraphicObject,
  DimensionType,
  DimensionObject,
  MountingHoleObject,
  MechanicalObject,
  PhysicalObject,
  PCBFootprintDefinition,
  FootprintInstance,
} from './types';

export {
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
} from './objects';

// ── PART 5 — Geometry Framework ──────────────────────────────────────────────
export type {
  Segment,
  Arc,
  Circle,
  GeoPolygon,
  GeoRectangle,
  RoundedRectangle,
  Region,
} from './geometry';

export {
  segmentBBox,
  circleBBox,
  arcBBox,
  polygonBBox,
  pointsBBox,
  computeObjectBBox,
  pointInCircle,
  pointOnSegment,
  pointToSegmentDistance,
  pointInPolygon,
  segmentsIntersect,
  hitTestObject,
  distancePoints,
  segmentLength,
  segmentMidpoint,
  circleCircleDistance,
  polygonArea,
  polygonCentroid,
  convexHull,
  rotatePoint,
  mirrorPointX,
  mirrorPointY,
  bboxOverlapArea,
  bboxArea,
  bboxFromPoints,
} from './geometry';

// ── PART 6 — Spatial Index ────────────────────────────────────────────────────
export { QuadTree, SpatialIndex } from './spatial-index';

// ── PART 7 — Selection Framework ─────────────────────────────────────────────
export type { PhysicalSelectionState } from './selection';
export { defaultSelectionFilter, PhysicalSelectionEngine } from './selection';

// ── PART 8 — Viewport Framework ───────────────────────────────────────────────
export { PhysicalViewportManager, computeGridRenderData, createDefaultGrid } from './viewport';
export type { GridRenderData } from './viewport';

// ── PART 9 — Snapping Framework ───────────────────────────────────────────────
export type { SnapConfig } from './snapping';
export { defaultSnapConfig, PhysicalSnappingEngine } from './snapping';

// ── PART 10 — Physical Rule Framework ────────────────────────────────────────
export type {
  RuleKind,
  RulePriority,
  RuleCondition,
  PhysicalRule,
  NetClassRule,
} from './types';

export {
  createClearanceRule,
  createTrackWidthRule,
  createViaSizeRule,
  createHoleSizeRule,
  createKeepoutRule,
  createCopperSpacingRule,
  createNetClassRule,
  DEFAULT_NET_CLASS,
  POWER_NET_CLASS,
  HIGH_SPEED_NET_CLASS,
  PhysicalRuleManager,
} from './rules';

// ── PART 11 — Persistence ─────────────────────────────────────────────────────
export { PhysicalDesignSerializer, PhysicalDesignPersistenceManager } from './persistence';

// ── PART 12 — Project Integration ────────────────────────────────────────────
export type {
  PhysicalDesignExplorerNode,
  PhysicalPropertyGroup,
  PhysicalPropertyEntry,
  PropertyValue,
  PhysicalDesignAIContext,
  PhysicalDocumentDescriptor,
  FootprintLibraryEntry,
} from './integration';

export * from './footprint-adapter';
export * from './rule-profiles';
export * from './rule-profiles';

export {
  buildExplorerTree,
  getObjectProperties,
  getLayerProperties,
  buildAIContext,
  describeBoard,
  describeFootprintLibrary,
} from './integration';

// ── PART 13 — Rendering Foundation ────────────────────────────────────────────
export type { PhysicalRenderStyle } from './renderer';
export { PhysicalBoardRenderer } from './renderer';
export { DRCEngine } from './drc-engine';

export { FootprintEditorWorkspace } from './footprint-editor';

// ── PART 1 — Board Manager (facade) ──────────────────────────────────────────
export type { CreateBoardOptions } from './board';
export {
  createBoardDocument,
  createDefaultUnitSystem,
  createDefaultOrigin,
  BoardManager,
} from './board';

export { PCBEditor, transformCoord, transformBBox } from './pcb-editor';
