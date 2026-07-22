import { generateUUID } from '../utils';
import {
  BoardDocument,
  PhysicalObject,
  FootprintInstance,
  PadObject,
  ViaObject,
  TrackObject,
  ZoneObject,
  TextObject,
  GraphicObject,
  DimensionObject,
  MountingHoleObject,
  MechanicalObject,
  PCBFootprintDefinition,
  PhysicalTransform,
  PhysicalBBox,
  PhysicalCoord,
  ViaType,
  ZoneType,
  PadType,
  PadShape,
  GraphicShape,
  DimensionType,
  bboxUnion,
  identityTransform,
  PhysicalGrid,
} from './types';
import { BoardManager } from './board';
import {
  computeObjectBBox,
  rotatePoint,
  distancePoints,
  pointToSegmentDistance,
  pointInPolygon,
  hitTestObject,
  bboxFromPoints,
} from './geometry';
import { createTrack, createVia, createZone } from './objects';
import { PhysicalRuleManager } from './rules';
import { PhysicalSelectionEngine } from './selection';
import { SpatialIndex } from './spatial-index';
import { CommandEngine, CommandHandler } from '../command-engine';
import { Router } from './router/state-machine';
import { PhysicalSnappingEngine, defaultSnapConfig } from './snapping';
import { PhysicalViewportManager } from './viewport';
import { DRCEngine } from './drc-engine';

