/**
 * Physical Design Platform — Snapping Framework
 * PART 9: Grid, object, vertex, center, endpoint, intersection, layer-aware snapping
 */

import {
  PhysicalCoord,
  PhysicalBBox,
  PhysicalGrid,
  PhysicalObject,
  SnapCandidate,
  PhysicalSnapResult,
  SnapType,
} from './types';
import { SpatialIndex } from './spatial-index';
import { PhysicalViewportManager } from './viewport';
import { distancePoints } from './geometry';

// ── Snap Configuration ────────────────────────────────────────────────────────

export interface SnapConfig {
  enableGrid: boolean;
  enableVertex: boolean;
  enableEndpoint: boolean;
  enableCenter: boolean;
  enableMidpoint: boolean;
  enableIntersection: boolean;
  enablePadCenter: boolean;
  enableViaCenter: boolean;
  snapRadiusPx: number;  // screen pixels
  layerFilter?: string[];
}

export function defaultSnapConfig(): SnapConfig {
  return {
    enableGrid: true,
    enableVertex: true,
    enableEndpoint: true,
    enableCenter: true,
    enableMidpoint: true,
    enableIntersection: false, // heavy — disabled by default
    enablePadCenter: true,
    enableViaCenter: true,
    snapRadiusPx: 10,
  };
}

// ── Snapping Engine ───────────────────────────────────────────────────────────

export class PhysicalSnappingEngine {
  private config: SnapConfig = defaultSnapConfig();

  constructor(
    private objectGetter: (id: string) => PhysicalObject | undefined,
    private spatialIndex: SpatialIndex,
    private viewport: PhysicalViewportManager
  ) {}

  setConfig(config: Partial<SnapConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): SnapConfig {
    return { ...this.config };
  }

  /**
   * Primary snap function: given a world-space cursor position, return
   * the best snap candidate within the snap radius.
   */
  snap(cursorWorld: PhysicalCoord, grid: PhysicalGrid): PhysicalSnapResult {
    const snapRadiusNm = this.viewport.screenDistanceToWorld(this.config.snapRadiusPx);
    const candidates: SnapCandidate[] = [];

    // 1. Collect object snap candidates
    const searchBBox: PhysicalBBox = {
      minX: cursorWorld.x - snapRadiusNm,
      minY: cursorWorld.y - snapRadiusNm,
      maxX: cursorWorld.x + snapRadiusNm,
      maxY: cursorWorld.y + snapRadiusNm,
    };
    const nearbyEntries = this.spatialIndex.queryBox(searchBBox);

    for (const entry of nearbyEntries) {
      if (this.config.layerFilter && !this.config.layerFilter.includes(entry.layerId)) {
        continue;
      }
      const obj = this.objectGetter(entry.id);
      if (!obj || !obj.visible) continue;

      const objCandidates = this.getObjectSnapCandidates(obj, cursorWorld, snapRadiusNm);
      candidates.push(...objCandidates);
    }

    // 2. Grid snap
    if (this.config.enableGrid && grid.snapEnabled) {
      const gridPt = this.snapToGrid(cursorWorld, grid);
      const dist = distancePoints(cursorWorld, gridPt);
      candidates.push({ type: 'grid', point: gridPt, distance: dist });
    }

    // 3. Pick best candidate (lowest distance)
    if (candidates.length === 0) {
      return { snapped: false, point: cursorWorld };
    }

    // Object snaps take priority over grid at equal distance
    const objectCandidates = candidates.filter((c) => c.type !== 'grid');
    const gridCandidates = candidates.filter((c) => c.type === 'grid');

    const bestObject = objectCandidates.length > 0
      ? objectCandidates.reduce((a, b) => a.distance < b.distance ? a : b)
      : null;
    const bestGrid = gridCandidates.length > 0
      ? gridCandidates.reduce((a, b) => a.distance < b.distance ? a : b)
      : null;

    let best: SnapCandidate | null = null;
    if (bestObject && (!bestGrid || bestObject.distance <= bestGrid.distance + 1)) {
      best = bestObject;
    } else if (bestGrid) {
      best = bestGrid;
    }

    if (!best) return { snapped: false, point: cursorWorld };
    return { snapped: true, point: best.point, candidate: best };
  }

