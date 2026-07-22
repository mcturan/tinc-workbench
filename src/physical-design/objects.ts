/**
 * Physical Design Platform — Physical Object Registry
 * PART 4: Physical Object Model — pads, vias, tracks, zones, text, graphics, dimensions, holes
 */

import { generateUUID } from '../utils';
import {
  PhysicalObject,
  PhysicalObjectKind,
  PadObject,
  PadShape,
  PadType,
  ViaObject,
  ViaType,
  TrackObject,
  ZoneObject,
  ZoneType,
  TextObject,
  TextType,
  GraphicObject,
  GraphicShape,
  DimensionObject,
  DimensionType,
  MountingHoleObject,
  MechanicalObject,
  PCBFootprintDefinition,
  FootprintInstance,
  PhysicalTransform,
  PhysicalBBox,
  PhysicalCoord,
  identityTransform,
} from './types';
import { computeObjectBBox } from './geometry';

// ── Object Factories ──────────────────────────────────────────────────────────

export function createPad(params: {
  layerId: string;
  padNumber?: string;
  padShape?: PadShape;
  padType?: PadType;
  x?: number;
  y?: number;
  sizeX?: number;
  sizeY?: number;
  drillDiameter?: number;
  netId?: string;
}): PadObject {
  const pad: PadObject = {
    id: generateUUID(),
    kind: 'pad',
    layerId: params.layerId,
    transform: { x: params.x ?? 0, y: params.y ?? 0, rotation: 0, mirrorX: false, mirrorY: false },
    visible: true,
    locked: false,
    selected: false,
    padNumber: params.padNumber ?? '1',
    padShape: params.padShape ?? 'circle',
    padType: params.padType ?? 'smd',
    sizeX: params.sizeX ?? 1_000_000, // 1 mm
    sizeY: params.sizeY ?? 1_000_000,
    drillDiameter: params.drillDiameter,
    netId: params.netId,
  };
  pad.bbox = computeObjectBBox(pad) ?? undefined;
  return pad;
}

export function createVia(params: {
  layerId: string;
  x?: number;
  y?: number;
  diameter?: number;
  drillDiameter?: number;
  fromLayerId?: string;
  toLayerId?: string;
  viaType?: ViaType;
  netId?: string;
}): ViaObject {
  const via: ViaObject = {
    id: generateUUID(),
    kind: 'via',
    layerId: params.layerId,
    transform: { x: params.x ?? 0, y: params.y ?? 0, rotation: 0, mirrorX: false, mirrorY: false },
    visible: true,
    locked: false,
    selected: false,
    viaType: params.viaType ?? 'through',
    diameter: params.diameter ?? 800_000,       // 0.8 mm
    drillDiameter: params.drillDiameter ?? 400_000, // 0.4 mm
    fromLayerId: params.fromLayerId ?? '',
    toLayerId: params.toLayerId ?? '',
    netId: params.netId,
  };
  via.bbox = computeObjectBBox(via) ?? undefined;
  return via;
}

export function createTrack(params: {
  layerId: string;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  width?: number;
  netId?: string;
}): TrackObject {
  const track: TrackObject = {
    id: generateUUID(),
    kind: 'track',
    layerId: params.layerId,
    transform: identityTransform(),
    visible: true,
    locked: false,
    selected: false,
    startX: params.startX ?? 0,
    startY: params.startY ?? 0,
    endX: params.endX ?? 0,
    endY: params.endY ?? 0,
    width: params.width ?? 250_000, // 0.25 mm
    netId: params.netId,
  };
  track.bbox = computeObjectBBox(track) ?? undefined;
  return track;
}

export function createZone(params: {
  layerId: string;
  zoneType?: ZoneType;
  outlinePoints?: PhysicalCoord[];
  netId?: string;
  clearance?: number;
}): ZoneObject {
  const zone: ZoneObject = {
    id: generateUUID(),
    kind: 'zone',
    layerId: params.layerId,
    transform: identityTransform(),
    visible: true,
    locked: false,
    selected: false,
    zoneType: params.zoneType ?? 'copper-fill',
    outlinePoints: params.outlinePoints ?? [],
    clearance: params.clearance ?? 250_000,
    netId: params.netId,
    fillType: 'solid',
    priority: 0,
  };
  zone.bbox = computeObjectBBox(zone) ?? undefined;
  return zone;
}

export function createText(params: {
  layerId: string;
  text?: string;
  textType?: TextType;
  x?: number;
  y?: number;
  fontSizeUm?: number;
  rotation?: number;
}): TextObject {
  return {
    id: generateUUID(),
    kind: 'text',
    layerId: params.layerId,
    transform: { x: params.x ?? 0, y: params.y ?? 0, rotation: params.rotation ?? 0, mirrorX: false, mirrorY: false },
    visible: true,
    locked: false,
    selected: false,
    text: params.text ?? '',
    textType: params.textType ?? 'user',
    fontSizeUm: params.fontSizeUm ?? 1500,
    bold: false,
    italic: false,
    mirrored: false,
    justification: 'center',
  };
}