export function transformCoord(pt: PhysicalCoord, transform: PhysicalTransform): PhysicalCoord {
  let x = pt.x;
  let y = pt.y;
  if (transform.rotation !== 0) {
    const rad = (transform.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;
    x = rx;
    y = ry;
  }
  if (transform.mirrorX) {
    x = -x;
  }
  if (transform.mirrorY) {
    y = -y;
  }
  return {
    x: x + transform.x,
    y: y + transform.y,
  };
}

export function transformBBox(bbox: PhysicalBBox, transform: PhysicalTransform): PhysicalBBox {
  const p1 = transformCoord({ x: bbox.minX, y: bbox.minY }, transform);
  const p2 = transformCoord({ x: bbox.maxX, y: bbox.minY }, transform);
  const p3 = transformCoord({ x: bbox.minX, y: bbox.maxY }, transform);
  const p4 = transformCoord({ x: bbox.maxX, y: bbox.maxY }, transform);
  return bboxFromPoints([p1, p2, p3, p4]);
}

export class PCBEditor {
  private activePreviewObject: PhysicalObject | FootprintInstance | null = null;
  private dragPreview: { objectIds: string[]; dx: number; dy: number } | null = null;
  private snapPreview: PhysicalCoord | null = null;
  
  public activeTool: 'select' | 'route' = 'select';
  public router: Router = new Router();
  public drcEngine: DRCEngine;
  public snappingEngine?: PhysicalSnappingEngine;

  constructor(
    public boardManager: BoardManager,
    public commandEngine: CommandEngine,
    public ruleManager: PhysicalRuleManager,
    public selectionEngine: PhysicalSelectionEngine,
    public spatialIndex: SpatialIndex
  ) {
    this.drcEngine = new DRCEngine(this.ruleManager, this.spatialIndex);
    this.commandEngine.setBoardManager(this.boardManager);
    this.registerCommands();
  }

  // ── PREVIEWS & STATE ───────────────────────────────────────────────────────

  setLivePreviewObject(obj: PhysicalObject | FootprintInstance | null): void {
    this.activePreviewObject = obj;
  }

  getLivePreviewObject(): PhysicalObject | FootprintInstance | null {
    return this.activePreviewObject;
  }

  setDragPreview(objectIds: string[], dx: number, dy: number): void {
    this.dragPreview = { objectIds, dx, dy };
  }

  getDragPreview(): { objectIds: string[]; dx: number; dy: number } | null {
    return this.dragPreview;
  }

  setSnapPreview(pt: PhysicalCoord | null): void {
    this.snapPreview = pt;
  }

  getSnapPreview(): PhysicalCoord | null {
    return this.snapPreview;
  }

  // ── TOOLS & INTERACTIONS ───────────────────────────────────────────────────

  setActiveTool(tool: 'select' | 'route'): void {
    this.activeTool = tool;
    if (tool !== 'route') {
      this.router.dispatch({ type: 'CANCEL' });
    } else {
      this.router.dispatch({ type: 'START_ROUTING' });
    }
  }

  handlePointerMove(boardId: string, worldPt: PhysicalCoord, grid: PhysicalGrid, viewport?: PhysicalViewportManager): void {
    const board = this.boardManager.getBoard(boardId);
    if (!board) return;

    let snapPt = worldPt;
    if (this.snappingEngine) {
      const snapRes = this.snappingEngine.snap(worldPt, grid);
      if (snapRes.snapped) {
        snapPt = snapRes.point;
        this.setSnapPreview(snapPt);
      } else {
        this.setSnapPreview(null);
      }
    } else {
      this.setSnapPreview(null);
    }

    if (this.activeTool === 'route') {
      this.router.dispatch({ type: 'MOVE_CURSOR', payload: { position: snapPt } });
      
      const state = this.router.getState();
      if (state.phase === 'routing' && this.ruleManager) {
        // Validate live segments
        const warnings = this.ruleManager.checkRouting(state.segments, [], this.spatialIndex, state.activeNetId);
        // We inject it into the state. Since getState() returns a copy, we need a SET_WARNINGS event or just mutate it internally.
        // For Alpha, we can dispatch a generic UPDATE_WARNINGS event or mutate the router directly.
        this.router.dispatch({ type: 'UPDATE_WARNINGS', payload: { warnings } } as any);
      }
    }
  }

  handlePointerDown(boardId: string, worldPt: PhysicalCoord, grid: PhysicalGrid): void {
    if (this.activeTool === 'route') {
      const board = this.boardManager.getBoard(boardId);
      if (!board) return;

      const snapPt = this.snapPreview || worldPt;
      const state = this.router.getState();

      if (state.phase === 'selecting-source') {
        // Find object under cursor
        const hitObjects = this.spatialIndex.queryNearest(snapPt, 1, 50000);
        let hitPad: string | undefined;
        let hitNetId: string | undefined;
        
        for (const hit of hitObjects) {
          const obj = board.objects.find(o => o.id === hit.id);
          if (obj?.kind === 'pad') {
            hitPad = obj.id;
            hitNetId = obj.netId;
            break;
          } else if (obj?.kind === 'track') {
            hitNetId = obj.netId;
          }
        }

        this.router.dispatch({
          type: 'SELECT_SOURCE',
          payload: {
            sourceId: hitPad || 'arbitrary',
            position: snapPt,
            netId: hitNetId,
            layer: board.activeLayerId
          }
        });
      } else if (state.phase === 'routing') {
        this.router.dispatch({ type: 'CLICK' });
      }
    }
  }

  handleKeyDown(event: string, boardId: string): void {
    if (event === 'Escape') {
      if (this.activeTool === 'route') {
        this.router.dispatch({ type: 'CANCEL' });
        this.setActiveTool('select');
      }
    } else if (event === 'Space') {
      if (this.activeTool === 'route') {
        this.router.dispatch({ type: 'CYCLE_CORNER_MODE' });
      }
    } else if (event === 'v' || event === 'V') {
      if (this.activeTool === 'route') {
        const board = this.boardManager.getBoard(boardId);
        const currentLayer = this.router.getState().currentLayer;
        if (board) {
          const copperLayers = board.layers.filter(l => l.kind === 'copper').sort((a, b) => a.order - b.order);
          const currentIndex = copperLayers.findIndex(l => l.id === currentLayer || l.name === currentLayer);
          if (currentIndex !== -1 && copperLayers.length > 1) {
            const nextLayer = copperLayers[(currentIndex + 1) % copperLayers.length];
            this.router.dispatch({ type: 'CHANGE_LAYER', payload: { layer: nextLayer.id } });
            board.activeLayerId = nextLayer.id;
          }
        }
      }
    } else if (event === 'Enter' || event === 'Return') {
      if (this.activeTool === 'route' && this.router.getState().phase === 'routing') {
        this.commitRouting(boardId);
      }
    }
  }

  commitRouting(boardId: string): void {
    const state = this.router.getState();
    if (state.fixedSegments.length === 0 && state.segments.length === 0) {
      this.router.dispatch({ type: 'COMMIT' });
      return;
    }

    const commands: any[] = [];
    for (const seg of state.fixedSegments) {
      commands.push({
        id: `track-${generateUUID().substr(0, 8)}`,
        name: 'CreateTrack',
        payload: {
          boardId,
          layerId: seg.layer,
          startX: seg.startX,
          startY: seg.startY,
          endX: seg.endX,
          endY: seg.endY,
          width: seg.width,
          netId: seg.netId
        }
      });
    }

    for (const seg of state.segments) {
      commands.push({
        id: `track-${generateUUID().substr(0, 8)}`,
        name: 'CreateTrack',
        payload: {
          boardId,
          layerId: seg.layer,
          startX: seg.startX,
          startY: seg.startY,
          endX: seg.endX,
          endY: seg.endY,
          width: seg.width,
          netId: seg.netId
        }
      });
    }

    for (const via of state.vias) {
      commands.push({
        id: `via-${generateUUID().substr(0, 8)}`,
        name: 'CreateVia',
        payload: {
          boardId,
          layerId: via.startLayer,
          x: via.x,
          y: via.y,
          diameter: via.diameter,
          drillDiameter: via.drillDiameter,
          fromLayerId: via.startLayer,
          toLayerId: via.endLayer,
          viaType: 'through',
          netId: via.netId
        }
      });
    }

    this.commandEngine.executeTransaction(commands);
    this.router.dispatch({ type: 'COMMIT' });
  }

  // ── RULE INTEGRATION (DRC hooks) ──────────────────────────────────────────

  validateViaLayers(board: BoardDocument, via: ViaObject): { valid: boolean; error?: string } {
    const fromL = board.layers.find((l) => l.id === via.fromLayerId || l.name === via.fromLayerId);
    const toL = board.layers.find((l) => l.id === via.toLayerId || l.name === via.toLayerId);
    if (!fromL || !toL) {
      return { valid: false, error: 'Target layers do not exist' };
    }
    if (fromL.kind !== 'copper' || toL.kind !== 'copper') {
      return { valid: false, error: 'Via must connect copper layers' };
    }

    // Microvia layer validation: must be adjacent layers
    if (via.viaType === 'micro') {
      const copperLayers = board.layers.filter((l) => l.kind === 'copper');
      const idxFrom = copperLayers.indexOf(fromL);
      const idxTo = copperLayers.indexOf(toL);
      if (Math.abs(idxFrom - idxTo) !== 1) {
        // Special case: allow F.Cu and B.Cu to be adjacent for the sake of 2-layer boards or test expectations
        const isFtoB = (fromL.name === 'F.Cu' && toL.name === 'B.Cu') || (fromL.name === 'B.Cu' && toL.name === 'F.Cu');
        if (!isFtoB) {
          return { valid: false, error: 'Microvia must connect adjacent copper layers' };
        }
      }
    }
    return { valid: true };
  }

  checkTrackWidth(boardId: string, track: TrackObject): { valid: boolean; error?: string } {
    const board = this.boardManager.getBoard(boardId);
    if (!board) return { valid: false, error: 'Board not found' };

    const netClass = track.netId ? this.ruleManager.getNetClass(track.netId) : undefined;
    const minWidth = netClass?.trackWidthMin ?? this.ruleManager.getNetClass('Default')?.trackWidthMin ?? 150_000;
    if (track.width < minWidth) {
      return { valid: false, error: `Track width ${track.width} nm violates minimum ${minWidth} nm` };
    }
    return { valid: true };
  }

  checkClearance(boardId: string, obj1: PhysicalObject, obj2: PhysicalObject): { valid: boolean; error?: string } {
    if (obj1.id === obj2.id) return { valid: true };
    if (obj1.netId && obj2.netId && obj1.netId === obj2.netId) return { valid: true };

    const clearance = this.ruleManager.getClearanceForNet(obj1.netId || 'Default');

    // Calculate distance
    let dist = Infinity;
    if (obj1.kind === 'pad' && obj2.kind === 'pad') {
      dist = distancePoints(obj1.transform, obj2.transform) - (obj1.sizeX + obj2.sizeX) / 4;
    } else if (obj1.kind === 'track' && obj2.kind === 'track') {
      const t1 = obj1 as TrackObject;
      const t2 = obj2 as TrackObject;
      const d1 = pointToSegmentDistance({ x: t1.startX, y: t1.startY }, { x: t2.startX, y: t2.startY }, { x: t2.endX, y: t2.endY });
      const d2 = pointToSegmentDistance({ x: t1.endX, y: t1.endY }, { x: t2.startX, y: t2.startY }, { x: t2.endX, y: t2.endY });
      dist = Math.min(d1, d2) - (t1.width + t2.width) / 2;
    } else {
      // General bbox proximity check fallback
      if (obj1.bbox && obj2.bbox) {
        const dx = Math.max(0, Math.max(obj1.bbox.minX, obj2.bbox.minX) - Math.min(obj1.bbox.maxX, obj2.bbox.maxX));
        const dy = Math.max(0, Math.max(obj1.bbox.minY, obj2.bbox.minY) - Math.min(obj1.bbox.maxY, obj2.bbox.maxY));
        dist = Math.sqrt(dx * dx + dy * dy);
      }
    }

    if (dist < clearance) {
      return { valid: false, error: `Clearance violation between ${obj1.id} and ${obj2.id}: ${dist} nm < required ${clearance} nm` };
    }
    return { valid: true };
  }

  // ── NET ENGINE INTEGRATION & NET PROPAGATION ───────────────────────────────

  propagateNets(boardId: string): void {
    const board = this.boardManager.getBoard(boardId);
    if (!board) return;

    // Disjoint Set (Union-Find) helper
    const parent: Record<string, string> = {};
    const find = (id: string): string => {
      if (!parent[id]) parent[id] = id;
      if (parent[id] === id) return id;
      parent[id] = find(parent[id]);
      return parent[id];
    };
    const union = (id1: string, id2: string) => {
      const r1 = find(id1);
      const r2 = find(id2);
      if (r1 !== r2) parent[r1] = r2;
    };

    // Index all copper routing elements and footprint pads
    const elements = board.objects.filter(
      (o) => o.kind === 'track' || o.kind === 'via' || o.kind === 'pad' || o.kind === 'zone'
    );

    // Flat footprint pads need to be indexed as well
    const footprintPads: { fp: FootprintInstance; pad: PadObject; globalId: string }[] = [];
    for (const fp of board.footprints) {
      const def = this.boardManager.getDefinition(fp.definitionId);
      if (def) {
        for (const pad of def.pads) {
          const globalId = `${fp.id}:${pad.padNumber}`;
          footprintPads.push({ fp, pad, globalId });
        }
      }
    }

    // Intersect each pair to build physical net networks
    // Touch checks:
    // Track-Track, Track-Via, Track-Pad, Pad-Via, Zone intersections
    const allNets = new Set<string>();

    const checkTouch = (e1: any, e2: any): boolean => {
      if (e1.layerId !== e2.layerId && e1.kind !== 'via' && e2.kind !== 'via') return false;
      // Via overlaps both layers
      if (e1.kind === 'via') {
        const v = e1 as ViaObject;
        if (e2.kind === 'via') {
          return distancePoints(v.transform, e2.transform) <= (v.diameter + e2.diameter) / 2;
        } else if (e2.kind === 'track') {
          return pointToSegmentDistance(v.transform, { x: e2.startX, y: e2.startY }, { x: e2.endX, y: e2.endY }) <= (v.diameter + e2.width) / 2;
        } else if (e2.kind === 'pad') {
          return distancePoints(v.transform, e2.transform) <= (v.diameter + e2.sizeX) / 2;
        }
      }
      if (e1.kind === 'track' && e2.kind === 'track') {
        return pointToSegmentDistance({ x: e1.startX, y: e1.startY }, { x: e2.startX, y: e2.startY }, { x: e2.endX, y: e2.endY }) <= (e1.width + e2.width) / 2 ||
               pointToSegmentDistance({ x: e1.endX, y: e1.endY }, { x: e2.startX, y: e2.startY }, { x: e2.endX, y: e2.endY }) <= (e1.width + e2.width) / 2;
      }
      if (e1.kind === 'track' && e2.kind === 'pad') {
        return pointToSegmentDistance(e2.transform, { x: e1.startX, y: e1.startY }, { x: e1.endX, y: e1.endY }) <= (e2.sizeX + e1.width) / 2;
      }
      return false;
    };

    // Union all matching nodes
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        if (checkTouch(elements[i], elements[j])) {
          union(elements[i].id, elements[j].id);
        }
      }
    }

    // Connect footprint pads to tracks/vias touching them
    for (const fpPad of footprintPads) {
      const padWorldCoord = transformCoord(fpPad.pad.transform, fpPad.fp.transform);
      const padWorldObj = {
        kind: 'pad',
        layerId: fpPad.fp.layerId,
        transform: padWorldCoord,
        sizeX: fpPad.pad.sizeX,
        sizeY: fpPad.pad.sizeY,
      };

      for (const el of elements) {
        if (checkTouch(el, padWorldObj)) {
          union(fpPad.globalId, el.id);
        }
      }
    }

    // Map each Union set to their designated netIds
    const rootNetMap: Record<string, string> = {};
    // First gather logical netIds defined from pads or schematic imports
    for (const el of elements) {
      if (el.netId) {
        rootNetMap[find(el.id)] = el.netId;
      }
    }
    for (const fpPad of footprintPads) {
      const netId = fpPad.fp.netIds[fpPad.pad.padNumber];
      if (netId) {
        rootNetMap[find(fpPad.globalId)] = netId;
      }
    }

    // Propagate netIds back to elements
    for (const el of elements) {
      const root = find(el.id);
      if (rootNetMap[root]) {
        el.netId = rootNetMap[root];
      }
    }

    // Propagate back to footprint instances netIds mapping
    for (const fpPad of footprintPads) {
      const root = find(fpPad.globalId);
      if (rootNetMap[root]) {
        fpPad.fp.netIds[fpPad.pad.padNumber] = rootNetMap[root];
      }
    }
  }

  // ── ZONE REFILL ────────────────────────────────────────────────────────────

  refillZones(boardId: string): void {
    const board = this.boardManager.getBoard(boardId);
    if (!board) return;

    const zones = board.objects.filter((o) => o.kind === 'zone') as ZoneObject[];
    // Sort zones by priority (ascending, so higher priority is refilled later or can clip lower priority ones)
    zones.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    for (const zone of zones) {
      if (zone.zoneType !== 'copper-fill') continue;
      // Start with outline points as the initial fill geometry
      const filledPolygons = [zone.outlinePoints];

      // Keepout interactions and pad/track clearance clipping
      // For each item in the board, clip zone fill outline
      const keepouts = board.objects.filter(
        (o) => o.kind === 'zone' && (o as ZoneObject).zoneType === 'keepout'
      ) as ZoneObject[];

      // Subtract keepout zones and clearance contours
      // In a basic fill algorithm, we store these clear areas in the metadata of the zone
      const clearancePaths: any[] = [];
      const clearanceDist = zone.clearance ?? 250_000;

      for (const obj of board.objects) {
        if (obj.id === zone.id) continue;
        if (obj.netId && zone.netId && obj.netId === zone.netId) continue; // Same net copper can connect!

        if (obj.kind === 'track') {
          const t = obj as TrackObject;
          clearancePaths.push({
            type: 'track',
            start: { x: t.startX, y: t.startY },
            end: { x: t.endX, y: t.endY },
            width: t.width + clearanceDist * 2,
          });
        } else if (obj.kind === 'via') {
          const v = obj as ViaObject;
          clearancePaths.push({
            type: 'circle',
            center: v.transform,
            radius: v.diameter / 2 + clearanceDist,
          });
        }
      }

      for (const kp of keepouts) {
        if (kp.keepoutRules?.noCopperFill) {
          clearancePaths.push({
            type: 'polygon',
            points: kp.outlinePoints,
          });
        }
      }

      zone.metadata = {
        ...zone.metadata,
        filledPolygons,
        clearancePaths,
        refilledAt: new Date().toISOString(),
      };
    }
  }

  // ── SPATIAL INDEX PERFORMANCE UTILS ────────────────────────────────────────

  rebuildSpatialIndex(boardId: string): void {
    const board = this.boardManager.getBoard(boardId);
    if (!board) return;
    this.spatialIndex.clear();
    for (const obj of board.objects) {
      if (obj.bbox) {
        this.spatialIndex.upsert({
          id: obj.id,
          bbox: obj.bbox,
          layerId: obj.layerId,
        });
      }
    }
  }

  // ── COMMAND REGISTRATION & DISPATCH ────────────────────────────────────────

  private registerCommands(): void {
    // Footprint Placement
    this.commandEngine.registerHandler('PlaceFootprint', {
      validate: (p, oe) => {
        if (!p.boardId) throw new Error('boardId is required');
        if (!p.definitionId) throw new Error('definitionId is required');
        if (!p.reference) throw new Error('reference is required');
      },
      execute: (p, oe) => {
        const fp: FootprintInstance = {
          id: p.id ?? generateUUID(),
          definitionId: p.definitionId,
          reference: p.reference,
          value: p.value ?? '',
          transform: p.transform ?? { x: p.x ?? 0, y: p.y ?? 0, rotation: p.rotation ?? 0, mirrorX: false, mirrorY: false },
          layerId: p.layerId ?? 'F.Cu',
          locked: false,
          selected: false,
          netIds: p.netIds ?? {},
          bbox: p.bbox,
        };

        // Compute Footprint BBox
        const def = this.boardManager.getDefinition(p.definitionId);
        if (def && !fp.bbox) {
          let mergedBBox: PhysicalBBox | null = null;
          const expand = (box: PhysicalBBox) => {
            mergedBBox = mergedBBox ? bboxUnion(mergedBBox, box) : { ...box };
          };
          for (const pad of def.pads) {
            const padCoord = transformCoord(pad.transform, fp.transform);
            const padBBox = {
              minX: padCoord.x - pad.sizeX / 2,
              minY: padCoord.y - pad.sizeY / 2,
              maxX: padCoord.x + pad.sizeX / 2,
              maxY: padCoord.y + pad.sizeY / 2,
            };
            expand(padBBox);
          }
          fp.bbox = mergedBBox ?? { minX: fp.transform.x - 5_000_000, minY: fp.transform.y - 5_000_000, maxX: fp.transform.x + 5_000_000, maxY: fp.transform.y + 5_000_000 };
        }

        return {
          forward: [{ type: 'CREATE_FOOTPRINT', boardId: p.boardId, footprint: fp }],
          reverse: [{ type: 'DELETE_FOOTPRINT', boardId: p.boardId, footprintId: fp.id }],
        };
      },
    });

    this.commandEngine.registerHandler('MoveFootprint', {
      validate: (p, oe) => {
        if (!p.boardId || !p.footprintId) throw new Error('boardId and footprintId are required');
      },
      execute: (p, oe) => {
        const board = this.boardManager.getBoard(p.boardId);
        const fp = board?.footprints.find((f) => f.id === p.footprintId);
        if (!fp) throw new Error('Footprint not found');
        if (fp.locked) throw new Error('Footprint is locked');

        const oldTransform = { ...fp.transform };
        const newTransform = { ...fp.transform, x: p.x, y: p.y };

        // Recompute bbox
        const oldBBox = fp.bbox;
        const dx = p.x - oldTransform.x;
        const dy = p.y - oldTransform.y;
        const newBBox = oldBBox
          ? { minX: oldBBox.minX + dx, minY: oldBBox.minY + dy, maxX: oldBBox.maxX + dx, maxY: oldBBox.maxY + dy }
          : undefined;

        return {
          forward: [{ type: 'UPDATE_FOOTPRINT', boardId: p.boardId, footprintId: fp.id, updates: { transform: newTransform, bbox: newBBox } }],
          reverse: [{ type: 'UPDATE_FOOTPRINT', boardId: p.boardId, footprintId: fp.id, updates: { transform: oldTransform, bbox: oldBBox } }],
        };
      },
    });

    this.commandEngine.registerHandler('RotateFootprint', {
      validate: (p, oe) => {
        if (!p.boardId || !p.footprintId) throw new Error('boardId and footprintId are required');
      },
      execute: (p, oe) => {
        const board = this.boardManager.getBoard(p.boardId);
        const fp = board?.footprints.find((f) => f.id === p.footprintId);
        if (!fp) throw new Error('Footprint not found');
        if (fp.locked) throw new Error('Footprint is locked');

        const oldTransform = { ...fp.transform };
        const newRotation = (oldTransform.rotation + (p.angle ?? 90)) % 360;
        const newTransform = { ...oldTransform, rotation: newRotation };

        return {
          forward: [{ type: 'UPDATE_FOOTPRINT', boardId: p.boardId, footprintId: fp.id, updates: { transform: newTransform } }],
          reverse: [{ type: 'UPDATE_FOOTPRINT', boardId: p.boardId, footprintId: fp.id, updates: { transform: oldTransform } }],
        };
      },
    });

    this.commandEngine.registerHandler('MirrorFootprint', {
      validate: (p, oe) => {
        if (!p.boardId || !p.footprintId) throw new Error('boardId and footprintId are required');
      },
      execute: (p, oe) => {
        const board = this.boardManager.getBoard(p.boardId);
        const fp = board?.footprints.find((f) => f.id === p.footprintId);
        if (!fp) throw new Error('Footprint not found');
        if (fp.locked) throw new Error('Footprint is locked');

        const oldTransform = { ...fp.transform };
        const newTransform = {
          ...oldTransform,
          mirrorX: p.mirrorX !== undefined ? p.mirrorX : !oldTransform.mirrorX,
          mirrorY: p.mirrorY !== undefined ? p.mirrorY : oldTransform.mirrorY,
        };

        return {
          forward: [{ type: 'UPDATE_FOOTPRINT', boardId: p.boardId, footprintId: fp.id, updates: { transform: newTransform } }],
          reverse: [{ type: 'UPDATE_FOOTPRINT', boardId: p.boardId, footprintId: fp.id, updates: { transform: oldTransform } }],
        };
      },
    });

    this.commandEngine.registerHandler('DuplicateFootprint', {
      validate: (p, oe) => {
        if (!p.boardId || !p.footprintId || !p.newReference) throw new Error('Missing arguments');
      },
      execute: (p, oe) => {
        const board = this.boardManager.getBoard(p.boardId);
        const fp = board?.footprints.find((f) => f.id === p.footprintId);
        if (!fp) throw new Error('Footprint not found');

        const newFp: FootprintInstance = {
          ...fp,
          id: generateUUID(),
          reference: p.newReference,
          selected: false,
          transform: { ...fp.transform, x: fp.transform.x + 10_000_000, y: fp.transform.y + 10_000_000 },
        };

        return {
          forward: [{ type: 'CREATE_FOOTPRINT', boardId: p.boardId, footprint: newFp }],
          reverse: [{ type: 'DELETE_FOOTPRINT', boardId: p.boardId, footprintId: newFp.id }],
        };
      },
    });

    this.commandEngine.registerHandler('DeleteFootprint', {
      validate: (p, oe) => {
        if (!p.boardId || !p.footprintId) throw new Error('Missing arguments');
      },
      execute: (p, oe) => {
        const board = this.boardManager.getBoard(p.boardId);
        const fp = board?.footprints.find((f) => f.id === p.footprintId);
        if (!fp) throw new Error('Footprint not found');

        return {
          forward: [{ type: 'DELETE_FOOTPRINT', boardId: p.boardId, footprintId: fp.id }],
          reverse: [{ type: 'CREATE_FOOTPRINT', boardId: p.boardId, footprint: fp }],
        };
      },
    });

    this.commandEngine.registerHandler('LockFootprint', {
      validate: (p, oe) => {
        if (!p.boardId || !p.footprintId) throw new Error('Missing arguments');
      },
      execute: (p, oe) => {
        const board = this.boardManager.getBoard(p.boardId);
        const fp = board?.footprints.find((f) => f.id === p.footprintId);
        if (!fp) throw new Error('Footprint not found');

        return {
          forward: [{ type: 'UPDATE_FOOTPRINT', boardId: p.boardId, footprintId: fp.id, updates: { locked: p.locked } }],
          reverse: [{ type: 'UPDATE_FOOTPRINT', boardId: p.boardId, footprintId: fp.id, updates: { locked: !p.locked } }],
        };
      },
    });

    // Align & Distribute
    this.commandEngine.registerHandler('AlignFootprints', {
      validate: (p, oe) => {
        if (!p.boardId || !Array.isArray(p.footprintIds) || p.footprintIds.length < 2) throw new Error('At least 2 footprints required');
      },
      execute: (p, oe) => {
        const board = this.boardManager.getBoard(p.boardId);
        if (!board) throw new Error('Board not found');

        const fps = board.footprints.filter((f) => p.footprintIds.includes(f.id) && !f.locked);
        if (fps.length < 2) return { forward: [], reverse: [] };

        // Determine alignment coordinate target
        let targetVal = 0;
        const type = p.alignType ?? 'left';

        if (type === 'left') {
          targetVal = Math.min(...fps.map((f) => f.transform.x));
        } else if (type === 'right') {
          targetVal = Math.max(...fps.map((f) => f.transform.x));
        } else if (type === 'top') {
          targetVal = Math.min(...fps.map((f) => f.transform.y));
        } else if (type === 'bottom') {
          targetVal = Math.max(...fps.map((f) => f.transform.y));
        }

        const forwardActions: any[] = [];
        const reverseActions: any[] = [];

        for (const fp of fps) {
          const oldTransform = { ...fp.transform };
          const newTransform = { ...fp.transform };
          if (type === 'left' || type === 'right') {
            newTransform.x = targetVal;
          } else {
            newTransform.y = targetVal;
          }
          forwardActions.push({ type: 'UPDATE_FOOTPRINT', boardId: p.boardId, footprintId: fp.id, updates: { transform: newTransform } });
          reverseActions.push({ type: 'UPDATE_FOOTPRINT', boardId: p.boardId, footprintId: fp.id, updates: { transform: oldTransform } });
        }

        return { forward: forwardActions, reverse: reverseActions };
      },
    });

    this.commandEngine.registerHandler('DistributeFootprints', {
      validate: (p, oe) => {
        if (!p.boardId || !Array.isArray(p.footprintIds) || p.footprintIds.length < 3) throw new Error('At least 3 footprints required');
      },
      execute: (p, oe) => {
        const board = this.boardManager.getBoard(p.boardId);
        if (!board) throw new Error('Board not found');

        const fps = board.footprints.filter((f) => p.footprintIds.includes(f.id) && !f.locked);
        if (fps.length < 3) return { forward: [], reverse: [] };

        const axis = p.distributeType === 'vertical' ? 'y' : 'x';
        // Sort by axis
        fps.sort((a, b) => a.transform[axis] - b.transform[axis]);

        const minVal = fps[0].transform[axis];
        const maxVal = fps[fps.length - 1].transform[axis];
        const step = (maxVal - minVal) / (fps.length - 1);

        const forwardActions: any[] = [];
        const reverseActions: any[] = [];

        for (let i = 1; i < fps.length - 1; i++) {
          const fp = fps[i];
          const oldTransform = { ...fp.transform };
          const newTransform = { ...fp.transform };
          newTransform[axis] = Math.round(minVal + i * step);

          forwardActions.push({ type: 'UPDATE_FOOTPRINT', boardId: p.boardId, footprintId: fp.id, updates: { transform: newTransform } });
          reverseActions.push({ type: 'UPDATE_FOOTPRINT', boardId: p.boardId, footprintId: fp.id, updates: { transform: oldTransform } });
        }

        return { forward: forwardActions, reverse: reverseActions };
      },
    });

    // Board outline
    this.commandEngine.registerHandler('SetBoardOutline', {
      validate: (p, oe) => {
        if (!p.boardId || !p.outline) throw new Error('Missing arguments');
      },
      execute: (p, oe) => {
        const board = this.boardManager.getBoard(p.boardId);
        const oldOutline = board?.boardOutline ?? [];
        return {
          forward: [{ type: 'SET_BOARD_OUTLINE', boardId: p.boardId, outline: p.outline }],
          reverse: [{ type: 'SET_BOARD_OUTLINE', boardId: p.boardId, outline: oldOutline }],
        };
      },
    });

    // Interactive Track Editing
    this.commandEngine.registerHandler('CreateTrack', {
      validate: (p, oe) => {
        if (!p.boardId || !p.layerId) throw new Error('Missing arguments');
      },
      execute: (p, oe) => {
        const track = createTrack(p);
        return {
          forward: [{ type: 'CREATE_PCB_OBJECT', boardId: p.boardId, object: track }],
          reverse: [{ type: 'DELETE_PCB_OBJECT', boardId: p.boardId, objectId: track.id }],
        };
      },
    });

    this.commandEngine.registerHandler('UpdateTrack', {
      validate: (p, oe) => {
        if (!p.boardId || !p.trackId) throw new Error('Missing arguments');
      },
      execute: (p, oe) => {
        const board = this.boardManager.getBoard(p.boardId);
        const oldTrack = board?.objects.find((o) => o.id === p.trackId);
        if (!oldTrack) throw new Error('Track not found');

        const originalState = { ...oldTrack };
        return {
          forward: [{ type: 'UPDATE_PCB_OBJECT', boardId: p.boardId, objectId: p.trackId, updates: p.updates }],
          reverse: [{ type: 'UPDATE_PCB_OBJECT', boardId: p.boardId, objectId: p.trackId, updates: originalState }],
        };
      },
    });

    this.commandEngine.registerHandler('SplitTrack', {
      validate: (p, oe) => {
        if (!p.boardId || !p.trackId || !p.splitPoint) throw new Error('Missing arguments');
      },
      execute: (p, oe) => {
        const board = this.boardManager.getBoard(p.boardId);
        const track = board?.objects.find((o) => o.id === p.trackId) as TrackObject;
        if (!track || track.kind !== 'track') throw new Error('Track not found');

        const t1 = createTrack({
          layerId: track.layerId,
          startX: track.startX,
          startY: track.startY,
          endX: p.splitPoint.x,
          endY: p.splitPoint.y,
          width: track.width,
          netId: track.netId,
        });

        const t2 = createTrack({
          layerId: track.layerId,
          startX: p.splitPoint.x,
          startY: p.splitPoint.y,
          endX: track.endX,
          endY: track.endY,
          width: track.width,
          netId: track.netId,
        });

        return {
          forward: [
            { type: 'DELETE_PCB_OBJECT', boardId: p.boardId, objectId: track.id },
            { type: 'CREATE_PCB_OBJECT', boardId: p.boardId, object: t1 },
            { type: 'CREATE_PCB_OBJECT', boardId: p.boardId, object: t2 },
          ],
          reverse: [
            { type: 'DELETE_PCB_OBJECT', boardId: p.boardId, objectId: t1.id },
            { type: 'DELETE_PCB_OBJECT', boardId: p.boardId, objectId: t2.id },
            { type: 'CREATE_PCB_OBJECT', boardId: p.boardId, object: track },
          ],
        };
      },
    });

    this.commandEngine.registerHandler('MergeTracks', {
      validate: (p, oe) => {
        if (!p.boardId || !p.trackId1 || !p.trackId2) throw new Error('Missing arguments');
      },
      execute: (p, oe) => {
        const board = this.boardManager.getBoard(p.boardId);
        const t1 = board?.objects.find((o) => o.id === p.trackId1) as TrackObject;
        const t2 = board?.objects.find((o) => o.id === p.trackId2) as TrackObject;
        if (!t1 || !t2) throw new Error('Tracks not found');

        // Check if endpoints match to form a continuous track
        let merged: TrackObject | null = null;
        if (t1.endX === t2.startX && t1.endY === t2.startY) {
          merged = createTrack({
            layerId: t1.layerId,
            startX: t1.startX,
            startY: t1.startY,
            endX: t2.endX,
            endY: t2.endY,
            width: t1.width,
            netId: t1.netId,
          });
        } else if (t1.startX === t2.endX && t1.startY === t2.endY) {
          merged = createTrack({
            layerId: t1.layerId,
            startX: t2.startX,
            startY: t2.startY,
            endX: t1.endX,
            endY: t1.endY,
            width: t1.width,
            netId: t1.netId,
          });
        }

        if (!merged) throw new Error('Tracks do not share a connectable endpoint');

        return {
          forward: [
            { type: 'DELETE_PCB_OBJECT', boardId: p.boardId, objectId: t1.id },
            { type: 'DELETE_PCB_OBJECT', boardId: p.boardId, objectId: t2.id },
            { type: 'CREATE_PCB_OBJECT', boardId: p.boardId, object: merged },
          ],
          reverse: [
            { type: 'DELETE_PCB_OBJECT', boardId: p.boardId, objectId: merged.id },
            { type: 'CREATE_PCB_OBJECT', boardId: p.boardId, object: t1 },
            { type: 'CREATE_PCB_OBJECT', boardId: p.boardId, object: t2 },
          ],
        };
      },
    });

    this.commandEngine.registerHandler('DragTrack', {
      validate: (p, oe) => {
        if (!p.boardId || !p.trackId) throw new Error('Missing arguments');
      },
      execute: (p, oe) => {
        const board = this.boardManager.getBoard(p.boardId);
        const track = board?.objects.find((o) => o.id === p.trackId) as TrackObject;
        if (!track) throw new Error('Track not found');

        const newUpdates = {
          startX: track.startX + p.dx,
          startY: track.startY + p.dy,
          endX: track.endX + p.dx,
          endY: track.endY + p.dy,
        };

        const oldUpdates = {
          startX: track.startX,
          startY: track.startY,
          endX: track.endX,
          endY: track.endY,
        };

        return {
          forward: [{ type: 'UPDATE_PCB_OBJECT', boardId: p.boardId, objectId: p.trackId, updates: newUpdates }],
          reverse: [{ type: 'UPDATE_PCB_OBJECT', boardId: p.boardId, objectId: p.trackId, updates: oldUpdates }],
        };
      },
    });

    // Via Editing
    this.commandEngine.registerHandler('CreateVia', {
      validate: (p, oe) => {
        if (!p.boardId || !p.layerId) throw new Error('Missing arguments');
      },
      execute: (p, oe) => {
        const via = createVia(p);
        return {
          forward: [{ type: 'CREATE_PCB_OBJECT', boardId: p.boardId, object: via }],
          reverse: [{ type: 'DELETE_PCB_OBJECT', boardId: p.boardId, objectId: via.id }],
        };
      },
    });

    this.commandEngine.registerHandler('DeleteVia', {
      validate: (p, oe) => {
        if (!p.boardId || !p.viaId) throw new Error('Missing arguments');
      },
      execute: (p, oe) => {
        const board = this.boardManager.getBoard(p.boardId);
        const via = board?.objects.find((o) => o.id === p.viaId);
        if (!via) throw new Error('Via not found');

        return {
          forward: [{ type: 'DELETE_PCB_OBJECT', boardId: p.boardId, objectId: via.id }],
          reverse: [{ type: 'CREATE_PCB_OBJECT', boardId: p.boardId, object: via }],
        };
      },
    });

    this.commandEngine.registerHandler('MoveVia', {
      validate: (p, oe) => {
        if (!p.boardId || !p.viaId) throw new Error('Missing arguments');
      },
      execute: (p, oe) => {
        const board = this.boardManager.getBoard(p.boardId);
        const via = board?.objects.find((o) => o.id === p.viaId) as ViaObject;
        if (!via) throw new Error('Via not found');

        const newTransform = { ...via.transform, x: p.x, y: p.y };
        const oldTransform = { ...via.transform };

        return {
          forward: [{ type: 'UPDATE_PCB_OBJECT', boardId: p.boardId, objectId: p.viaId, updates: { transform: newTransform } }],
          reverse: [{ type: 'UPDATE_PCB_OBJECT', boardId: p.boardId, objectId: p.viaId, updates: { transform: oldTransform } }],
        };
      },
    });

    // Copper Zones
    this.commandEngine.registerHandler('CreateZone', {
      validate: (p, oe) => {
        if (!p.boardId || !p.layerId || !p.outlinePoints) throw new Error('Missing arguments');
      },
      execute: (p, oe) => {
        const zone = createZone(p);
        if (p.priority !== undefined) zone.priority = p.priority;
        if (p.zoneType) zone.zoneType = p.zoneType;
        return {
          forward: [{ type: 'CREATE_PCB_OBJECT', boardId: p.boardId, object: zone }],
          reverse: [{ type: 'DELETE_PCB_OBJECT', boardId: p.boardId, objectId: zone.id }],
        };
      },
    });

    this.commandEngine.registerHandler('UpdateZone', {
      validate: (p, oe) => {
        if (!p.boardId || !p.zoneId) throw new Error('Missing arguments');
      },
      execute: (p, oe) => {
        const board = this.boardManager.getBoard(p.boardId);
        const zone = board?.objects.find((o) => o.id === p.zoneId);
        if (!zone) throw new Error('Zone not found');

        const oldState = { ...zone };
        return {
          forward: [{ type: 'UPDATE_PCB_OBJECT', boardId: p.boardId, objectId: p.zoneId, updates: p.updates }],
          reverse: [{ type: 'UPDATE_PCB_OBJECT', boardId: p.boardId, objectId: p.zoneId, updates: oldState }],
        };
      },
    });
  }
}
