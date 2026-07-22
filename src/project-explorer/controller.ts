import { ObjectEngine } from '../object-engine';
import { SelectionEngine } from '../selection-engine';
import { CanvasEngine } from '../canvas-engine';
import { GeometryEngine } from '../geometry-engine';
import { SemanticObject, Coordinate } from '../types';
import { getLabel, listSignals } from '../net-labels';
import { getBus } from '../pro-schematic/bus/manager';
import { getAnnotation } from '../pro-schematic/annotation/manager';
import { getConnector } from '../pro-schematic/connectors/manager';

export class ExplorerController {
  constructor(
    private objectEngine: ObjectEngine,
    private selectionEngine: SelectionEngine,
    private canvasEngine: CanvasEngine,
    private geometryEngine: GeometryEngine,
    private onSelectionChanged: (selectedIds: string[]) => void
  ) {}

  handleNodeClick(id: string, type: string): void {
    if (
      type === 'component' ||
      type === 'wire' ||
      type === 'net-label' ||
      type === 'global-signal' ||
      type === 'bus' ||
      type === 'annotation' ||
      type === 'connector' ||
      type === 'net-class'
    ) {
      this.selectionEngine.select(id);
      this.onSelectionChanged(this.selectionEngine.getSelectedIds());
    } else if (type === 'sheet') {
      this.selectionEngine.clear();
      this.onSelectionChanged([]);
    }
  }

  handleNodeDblClick(id: string, type: string): void {
    this.focusObject(id, undefined, type);
  }

  focusObject(id: string, canvasEngine?: CanvasEngine, type?: string): void {
    let targetCoord: Coordinate | null = null;

    if (type === 'net-label') {
      const label = getLabel(id);
      if (label) {
        targetCoord = label.position;
      }
    } else if (type === 'global-signal') {
      const sig = listSignals().find(s => s.name === id);
      if (sig && sig.labels.length > 0) {
        const firstLabel = getLabel(sig.labels[0]);
        if (firstLabel) {
          targetCoord = firstLabel.position;
        }
      }
    } else if (type === 'bus') {
      const bus = getBus(id);
      if (bus && bus.segments.length > 0) {
        targetCoord = bus.segments[0].start;
      }
    } else if (type === 'annotation') {
      const anno = getAnnotation(id);
      if (anno) {
        targetCoord = anno.position;
      }
    } else if (type === 'connector') {
      const conn = getConnector(id);
      if (conn) {
        targetCoord = conn.position;
      }
    } else if (this.objectEngine.getWires().some(w => w.id === id)) {
      const wire = this.objectEngine.getWire(id);
      if (wire && wire.segments.length > 0) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const seg of wire.segments) {
          minX = Math.min(minX, seg.start.x, seg.end.x);
          maxX = Math.max(maxX, seg.start.x, seg.end.x);
          minY = Math.min(minY, seg.start.y, seg.end.y);
          maxY = Math.max(maxY, seg.start.y, seg.end.y);
        }
        targetCoord = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
      }
    } else {
      const comp = this.objectEngine.getObject(id) as SemanticObject;
      if (comp) {
        const bounds = this.geometryEngine.getComponentBounds(comp);
        targetCoord = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      }
    }

    if (targetCoord) {
      const activeCanvas = canvasEngine || this.canvasEngine;
      activeCanvas.centerViewport(targetCoord);
    }
  }
}
