import { Coordinate } from '../../types';
import { ObjectEngine } from '../../object-engine';
import { GeometryEngine } from '../../geometry-engine';

export interface SnapResult {
  co: Coordinate;
  type: string;
  distance: number;
}

export class SnapEngine {
  private geometryEngine = new GeometryEngine();

  constructor(private gridSize: number = 10, private snapTolerance: number = 6) {}

  snap(
    pos: Coordinate,
    objectEngine: ObjectEngine,
    extraPoints: Coordinate[] = []
  ): SnapResult {
    let bestCo = { ...pos };
    let bestType = 'None';
    let minDistance = Infinity;

    const gridX = Math.round(pos.x / this.gridSize) * this.gridSize;
    const gridY = Math.round(pos.y / this.gridSize) * this.gridSize;
    const gridDist = Math.hypot(pos.x - gridX, pos.y - gridY);
    if (gridDist < minDistance) {
      bestCo = { x: gridX, y: gridY };
      bestType = 'Grid';
      minDistance = gridDist;
    }

    const project = objectEngine.getProject();
    if (project.pages && project.pages.length > 0) {
      for (const page of project.pages) {
        for (const layer of page.layers || []) {
          for (const comp of layer.objects || []) {
            if (comp.ports) {
              for (const port of comp.ports) {
                const portCo = this.geometryEngine.getTerminalWorldCoordinate(comp, port.id);
                const d = Math.hypot(pos.x - portCo.x, pos.y - portCo.y);
                if (d < this.snapTolerance && (d < minDistance || bestType === 'Grid')) {
                  bestCo = { ...portCo };
                  bestType = 'Pin';
                  minDistance = d;
                }
              }
            }
          }
        }
      }
    }

    const wires = objectEngine.getWires();
    for (const wire of wires) {
      for (const seg of wire.segments) {
        const dStart = Math.hypot(pos.x - seg.start.x, pos.y - seg.start.y);
        if (dStart < this.snapTolerance && (dStart < minDistance || bestType === 'Grid')) {
          bestCo = { ...seg.start };
          bestType = 'Endpoint';
          minDistance = dStart;
        }

        const dEnd = Math.hypot(pos.x - seg.end.x, pos.y - seg.end.y);
        if (dEnd < this.snapTolerance && (dEnd < minDistance || bestType === 'Grid')) {
          bestCo = { ...seg.end };
          bestType = 'Endpoint';
          minDistance = dEnd;
        }

        const midX = (seg.start.x + seg.end.x) / 2;
        const midY = (seg.start.y + seg.end.y) / 2;
        const dMid = Math.hypot(pos.x - midX, pos.y - midY);
        if (dMid < this.snapTolerance && (dMid < minDistance || bestType === 'Grid')) {
          bestCo = { x: midX, y: midY };
          bestType = 'Midpoint';
          minDistance = dMid;
        }
      }
    }

    for (const pt of extraPoints) {
      const d = Math.hypot(pos.x - pt.x, pos.y - pt.y);
      if (d < this.snapTolerance && (d < minDistance || bestType === 'Grid')) {
        bestCo = { ...pt };
        bestType = 'Center';
        minDistance = d;
      }
    }

    return { co: bestCo, type: bestType, distance: minDistance };
  }
}
