/**
 * Physical Design Platform — Viewport Framework
 * PART 8: Pan, zoom, coordinate transforms, infinite canvas, grid rendering support
 */

import { PhysicalCoord, PhysicalBBox, PhysicalViewport, PhysicalGrid, PhysicalGridStyle } from './types';

// ── Viewport Manager ──────────────────────────────────────────────────────────

const MIN_ZOOM_NM_PER_PX = 1e-6;   // very far in
const MAX_ZOOM_NM_PER_PX = 1e6;    // very far out

export class PhysicalViewportManager {
  private vp: PhysicalViewport;

  constructor(width: number = 800, height: number = 600) {
    this.vp = {
      panX: 0,
      panY: 0,
      zoom: 1e-6, // 1 nm per screen px initially → 1 px = 1 nm (adjust with zoomToFit)
      width,
      height,
    };
  }

  // ── Accessors ────────────────────────────────────────────────────────────────

  getState(): Readonly<PhysicalViewport> {
    return { ...this.vp };
  }

  setState(state: PhysicalViewport): void {
    this.vp = { ...state };
    this.clampZoom();
  }

  setDimensions(width: number, height: number): void {
    this.vp.width = width;
    this.vp.height = height;
  }

  // ── Coordinate Transforms ─────────────────────────────────────────────────────

  /**
   * Convert world coordinate (nm) to screen pixel coordinate.
   * Screen origin is top-left. World increases right/down.
   * pan is the world coordinate at the screen center.
   */
  worldToScreen(world: PhysicalCoord): PhysicalCoord {
    const cx = this.vp.width / 2;
    const cy = this.vp.height / 2;
    return {
      x: cx + (world.x - this.vp.panX) * this.vp.zoom,
      y: cy + (world.y - this.vp.panY) * this.vp.zoom,
    };
  }

  screenToWorld(screen: PhysicalCoord): PhysicalCoord {
    const cx = this.vp.width / 2;
    const cy = this.vp.height / 2;
    return {
      x: (screen.x - cx) / this.vp.zoom + this.vp.panX,
      y: (screen.y - cy) / this.vp.zoom + this.vp.panY,
    };
  }

  worldDistanceToScreen(nm: number): number {
    return nm * this.vp.zoom;
  }

  screenDistanceToWorld(px: number): number {
    return px / this.vp.zoom;
  }

  // ── Pan ───────────────────────────────────────────────────────────────────────

  panByScreen(dx: number, dy: number): void {
    this.vp.panX -= dx / this.vp.zoom;
    this.vp.panY -= dy / this.vp.zoom;
  }

  panByWorld(dx: number, dy: number): void {
    this.vp.panX += dx;
    this.vp.panY += dy;
  }

  centerOn(world: PhysicalCoord): void {
    this.vp.panX = world.x;
    this.vp.panY = world.y;
  }

  // ── Zoom ──────────────────────────────────────────────────────────────────────

  /** Zoom around a screen point (e.g. mouse cursor) */
  zoomAtScreenPoint(factor: number, screenPt: PhysicalCoord): void {
    const worldBefore = this.screenToWorld(screenPt);
    this.vp.zoom = Math.max(MIN_ZOOM_NM_PER_PX, Math.min(MAX_ZOOM_NM_PER_PX, this.vp.zoom * factor));
    const worldAfter = this.screenToWorld(screenPt);
    this.vp.panX -= worldAfter.x - worldBefore.x;
    this.vp.panY -= worldAfter.y - worldBefore.y;
  }

  zoomIn(factor: number = 1.2): void {
    this.zoomAtCenter(factor);
  }

  zoomOut(factor: number = 1.2): void {
    this.zoomAtCenter(1 / factor);
  }

  private zoomAtCenter(factor: number): void {
    this.vp.zoom = Math.max(MIN_ZOOM_NM_PER_PX, Math.min(MAX_ZOOM_NM_PER_PX, this.vp.zoom * factor));
  }

  setZoom(zoom: number): void {
    this.vp.zoom = zoom;
    this.clampZoom();
  }

  getZoom(): number {
    return this.vp.zoom;
  }

  /** Fit the given world bbox into the viewport with optional margin */
  zoomToFit(bbox: PhysicalBBox, marginPx: number = 40): void {
    const bboxW = bbox.maxX - bbox.minX;
    const bboxH = bbox.maxY - bbox.minY;
    if (bboxW <= 0 || bboxH <= 0) return;

    const scaleX = (this.vp.width - 2 * marginPx) / bboxW;
    const scaleY = (this.vp.height - 2 * marginPx) / bboxH;
    this.vp.zoom = Math.max(MIN_ZOOM_NM_PER_PX, Math.min(MAX_ZOOM_NM_PER_PX, Math.min(scaleX, scaleY)));
    this.vp.panX = (bbox.minX + bbox.maxX) / 2;
    this.vp.panY = (bbox.minY + bbox.maxY) / 2;
  }

