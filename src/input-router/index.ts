import { CanvasEngine } from '../canvas-engine';
import { Coordinate } from '../types';

export class InputRouter {
  constructor(private canvasEngine: CanvasEngine) {}

  // Normalize browser pointer client coordinates to canvas world space coordinates
  normalizeEvent(e: { clientX: number; clientY: number }, canvasElement: HTMLCanvasElement): Coordinate {
    const rect = canvasElement.getBoundingClientRect();
    const screenPt = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    return this.canvasEngine.screenToWorld(screenPt);
  }
}
