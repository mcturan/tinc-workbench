/**
 * Physical Design Platform — Core Type Definitions
 *
 * These types form the foundation of the PCB Physical Design subsystem.
 * They are additive and do NOT replace existing domain types.
 */

// ── Unit System ────────────────────────────────────────────────────────────────

export type PhysicalUnit = 'mm' | 'mil' | 'inch' | 'um' | 'nm';

export interface UnitSystem {
  primary: PhysicalUnit;
  display: PhysicalUnit;
  precision: number; // decimal places for display
  internalUnit: 'nm'; // always nm internally
}

// Conversion factors to nanometers
export const UNIT_TO_NM: Record<PhysicalUnit, number> = {
  nm: 1,
  um: 1_000,
  mm: 1_000_000,
  mil: 25_400,
  inch: 25_400_000,
};

export function toNm(value: number, unit: PhysicalUnit): number {
  return Math.round(value * UNIT_TO_NM[unit]);
}

export function fromNm(valueNm: number, unit: PhysicalUnit): number {
  return valueNm / UNIT_TO_NM[unit];
}

// ── Coordinate System ─────────────────────────────────────────────────────────

/** 2D coordinate in nanometers (internal unit) */
export interface PhysicalCoord {
  x: number; // nm
  y: number; // nm
}

/** Axis-aligned bounding box in nanometers */
export interface PhysicalBBox {
  minX: number; // nm
  minY: number; // nm
  maxX: number; // nm
  maxY: number; // nm
}

export function bboxWidth(b: PhysicalBBox): number {
  return b.maxX - b.minX;
}

export function bboxHeight(b: PhysicalBBox): number {
  return b.maxY - b.minY;
}