  // ── Viewport World Bounds ────────────────────────────────────────────────────

  getVisibleWorldBBox(): PhysicalBBox {
    const tl = this.screenToWorld({ x: 0, y: 0 });
    const br = this.screenToWorld({ x: this.vp.width, y: this.vp.height });
    return { minX: tl.x, minY: tl.y, maxX: br.x, maxY: br.y };
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private clampZoom(): void {
    this.vp.zoom = Math.max(MIN_ZOOM_NM_PER_PX, Math.min(MAX_ZOOM_NM_PER_PX, this.vp.zoom));
  }
}

// ── Grid Renderer Support ─────────────────────────────────────────────────────

export interface GridRenderData {
  /** World-space lines to render, in screen pixels */
  gridLines: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    major: boolean;
  }>;
  dotPositions: Array<{ x: number; y: number; major: boolean }>;
  kind: PhysicalGridStyle;
}

/**
 * Compute grid render data for the current viewport.
 * Limits density to avoid overdraw. Returns empty for 'none'.
 */
export function computeGridRenderData(
  grid: PhysicalGrid,
  viewport: PhysicalViewportManager,
  maxLines: number = 200
): GridRenderData {
  if (!grid.visible) {
    return { gridLines: [], dotPositions: [], kind: 'none' };
  }

  const vp = viewport.getState();
  const worldBBox = viewport.getVisibleWorldBBox();

  // Adaptive step: use multiples of spacing to avoid too many lines
  let stepX = grid.spacingX;
  let stepY = grid.spacingY;
  const minScreenSpacing = 8; // minimum px between lines
  while (stepX * vp.zoom < minScreenSpacing) {
    stepX *= 5;
    stepY *= 5;
  }

  const dotPositions: Array<{ x: number; y: number; major: boolean }> = [];
  const gridLines: GridRenderData['gridLines'] = [];

  const startX = Math.floor((worldBBox.minX - grid.originX) / stepX) * stepX + grid.originX;
  const startY = Math.floor((worldBBox.minY - grid.originY) / stepY) * stepY + grid.originY;

  const majorEvery = 5;
  let lx = 0;

  for (let wx = startX; wx <= worldBBox.maxX + stepX && lx < maxLines; wx += stepX, lx++) {
    const sx = vp.width / 2 + (wx - vp.panX) * vp.zoom;
    const major = Math.round((wx - grid.originX) / stepX) % majorEvery === 0;
    if (grid.kind === 'dots') {
      let ly = 0;
      for (let wy = startY; wy <= worldBBox.maxY + stepY && ly < maxLines; wy += stepY, ly++) {
        const sy = vp.height / 2 + (wy - vp.panY) * vp.zoom;
        dotPositions.push({ x: sx, y: sy, major });
      }
    } else {
      const sy1 = vp.height / 2 + (worldBBox.minY - vp.panY) * vp.zoom;
      const sy2 = vp.height / 2 + (worldBBox.maxY - vp.panY) * vp.zoom;
      gridLines.push({ x1: sx, y1: sy1, x2: sx, y2: sy2, major });
    }
  }

  if (grid.kind !== 'dots') {
    let ly = 0;
    for (let wy = startY; wy <= worldBBox.maxY + stepY && ly < maxLines; wy += stepY, ly++) {
      const sy = vp.height / 2 + (wy - vp.panY) * vp.zoom;
      const major = Math.round((wy - grid.originY) / stepY) % majorEvery === 0;
      const sx1 = vp.width / 2 + (worldBBox.minX - vp.panX) * vp.zoom;
      const sx2 = vp.width / 2 + (worldBBox.maxX - vp.panX) * vp.zoom;
      gridLines.push({ x1: sx1, y1: sy, x2: sx2, y2: sy, major });
    }
  }

  return { gridLines, dotPositions, kind: grid.kind };
}

// ── Default Grid ──────────────────────────────────────────────────────────────

export function createDefaultGrid(spacingMm: number = 0.1): PhysicalGrid {
  const spacingNm = Math.round(spacingMm * 1_000_000);
  return {
    kind: 'dots',
    spacingX: spacingNm,
    spacingY: spacingNm,
    originX: 0,
    originY: 0,
    visible: true,
    snapEnabled: true,
    color: '#444444',
    opacity: 0.5,
  };
}
