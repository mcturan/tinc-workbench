import { Coordinate, ViewportState } from '../types';

export class CanvasEngine {
  private viewport: ViewportState = {
    zoom: 1.0,
    panX: 0,
    panY: 0,
  };

  private width = 800;
  private height = 600;

  constructor() {}

  setViewportDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  getViewportState(): ViewportState {
    return { ...this.viewport };
  }

  applyViewportState(state: ViewportState): void {
    this.viewport.zoom = Math.max(0.1, Math.min(10.0, state.zoom));
    this.viewport.panX = state.panX;
    this.viewport.panY = state.panY;
  }

  zoomIn(): void {
    this.setZoom(this.viewport.zoom * 1.2);
  }

  zoomOut(): void {
    this.setZoom(this.viewport.zoom / 1.2);
  }

  setZoom(zoom: number): void {
    this.viewport.zoom = Math.max(0.1, Math.min(10.0, zoom));
  }

  pan(dx: number, dy: number): void {
    this.viewport.panX += dx;
    this.viewport.panY += dy;
  }

  worldToScreen(worldPt: Coordinate): Coordinate {
    // Transform: scale around canvas center offset by pan
    const cx = this.width / 2;
    const cy = this.height / 2;
    return {
      x: (worldPt.x - this.viewport.panX) * this.viewport.zoom + cx,
      y: (worldPt.y - this.viewport.panY) * this.viewport.zoom + cy,
    };
  }

  screenToWorld(screenPt: Coordinate): Coordinate {
    const cx = this.width / 2;
    const cy = this.height / 2;
    return {
      x: (screenPt.x - cx) / this.viewport.zoom + this.viewport.panX,
      y: (screenPt.y - cy) / this.viewport.zoom + this.viewport.panY,
    };
  }

  centerViewport(worldPt: Coordinate): void {
    this.viewport.panX = worldPt.x;
    this.viewport.panY = worldPt.y;
  }
}