export function createGraphic(params: {
  layerId: string;
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
  width?: number;
  filled?: boolean;
  strokeColor?: string;
  fillColor?: string;
}): GraphicObject {
  const g: GraphicObject = {
    id: generateUUID(),
    kind: 'graphic',
    layerId: params.layerId,
    transform: identityTransform(),
    visible: true,
    locked: false,
    selected: false,
    shape: params.shape,
    startX: params.startX,
    startY: params.startY,
    endX: params.endX,
    endY: params.endY,
    centerX: params.centerX,
    centerY: params.centerY,
    radius: params.radius,
    startAngle: params.startAngle,
    endAngle: params.endAngle,
    points: params.points,
    width: params.width ?? 100_000, // 0.1 mm
    filled: params.filled ?? false,
    strokeColor: params.strokeColor,
    fillColor: params.fillColor,
  };
  g.bbox = computeObjectBBox(g) ?? undefined;
  return g;
}

export function createDimension(params: {
  layerId: string;
  dimensionType?: DimensionType;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
}): DimensionObject {
  return {
    id: generateUUID(),
    kind: 'dimension',
    layerId: params.layerId,
    transform: identityTransform(),
    visible: true,
    locked: false,
    selected: false,
    dimensionType: params.dimensionType ?? 'aligned',
    startX: params.startX ?? 0,
    startY: params.startY ?? 0,
    endX: params.endX ?? 0,
    endY: params.endY ?? 0,
  };
}

export function createMountingHole(params: {
  layerId: string;
  x?: number;
  y?: number;
  drillDiameter?: number;
  padDiameter?: number;
  plated?: boolean;
}): MountingHoleObject {
  const mh: MountingHoleObject = {
    id: generateUUID(),
    kind: 'mounting-hole',
    layerId: params.layerId,
    transform: { x: params.x ?? 0, y: params.y ?? 0, rotation: 0, mirrorX: false, mirrorY: false },
    visible: true,
    locked: false,
    selected: false,
    drillDiameter: params.drillDiameter ?? 3_200_000, // 3.2 mm
    padDiameter: params.padDiameter ?? 6_400_000,
    plated: params.plated ?? false,
  };
  mh.bbox = computeObjectBBox(mh) ?? undefined;
  return mh;
}

export function createMechanical(params: {
  layerId: string;
  shape: GraphicShape;
  points?: PhysicalCoord[];
  width?: number;
}): MechanicalObject {
  return {
    id: generateUUID(),
    kind: 'mechanical',
    layerId: params.layerId,
    transform: identityTransform(),
    visible: true,
    locked: false,
    selected: false,
    shape: params.shape,
    points: params.points,
    width: params.width ?? 100_000,
  };
}

// ── Physical Object Registry ──────────────────────────────────────────────────

export class PhysicalObjectRegistry {
  private objects: Map<string, PhysicalObject> = new Map();
  private footprints: Map<string, FootprintInstance> = new Map();
  private footprintDefs: Map<string, PCBFootprintDefinition> = new Map();

  // ── Objects ─────────────────────────────────────────────────────────────────

  add(obj: PhysicalObject): void {
    if (this.objects.has(obj.id)) {
      throw new Error(`Physical object ID collision: ${obj.id}`);
    }
    // Recompute bbox if missing
    if (!obj.bbox) {
      obj.bbox = computeObjectBBox(obj) ?? undefined;
    }
    this.objects.set(obj.id, obj);
  }

  get(id: string): PhysicalObject | undefined {
    return this.objects.get(id);
  }

  update(id: string, updates: Partial<PhysicalObject>): boolean {
    const obj = this.objects.get(id);
    if (!obj) return false;
    Object.assign(obj, updates);
    // Recompute bbox after any update
    const newBbox = computeObjectBBox(obj);
    obj.bbox = newBbox ?? undefined;
    return true;
  }

  remove(id: string): boolean {
    return this.objects.delete(id);
  }

  getAll(): PhysicalObject[] {
    return Array.from(this.objects.values());
  }

  getByLayer(layerId: string): PhysicalObject[] {
    return this.getAll().filter((o) => o.layerId === layerId);
  }

  getByKind(kind: PhysicalObjectKind): PhysicalObject[] {
    return this.getAll().filter((o) => o.kind === kind);
  }

  getByNet(netId: string): PhysicalObject[] {
    return this.getAll().filter((o) => o.netId === netId);
  }

  count(): number {
    return this.objects.size;
  }

  // ── Footprint Instances ──────────────────────────────────────────────────────

  addFootprint(fp: FootprintInstance): void {
    if (this.footprints.has(fp.id)) {
      throw new Error(`Footprint instance ID collision: ${fp.id}`);
    }
    this.footprints.set(fp.id, fp);
  }

  getFootprint(id: string): FootprintInstance | undefined {
    return this.footprints.get(id);
  }

  removeFootprint(id: string): boolean {
    return this.footprints.delete(id);
  }

  getAllFootprints(): FootprintInstance[] {
    return Array.from(this.footprints.values());
  }

  getFootprintByReference(ref: string): FootprintInstance | undefined {
    for (const fp of this.footprints.values()) {
      if (fp.reference === ref) return fp;
    }
    return undefined;
  }

  // ── Footprint Definitions ───────────────────────────────────────────────────

  registerDefinition(def: PCBFootprintDefinition): void {
    this.footprintDefs.set(def.id, def);
  }

  getDefinition(id: string): PCBFootprintDefinition | undefined {
    return this.footprintDefs.get(id);
  }

  // ── Serialization ────────────────────────────────────────────────────────────

  serialize(): { objects: PhysicalObject[]; footprints: FootprintInstance[] } {
    return {
      objects: this.getAll(),
      footprints: this.getAllFootprints(),
    };
  }

  clear(): void {
    this.objects.clear();
    this.footprints.clear();
  }
}