  // ── Grid Snap ────────────────────────────────────────────────────────────────

  snapToGrid(pt: PhysicalCoord, grid: PhysicalGrid): PhysicalCoord {
    return {
      x: Math.round((pt.x - grid.originX) / grid.spacingX) * grid.spacingX + grid.originX,
      y: Math.round((pt.y - grid.originY) / grid.spacingY) * grid.spacingY + grid.originY,
    };
  }

  // ── Object Snap Candidates ────────────────────────────────────────────────────

  private getObjectSnapCandidates(
    obj: PhysicalObject,
    cursor: PhysicalCoord,
    radiusNm: number
  ): SnapCandidate[] {
    const candidates: SnapCandidate[] = [];
    const layerId = obj.layerId;

    switch (obj.kind) {
      case 'pad': {
        if (this.config.enablePadCenter || this.config.enableCenter) {
          const pt = { x: obj.transform.x, y: obj.transform.y };
          const dist = distancePoints(cursor, pt);
          if (dist <= radiusNm) {
            candidates.push({ type: 'pad-center', point: pt, objectId: obj.id, layerId, distance: dist });
          }
        }
        if (this.config.enableVertex) {
          const hw = obj.sizeX / 2, hh = obj.sizeY / 2;
          const cx = obj.transform.x, cy = obj.transform.y;
          const corners = [
            { x: cx - hw, y: cy - hh },
            { x: cx + hw, y: cy - hh },
            { x: cx + hw, y: cy + hh },
            { x: cx - hw, y: cy + hh },
          ];
          for (const c of corners) {
            const dist = distancePoints(cursor, c);
            if (dist <= radiusNm) {
              candidates.push({ type: 'vertex', point: c, objectId: obj.id, layerId, distance: dist });
            }
          }
        }
        break;
      }
      case 'via': {
        if (this.config.enableViaCenter || this.config.enableCenter) {
          const pt = { x: obj.transform.x, y: obj.transform.y };
          const dist = distancePoints(cursor, pt);
          if (dist <= radiusNm) {
            candidates.push({ type: 'via-center', point: pt, objectId: obj.id, layerId, distance: dist });
          }
        }
        break;
      }
      case 'track': {
        if (this.config.enableEndpoint) {
          const pts = [{ x: obj.startX, y: obj.startY }, { x: obj.endX, y: obj.endY }];
          for (const pt of pts) {
            const dist = distancePoints(cursor, pt);
            if (dist <= radiusNm) {
              candidates.push({ type: 'endpoint', point: pt, objectId: obj.id, layerId, distance: dist });
            }
          }
        }
        if (this.config.enableMidpoint) {
          const mid = { x: (obj.startX + obj.endX) / 2, y: (obj.startY + obj.endY) / 2 };
          const dist = distancePoints(cursor, mid);
          if (dist <= radiusNm) {
            candidates.push({ type: 'midpoint', point: mid, objectId: obj.id, layerId, distance: dist });
          }
        }
        break;
      }
      case 'zone': {
        if (this.config.enableVertex) {
          for (const pt of obj.outlinePoints) {
            const dist = distancePoints(cursor, pt);
            if (dist <= radiusNm) {
              candidates.push({ type: 'vertex', point: pt, objectId: obj.id, layerId, distance: dist });
            }
          }
        }
        if (this.config.enableCenter && obj.outlinePoints.length > 0) {
          const cx = obj.outlinePoints.reduce((s, p) => s + p.x, 0) / obj.outlinePoints.length;
          const cy = obj.outlinePoints.reduce((s, p) => s + p.y, 0) / obj.outlinePoints.length;
          const pt = { x: cx, y: cy };
          const dist = distancePoints(cursor, pt);
          if (dist <= radiusNm) {
            candidates.push({ type: 'center', point: pt, objectId: obj.id, layerId, distance: dist });
          }
        }
        break;
      }
      default:
        break;
    }

    return candidates;
  }

  // ── Layer-aware snap ──────────────────────────────────────────────────────────

  setLayerFilter(layerIds: string[] | undefined): void {
    this.config.layerFilter = layerIds;
  }

  clearLayerFilter(): void {
    this.config.layerFilter = undefined;
  }
}