export function bboxCenter(b: PhysicalBBox): PhysicalCoord {
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

export function bboxContainsPoint(b: PhysicalBBox, p: PhysicalCoord): boolean {
  return p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY;
}

export function bboxIntersects(a: PhysicalBBox, b: PhysicalBBox): boolean {
  return !(b.minX > a.maxX || b.maxX < a.minX || b.minY > a.maxY || b.maxY < a.minY);
}

export function bboxUnion(a: PhysicalBBox, b: PhysicalBBox): PhysicalBBox {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

export function bboxExpand(b: PhysicalBBox, margin: number): PhysicalBBox {
  return {
    minX: b.minX - margin,
    minY: b.minY - margin,
    maxX: b.maxX + margin,
    maxY: b.maxY + margin,
  };
}

// ── Transform ─────────────────────────────────────────────────────────────────

/** 2D rigid transform: translate + rotate (degrees) + mirror */
export interface PhysicalTransform {
  x: number;       // nm
  y: number;       // nm
  rotation: number; // degrees 0,90,180,270
  mirrorX: boolean;
  mirrorY: boolean;
}

export function identityTransform(): PhysicalTransform {
  return { x: 0, y: 0, rotation: 0, mirrorX: false, mirrorY: false };
}

// ── Layer System ──────────────────────────────────────────────────────────────

export type CopperLayerType =
  | 'signal'
  | 'plane'
  | 'mixed';

export type LayerKind =
  | 'copper'
  | 'silkscreen'
  | 'solder-mask'
  | 'solder-paste'
  | 'mechanical'
  | 'assembly'
  | 'documentation'
  | 'keepout'
  | 'courtyard'
  | 'user';

export type LayerSide = 'front' | 'back' | 'inner' | 'both' | 'none';

export interface PhysicalLayer {
  id: string;
  name: string;
  kind: LayerKind;
  side: LayerSide;
  copperType?: CopperLayerType;
  color: string;      // CSS hex color
  opacity: number;    // 0.0–1.0
  visible: boolean;
  locked: boolean;
  order: number;      // rendering order, ascending
  groupId?: string;
  metadata?: Record<string, unknown>;
}

export interface LayerGroup {
  id: string;
  name: string;
  visible: boolean;
  collapsed: boolean;
  layerIds: string[];
}

export type LayerPresetName = 'default' | 'minimal' | 'assembly' | 'fabrication' | 'review' | string;

export interface LayerPreset {
  name: LayerPresetName;
  visibleLayerIds: string[];
  description?: string;
}

// ── Board Stackup ─────────────────────────────────────────────────────────────

export type StackupMaterialType = 'copper' | 'core' | 'prepreg' | 'finish' | 'soldermask';

export interface StackupLayer {
  id: string;
  name: string;
  materialType: StackupMaterialType;
  thicknessUm: number;  // micrometers
  material?: string;    // e.g. "FR4", "Rogers 4003C"
  dielectricConstant?: number;
  lossTangent?: number;
  copperWeight?: number; // oz/ft²
  layerId?: string;     // links to PhysicalLayer if copper
}

export interface BoardStackup {
  id: string;
  copperLayers: number;
  layers: StackupLayer[];
  totalThicknessUm: number;
  finishType?: string;
  surfaceFinish?: string;
  ipcClass?: '1' | '2' | '3';
  metadata?: Record<string, unknown>;
}

// ── Physical Object Model ─────────────────────────────────────────────────────

export type PhysicalObjectKind =
  | 'pad'
  | 'via'
  | 'track'
  | 'zone'
  | 'text'
  | 'graphic'
  | 'dimension'
  | 'mounting-hole'
  | 'mechanical'
  | 'footprint';

export interface PhysicalObjectBase {
  id: string;
  kind: PhysicalObjectKind;
  layerId: string;
  transform: PhysicalTransform;
  visible: boolean;
  locked: boolean;
  selected: boolean;
  netId?: string;
  metadata?: Record<string, unknown>;
  /** Cached axis-aligned bounding box in nm */
  bbox?: PhysicalBBox;
}

// Pad
export type PadShape = 'circle' | 'oval' | 'rect' | 'roundrect' | 'trapezoid' | 'custom';
export type PadType = 'thru-hole' | 'smd' | 'connect' | 'np-thru-hole';

export interface PadObject extends PhysicalObjectBase {
  kind: 'pad';
  padNumber: string;
  padShape: PadShape;
  padType: PadType;
  sizeX: number;   // nm
  sizeY: number;   // nm
  drillDiameter?: number; // nm, for thru-hole
  drillOffsetX?: number;  // nm
  drillOffsetY?: number;  // nm
  roundrectRatio?: number; // 0–0.5
  pasteMargin?: number;   // nm
  solderMaskMargin?: number; // nm
  zoneConnectMode?: 'inherited' | 'none' | 'thermal' | 'solid';
}

// Via
export type ViaType = 'through' | 'blind' | 'buried' | 'micro';

export interface ViaObject extends PhysicalObjectBase {
  kind: 'via';
  viaType: ViaType;
  diameter: number;  // nm
  drillDiameter: number; // nm
  fromLayerId: string;
  toLayerId: string;
  solderMaskMargin?: number; // nm
}

// Track
export interface TrackObject extends PhysicalObjectBase {
  kind: 'track';
  startX: number; // nm
  startY: number; // nm
  endX: number;   // nm
  endY: number;   // nm
  width: number;  // nm
}

// Zone (copper pour / keepout)
export type ZoneType = 'copper-fill' | 'keepout' | 'rule-area';

export interface ZoneObject extends PhysicalObjectBase {
  kind: 'zone';
  zoneType: ZoneType;
  outlinePoints: PhysicalCoord[];
  clearance?: number;   // nm
  minWidth?: number;    // nm
  fillType?: 'solid' | 'hatched';
  hatchOrientation?: number;
  hatchWidth?: number;
  hatchGap?: number;
  thermalGap?: number;
  thermalSpokeWidth?: number;
  priority?: number;
  keepoutRules?: {
    noTracks: boolean;
    noVias: boolean;
    noPads: boolean;
    noCopperFill: boolean;
    noFootprints: boolean;
  };
}

// Text
export type TextType = 'reference' | 'value' | 'user' | 'net-name';

export interface TextObject extends PhysicalObjectBase {
  kind: 'text';
  text: string;
  textType: TextType;
  fontName?: string;
  fontSizeUm: number;   // micrometers
  bold: boolean;
  italic: boolean;
  mirrored: boolean;
  justification: 'left' | 'center' | 'right';
  thickness?: number;  // nm stroke width
}

// Graphic
export type GraphicShape = 'line' | 'arc' | 'circle' | 'polygon' | 'rectangle' | 'bezier';

export interface GraphicObject extends PhysicalObjectBase {
  kind: 'graphic';
  shape: GraphicShape;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  centerX?: number;
  centerY?: number;
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  points?: PhysicalCoord[];
  width: number; // nm stroke width
  filled: boolean;
  fillColor?: string;
  strokeColor?: string;
}

// Dimension
export type DimensionType = 'aligned' | 'orthogonal' | 'center' | 'radial' | 'leader';

export interface DimensionObject extends PhysicalObjectBase {
  kind: 'dimension';
  dimensionType: DimensionType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  textPositionX?: number;
  textPositionY?: number;
  dimensionValueNm?: number; // auto-computed if null
  unitOverride?: PhysicalUnit;
  precision?: number;
  textSize?: number;
  lineWidth?: number;
  arrowLength?: number;
  extensionOffset?: number;
}

// Mounting Hole
export interface MountingHoleObject extends PhysicalObjectBase {
  kind: 'mounting-hole';
  drillDiameter: number; // nm
  padDiameter: number;   // nm
  plated: boolean;
  annularRing?: number;
}

// Mechanical
export interface MechanicalObject extends PhysicalObjectBase {
  kind: 'mechanical';
  shape: GraphicShape;
  points?: PhysicalCoord[];
  width: number;
}

export type PhysicalObject =
  | PadObject
  | ViaObject
  | TrackObject
  | ZoneObject
  | TextObject
  | GraphicObject
  | DimensionObject
  | MountingHoleObject
  | MechanicalObject;

// ── Footprint ─────────────────────────────────────────────────────────────────

export interface PCBFootprintDefinition {
  id: string;
  libraryId?: string;
  name: string;
  description?: string;
  tags: string[];
  pads: PadObject[];
  graphics: GraphicObject[];
  texts: TextObject[];
  courtyard?: GraphicObject[];
  assembly?: GraphicObject[];
  documentation?: GraphicObject[];
  anchor: PhysicalCoord;
  bbox?: PhysicalBBox;
  metadata?: Record<string, unknown>;
}

export interface FootprintInstance {
  id: string;
  definitionId: string; // references PCBFootprintDefinition.id
  reference: string;
  value: string;
  transform: PhysicalTransform;
  layerId: string; // front or back copper
  locked: boolean;
  selected: boolean;
  netIds: Record<string, string>; // padNumber -> netId
  bbox?: PhysicalBBox;
}

// ── Physical Rule Framework ───────────────────────────────────────────────────

export type RuleKind =
  | 'clearance'
  | 'track-width'
  | 'via-size'
  | 'hole-size'
  | 'hole-to-hole'
  | 'courtyard'
  | 'copper-edge'
  | 'diff-pair-gap'
  | 'net-class'
  | 'keepout';

export type RulePriority = 'low' | 'normal' | 'high' | 'critical';

export interface RuleCondition {
  netClassA?: string;
  netClassB?: string;
  layerIds?: string[];
  objectKinds?: PhysicalObjectKind[];
  padTypes?: PadType[];
}

export interface PhysicalRule {
  id: string;
  name: string;
  kind: RuleKind;
  priority: RulePriority;
  enabled: boolean;
  condition?: RuleCondition;
  parameters: Record<string, number | string | boolean>;
  parentRuleId?: string;   // for inheritance
  description?: string;
}

export interface NetClassRule {
  netClassName: string;
  trackWidth?: number;     // nm
  trackWidthMin?: number;  // nm
  clearance?: number;      // nm
  viaDiameter?: number;    // nm
  viaDrillDiameter?: number; // nm
  uViaDiameter?: number;
  uViaDrillDiameter?: number;
  diffPairGap?: number;
  diffPairMaxUncoupled?: number;
}

export interface RuleProfile {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  rules: PhysicalRule[];
  netClasses: NetClassRule[];
}

// ── Board Document ────────────────────────────────────────────────────────────

export interface BoardOrigin {
  x: number; // nm
  y: number; // nm
}

export interface BoardDocument {
  id: string;
  uuid: string;
  name: string;
  description?: string;
  origin: BoardOrigin;
  unitSystem: UnitSystem;
  stackup: BoardStackup;
  layers: PhysicalLayer[];
  layerGroups: LayerGroup[];
  layerPresets: LayerPreset[];
  activeLayerId: string;
  rules: PhysicalRule[];
  netClasses: NetClassRule[];
  objects: PhysicalObject[];
  footprints: FootprintInstance[];
  boardOutline?: GraphicObject[];
  boardBBox?: PhysicalBBox;
  createdAt: string;
  modifiedAt: string;
  metadata?: Record<string, unknown>;
}

// ── Viewport (Physical) ───────────────────────────────────────────────────────

export interface PhysicalViewport {
  panX: number;   // screen px
  panY: number;   // screen px
  zoom: number;   // screen px per nm
  width: number;  // canvas px
  height: number; // canvas px
}

// ── Grid ──────────────────────────────────────────────────────────────────────

export type GridKind = 'cartesian' | 'polar';
export type PhysicalGridStyle = 'dots' | 'lines' | 'none';

export interface PhysicalGrid {
  kind: PhysicalGridStyle;   // rendering style (dots | lines | none)
  topology?: GridKind; // coordinate system (cartesian | polar)
  spacingX: number;  // nm
  spacingY: number;  // nm
  originX: number;   // nm
  originY: number;   // nm
  visible: boolean;
  snapEnabled: boolean;
  color?: string;
  opacity?: number;
}

// ── Snapping ──────────────────────────────────────────────────────────────────

export type SnapType =
  | 'grid'
  | 'vertex'
  | 'endpoint'
  | 'center'
  | 'midpoint'
  | 'intersection'
  | 'pad-center'
  | 'via-center';

export interface SnapCandidate {
  type: SnapType;
  point: PhysicalCoord;
  objectId?: string;
  layerId?: string;
  distance: number; // px from cursor
}

export type PhysicalSnapResult = {
  snapped: boolean;
  point: PhysicalCoord;
  candidate?: SnapCandidate;
};

// ── Selection (Physical) ──────────────────────────────────────────────────────

export type PhysicalSelectionMode = 'single' | 'multi' | 'box' | 'lasso';

export interface PhysicalSelectionFilter {
  layerIds?: string[];
  kinds?: PhysicalObjectKind[];
  includeLocked: boolean;
  includeHidden: boolean;
}

export interface PhysicalSelectionGroup {
  id: string;
  name: string;
  objectIds: string[];
}

// ── Spatial Index ─────────────────────────────────────────────────────────────

export interface SpatialEntry {
  id: string;
  bbox: PhysicalBBox;
  layerId: string;
}

// ── Serialization ─────────────────────────────────────────────────────────────

export interface PhysicalDesignSnapshot {
  version: '1.0';
  boardDocument: BoardDocument;
}
