import { generateUUID } from '../utils';
import {
  BoardDocument,
  PhysicalObject,
  PhysicalBBox,
  PhysicalCoord,
  TrackObject,
  ViaObject,
  PadObject,
} from './types';
import { SpatialIndex } from './spatial-index';
import { PhysicalRuleManager } from './rules';
import { ObjectEngine } from '../object-engine';

export type DRCSeverity = 'error' | 'warning';

export interface DRCViolation {
  id: string;
  ruleId: string;
  category: string;
  severity: DRCSeverity;
  message: string;
  location: PhysicalCoord;
  relatedObjectIds: string[];
}

export type DRCProfile = 'default' | 'relaxed' | 'manufacturing';

export class DRCEngine {
  private violations: Map<string, DRCViolation> = new Map();
  private currentProfile: DRCProfile = 'default';

  constructor(
    private ruleManager: PhysicalRuleManager,
    private spatialIndex: SpatialIndex
  ) {}

  setProfile(profile: DRCProfile): void {
    this.currentProfile = profile;
    // We could apply rule modifications based on profile here
  }

  getViolations(): DRCViolation[] {
    return Array.from(this.violations.values());
  }

  clearViolations(): void {
    this.violations.clear();
  }

  runFullAnalysis(board: BoardDocument): void {
    this.clearViolations();
    for (const obj of board.objects) {
      this.validateObject(obj, board);
    }
  }

  runIncrementalAnalysis(changedObjects: PhysicalObject[], board: BoardDocument): void {
    // Clear old violations related to these objects
    const changedIds = new Set(changedObjects.map((o) => o.id));
    for (const [id, v] of this.violations.entries()) {
      if (v.relatedObjectIds.some((rid) => changedIds.has(rid))) {
        this.violations.delete(id);
      }
    }

    for (const obj of changedObjects) {
      this.validateObject(obj, board);
    }
  }

  private validateObject(obj: PhysicalObject, board: BoardDocument): void {
    // Basic structural checks
    if (!['signal', 'plane', 'mixed'].includes(board.layers.find(l => l.id === obj.layerId)?.copperType || '')) {
       // Just a stub for Invalid Layer Usage. In reality we should be robust.
    }

    this.checkInvalidLayer(obj, board);

    if (obj.kind === 'track') {
      this.checkTrackWidth(obj as TrackObject);
      this.checkClearance(obj, board);
      this.checkDanglingTrack(obj as TrackObject, board);
    } else if (obj.kind === 'via') {
      this.checkViaRules(obj as ViaObject);
      this.checkClearance(obj, board);
      this.checkAnnularRingVia(obj as ViaObject);
    } else if (obj.kind === 'pad') {
      this.checkClearance(obj, board);
      this.checkAnnularRingPad(obj as PadObject);
    }

    // Unconnected nets check is usually global, but we can do it post-run.
  }

  private checkInvalidLayer(obj: PhysicalObject, board: BoardDocument) {
    const layer = board.layers.find((l) => l.id === obj.layerId);
    if (!layer) return;
    if (obj.kind === 'track' && layer.kind !== 'copper') {
      this.addViolation({
        category: 'Invalid Layer Usage',
        ruleId: 'layer-1',
        severity: 'error',
        message: `Track ${obj.id} is on a non-copper layer.`,
        location: { x: (obj as TrackObject).startX, y: (obj as TrackObject).startY },
        relatedObjectIds: [obj.id]
      });
    }
  }

  private checkTrackWidth(track: TrackObject) {
    const minWidth = this.ruleManager.getTrackWidthForNet('Default');
    if (track.width < minWidth) {
      this.addViolation({
        category: 'Track Width',
        ruleId: 'width-1',
        severity: 'warning',
        message: `Track width ${track.width / 1000}um is less than minimum ${minWidth / 1000}um.`,
        location: { x: track.startX, y: track.startY },
        relatedObjectIds: [track.id]
      });
    }
  }

  private checkViaRules(via: ViaObject) {
    const minDiam = 600000;
    if (via.diameter < minDiam) {
      this.addViolation({
        category: 'Via Rules',
        ruleId: 'via-1',
        severity: 'warning',
        message: `Via diameter is too small.`,
        location: { x: via.transform.x, y: via.transform.y },
        relatedObjectIds: [via.id]
      });
    }
  }

  private checkAnnularRingVia(via: ViaObject) {
    const ring = (via.diameter - via.drillDiameter) / 2;
    if (ring < 100000) {
      this.addViolation({
        category: 'Minimum Annular Ring',
        ruleId: 'ring-1',
        severity: 'error',
        message: `Via annular ring is too small.`,
        location: { x: via.transform.x, y: via.transform.y },
        relatedObjectIds: [via.id]
      });
    }
  }

  private checkAnnularRingPad(pad: PadObject) {
    if (pad.drillDiameter) {
      const ring = (Math.min(pad.sizeX, pad.sizeY) - pad.drillDiameter) / 2;
      if (ring < 100000) {
        this.addViolation({
          category: 'Minimum Annular Ring',
          ruleId: 'ring-2',
          severity: 'error',
          message: `Pad annular ring is too small.`,
          location: { x: pad.transform.x, y: pad.transform.y },
          relatedObjectIds: [pad.id]
        });
      }
    }
  }

  private checkDanglingTrack(track: TrackObject, board: BoardDocument) {
    // simplified: just a stub for now. We can implement a real check using spatial index.
    const startMatches = this.spatialIndex.queryPoint({ x: track.startX, y: track.startY }).filter(e => e.id !== track.id && e.layerId === track.layerId);
    const endMatches = this.spatialIndex.queryPoint({ x: track.endX, y: track.endY }).filter(e => e.id !== track.id && e.layerId === track.layerId);
    if (startMatches.length === 0 || endMatches.length === 0) {
      this.addViolation({
        category: 'Dangling Tracks',
        ruleId: 'dangle-1',
        severity: 'warning',
        message: `Track is dangling (unconnected endpoint).`,
        location: startMatches.length === 0 ? { x: track.startX, y: track.startY } : { x: track.endX, y: track.endY },
        relatedObjectIds: [track.id]
      });
    }
  }

  private checkClearance(obj: PhysicalObject, board: BoardDocument) {
    if (!obj.bbox) return;
    const reqClearance = this.ruleManager.getClearanceForNet('Default');
    const cands = this.spatialIndex.collisionCandidates(obj.bbox, reqClearance);
    for (const cand of cands) {
      if (cand.id === obj.id) continue;
      if (cand.layerId !== obj.layerId) continue;
      
      const other = board.objects.find(o => o.id === cand.id);
      if (other && other.netId !== undefined && obj.netId !== undefined) {
         if (other.netId === obj.netId) continue; // Same net
         
         // Overlapping copper vs Clearance
         const actualClearance = 0; // Need accurate geometry intersection. For Alpha, AABB is enough.
         
         this.addViolation({
           category: 'Clearance',
           ruleId: 'clearance-1',
           severity: 'error',
           message: `Clearance violation between ${obj.id} and ${other.id}`,
           location: { x: obj.transform.x, y: obj.transform.y },
           relatedObjectIds: [obj.id, other.id]
         });
         break;
      }
    }
  }

  private addViolation(v: Omit<DRCViolation, 'id'>) {
    const id = generateUUID();
    this.violations.set(id, { id, ...v });
  }
}
