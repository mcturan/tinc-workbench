/**
 * Physical Design Platform — Rendering Foundation
 * PART 13: Layer rendering, visibility, object styles, selection highlighting, grid
 */

import {
  PhysicalObject,
  PhysicalLayer,
  PadObject,
  ViaObject,
  TrackObject,
  ZoneObject,
  TextObject,
  GraphicObject,
  DimensionObject,
  MountingHoleObject,
  FootprintInstance,
  PhysicalBBox,
  PhysicalCoord,
} from './types';
import { PhysicalViewportManager } from './viewport';
import { PhysicalSelectionEngine } from './selection';
import { computeGridRenderData } from './viewport';
import { PhysicalGrid } from './types';
import { transformCoord } from './pcb-editor';

// ── Style ─────────────────────────────────────────────────────────────────────

export interface PhysicalRenderStyle {
  strokeColor?: string;
  fillColor?: string;
  lineWidth?: number;         // screen px
  opacity?: number;
  selectionStroke?: string;
  selectionLineWidth?: number;
  hoverStroke?: string;
  fontSize?: number;
}

const SELECTION_COLOR = '#00AAFF';
const HOVER_COLOR = '#00FF88';

// ── Board Renderer ─────────────────────────────────────────────────────────────

export class PhysicalBoardRenderer {
  constructor(
    private viewport: PhysicalViewportManager,
    private selectionEngine?: PhysicalSelectionEngine,
    private boardManager?: any
  ) {}

  /**
   * Main render entry point. Layers are rendered bottom-to-top.
   * Objects on each layer are culled by the visible viewport bbox.
   */
  render(
    ctx: CanvasRenderingContext2D,
    layers: PhysicalLayer[],
    objects: PhysicalObject[],
    footprints: FootprintInstance[],
    grid: PhysicalGrid,
    options?: {
      hoveredId?: string | null;
      routingPreview?: { start: PhysicalCoord; end: PhysicalCoord; width: number; layerId: string }[];
      routingVias?: { x: number; y: number; diameter: number; drillDiameter: number }[];
      livePreviewObject?: any;
      snapPreview?: PhysicalCoord | null;
      drcViolations?: { id: string; location: PhysicalCoord; severity: string }[];
    }
  ): void {
    const vp = this.viewport.getState();
    const viewBBox = this.viewport.getVisibleWorldBBox();

    // 1. Clear
    ctx.clearRect(0, 0, vp.width, vp.height);
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, vp.width, vp.height);

    // 2. Grid
    this.renderGrid(ctx, grid);

    // 3. Sort layers by order (ascending)
    const sortedLayers = [...layers].sort((a, b) => a.order - b.order);

    // 4. Render objects per layer
    for (const layer of sortedLayers) {
      if (!layer.visible) continue;

      ctx.save();
      ctx.globalAlpha = layer.opacity;

      const layerObjects = objects.filter(
        (o) => o.layerId === layer.id && this.isInViewport(o, viewBBox)
      );

      for (const obj of layerObjects) {
        if (!obj.visible) continue;
        this.renderObject(ctx, obj, layer, vp.zoom);
      }

      ctx.restore();
    }

    // 5. Render footprint instances
    for (const fp of footprints) {
      if (fp.bbox && this.bboxInView(fp.bbox, viewBBox)) {
        this.renderFootprintInstance(ctx, fp, vp.zoom);
      }
    }

    // 6. Selection box overlay
    const selBox = this.selectionEngine?.getBoxSelectRect();
    if (selBox) {
      this.renderSelectionBox(ctx, selBox);
    }

    // 7. Routing Preview rendering
    if (options?.routingPreview) {
      for (const rp of options.routingPreview) {
        const s = this.viewport.worldToScreen(rp.start);
        const e = this.viewport.worldToScreen(rp.end);
        ctx.strokeStyle = '#00AAFF'; // routing color
        ctx.lineWidth = Math.max(1, rp.width * vp.zoom);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(e.x, e.y);
        ctx.stroke();
      }
    }

    if (options?.routingVias) {
      for (const via of options.routingVias) {
        const sc = this.viewport.worldToScreen({ x: via.x, y: via.y });
        const r = Math.max(1, (via.diameter / 2) * vp.zoom);
        const dr = Math.max(0.5, (via.drillDiameter / 2) * vp.zoom);

        ctx.fillStyle = '#00AAFF'; // ghost via color
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#141414';
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, dr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 8. Live preview of object to place
    if (options?.livePreviewObject) {
      const p = options.livePreviewObject;
      if (p.kind === 'footprint' || p.definitionId) {
        this.renderFootprintInstance(ctx, p, vp.zoom);
      } else {
        const dummyL = { id: p.layerId, name: 'Preview', color: '#00FFCC', opacity: 0.8, visible: true, locked: false, order: 999, kind: 'copper' as any, side: 'front' as any };
        this.renderObject(ctx, p, dummyL, vp.zoom);
      }
    }

    // 9. Snap dot preview
    if (options?.snapPreview) {
      const sp = this.viewport.worldToScreen(options.snapPreview);
      ctx.fillStyle = '#00FF88';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 10. DRC Violations
    if (options?.drcViolations) {
      for (const v of options.drcViolations) {
        const isSelected = this.selectionEngine?.isSelected(v.id) ?? false;
        const sp = this.viewport.worldToScreen(v.location);
        const radius = isSelected ? 12 : 8;
        ctx.fillStyle = v.severity === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(245, 158, 11, 0.9)';
        
        ctx.beginPath();
        // Draw an octagon or circle for the marker
        ctx.arc(sp.x, sp.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        if (isSelected) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${radius}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', sp.x, sp.y);
      }
    }
  }

  // ── Grid ──────────────────────────────────────────────────────────────────────

  private renderGrid(ctx: CanvasRenderingContext2D, grid: PhysicalGrid): void {
    const data = computeGridRenderData(grid, this.viewport);
    const color = grid.color ?? '#444444';
    const alpha = grid.opacity ?? 0.5;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;

    if (data.kind === 'dots') {
      for (const dot of data.dotPositions) {
        ctx.fillRect(dot.x - (dot.major ? 1.5 : 0.75), dot.y - (dot.major ? 1.5 : 0.75), dot.major ? 3 : 1.5, dot.major ? 3 : 1.5);
      }
    } else if (data.kind === 'lines') {
      ctx.beginPath();
      for (const line of data.gridLines) {
        ctx.lineWidth = line.major ? 0.5 : 0.3;
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── Objects ───────────────────────────────────────────────────────────────────

  private renderObject(
    ctx: CanvasRenderingContext2D,
    obj: PhysicalObject,
    layer: PhysicalLayer,
    zoom: number
  ): void {
    const isSelected = this.selectionEngine?.isSelected(obj.id) ?? false;
    const isHovered = this.selectionEngine?.getHoveredId() === obj.id;
    const layerColor = layer.color;

    ctx.save();

    switch (obj.kind) {
      case 'track': this.renderTrack(ctx, obj as TrackObject, layerColor, zoom, isSelected, isHovered); break;
      case 'via': this.renderVia(ctx, obj as ViaObject, layerColor, zoom, isSelected, isHovered); break;
      case 'pad': this.renderPad(ctx, obj as PadObject, layerColor, zoom, isSelected, isHovered); break;
      case 'zone': this.renderZone(ctx, obj as ZoneObject, layerColor, zoom, isSelected); break;
      case 'text': this.renderText(ctx, obj as TextObject, layerColor, zoom); break;
      case 'graphic': this.renderGraphic(ctx, obj as GraphicObject, layerColor, zoom, isSelected); break;
      case 'dimension': this.renderDimension(ctx, obj as DimensionObject, layerColor, zoom); break;
      case 'mounting-hole': this.renderMountingHole(ctx, obj as MountingHoleObject, zoom, isSelected); break;
      default: break;
    }

    ctx.restore();
  }

  private renderTrack(
    ctx: CanvasRenderingContext2D,
    t: TrackObject,
    color: string,
    zoom: number,
    selected: boolean,
    hovered: boolean
  ): void {
    const s = this.viewport.worldToScreen({ x: t.startX, y: t.startY });
    const e = this.viewport.worldToScreen({ x: t.endX, y: t.endY });
    ctx.strokeStyle = selected ? SELECTION_COLOR : hovered ? HOVER_COLOR : color;
    ctx.lineWidth = Math.max(1, t.width * zoom);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(e.x, e.y);
    ctx.stroke();
  }

  private renderVia(
    ctx: CanvasRenderingContext2D,
    v: ViaObject,
    color: string,
    zoom: number,
    selected: boolean,
    hovered: boolean
  ): void {
    const sc = this.viewport.worldToScreen({ x: v.transform.x, y: v.transform.y });
    const r = Math.max(1, (v.diameter / 2) * zoom);
    const dr = Math.max(0.5, (v.drillDiameter / 2) * zoom);

    ctx.fillStyle = selected ? SELECTION_COLOR : hovered ? HOVER_COLOR : color;
    ctx.beginPath();
    ctx.arc(sc.x, sc.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.arc(sc.x, sc.y, dr, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderPad(
    ctx: CanvasRenderingContext2D,
    p: PadObject,
    color: string,
    zoom: number,
    selected: boolean,
    hovered: boolean
  ): void {
    const sc = this.viewport.worldToScreen({ x: p.transform.x, y: p.transform.y });
    const sw = Math.max(1, p.sizeX * zoom);
    const sh = Math.max(1, p.sizeY * zoom);

    ctx.fillStyle = selected ? SELECTION_COLOR : hovered ? HOVER_COLOR : color;

    if (p.padShape === 'circle') {
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, sw / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(sc.x - sw / 2, sc.y - sh / 2, sw, sh);
    }

    // Pad number label
    if (sw > 8) {
      ctx.fillStyle = '#000000';
      ctx.font = `${Math.max(8, sw * 0.4)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.padNumber, sc.x, sc.y);
    }
  }

  private renderZone(
    ctx: CanvasRenderingContext2D,
    z: ZoneObject,
    color: string,
    zoom: number,
    selected: boolean
  ): void {
    if (z.outlinePoints.length < 2) return;
    const sc = z.outlinePoints.map((p) => this.viewport.worldToScreen(p));
    ctx.strokeStyle = selected ? SELECTION_COLOR : color;
    ctx.lineWidth = Math.max(1, (z.minWidth ?? 100_000) * zoom);
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(sc[0].x, sc[0].y);
    for (let i = 1; i < sc.length; i++) ctx.lineTo(sc[i].x, sc[i].y);
    ctx.closePath();
    ctx.stroke();
    if (z.fillType === 'solid' && !selected) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.setLineDash([]);
  }

  private renderText(ctx: CanvasRenderingContext2D, t: TextObject, color: string, zoom: number): void {
    const sc = this.viewport.worldToScreen({ x: t.transform.x, y: t.transform.y });
    const fsz = Math.max(8, t.fontSizeUm * 0.001 * zoom);
    ctx.fillStyle = color;
    ctx.font = `${t.bold ? 'bold ' : ''}${t.italic ? 'italic ' : ''}${fsz}px monospace`;
    ctx.textAlign = t.justification === 'left' ? 'left' : t.justification === 'right' ? 'right' : 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(sc.x, sc.y);
    if (t.transform.rotation) ctx.rotate((t.transform.rotation * Math.PI) / 180);
    ctx.fillText(t.text, 0, 0);
    ctx.restore();
  }

  private renderGraphic(
    ctx: CanvasRenderingContext2D,
    g: GraphicObject,
    color: string,
    zoom: number,
    selected: boolean
  ): void {
    ctx.strokeStyle = selected ? SELECTION_COLOR : g.strokeColor ?? color;
    ctx.lineWidth = Math.max(0.5, g.width * zoom);
    ctx.fillStyle = g.fillColor ?? color;

    if (g.shape === 'line' && g.startX !== undefined && g.startY !== undefined && g.endX !== undefined && g.endY !== undefined) {
      const s = this.viewport.worldToScreen({ x: g.startX, y: g.startY });
      const e = this.viewport.worldToScreen({ x: g.endX, y: g.endY });
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
    } else if (g.shape === 'circle' && g.centerX !== undefined && g.centerY !== undefined && g.radius !== undefined) {
      const sc = this.viewport.worldToScreen({ x: g.centerX, y: g.centerY });
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, g.radius * zoom, 0, Math.PI * 2);
      if (g.filled) ctx.fill();
      ctx.stroke();
    } else if ((g.shape === 'polygon' || g.shape === 'rectangle') && g.points && g.points.length >= 2) {
      ctx.beginPath();
      const first = this.viewport.worldToScreen(g.points[0]);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < g.points.length; i++) {
        const pt = this.viewport.worldToScreen(g.points[i]);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();
      if (g.filled) ctx.fill();
      ctx.stroke();
    }
  }

  private renderDimension(ctx: CanvasRenderingContext2D, d: DimensionObject, color: string, zoom: number): void {
    const s = this.viewport.worldToScreen({ x: d.startX, y: d.startY });
    const e = this.viewport.worldToScreen({ x: d.endX, y: d.endY });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(e.x, e.y);
    ctx.stroke();
    // Arrow heads (simplified)
    const dx = e.x - s.x, dy = e.y - s.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      const ux = dx / len, uy = dy / len;
      const arrowLen = 8;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + ux * arrowLen - uy * 3, s.y + uy * arrowLen + ux * 3);
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + ux * arrowLen + uy * 3, s.y + uy * arrowLen - ux * 3);
      ctx.stroke();
    }
  }

  private renderMountingHole(ctx: CanvasRenderingContext2D, mh: MountingHoleObject, zoom: number, selected: boolean): void {
    const sc = this.viewport.worldToScreen({ x: mh.transform.x, y: mh.transform.y });
    const outerR = Math.max(1, (mh.padDiameter / 2) * zoom);
    const innerR = Math.max(0.5, (mh.drillDiameter / 2) * zoom);
    ctx.strokeStyle = selected ? SELECTION_COLOR : '#FFFF00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sc.x, sc.y, outerR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(sc.x, sc.y, innerR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private renderFootprintInstance(ctx: CanvasRenderingContext2D, fp: FootprintInstance, zoom: number): void {
    if (!fp.bbox) return;
    const tl = this.viewport.worldToScreen({ x: fp.bbox.minX, y: fp.bbox.minY });
    const br = this.viewport.worldToScreen({ x: fp.bbox.maxX, y: fp.bbox.maxY });
    const isSelected = this.selectionEngine?.isSelected(fp.id) ?? false;
    
    // Draw bounding box
    ctx.strokeStyle = isSelected ? SELECTION_COLOR : '#888888';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 2]);
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    ctx.setLineDash([]);

    // Draw reference label
    if (br.x - tl.x > 20) {
      ctx.fillStyle = '#CCCCCC';
      ctx.font = `${Math.max(9, 11 * zoom * 1e-6)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(fp.reference, (tl.x + br.x) / 2, tl.y - 4);
    }

    // Draw internal details if boardManager is provided
    const def = this.boardManager ? this.boardManager.getDefinition(fp.definitionId) : null;
    if (def) {
      // Draw pads
      for (const pad of def.pads) {
        const padWorldCoord = transformCoord(pad.transform, fp.transform);
        const padWorldObj = {
          ...pad,
          transform: padWorldCoord,
        };
        const isHovered = this.selectionEngine?.getHoveredId() === fp.id;
        this.renderPad(ctx, padWorldObj, '#8B5CF6', zoom, isSelected, isHovered);
      }
      // Draw graphic paths
      for (const g of def.graphics) {
        const transformedG = { ...g };
        if (g.startX !== undefined && g.startY !== undefined) {
          const s = transformCoord({ x: g.startX, y: g.startY }, fp.transform);
          transformedG.startX = s.x;
          transformedG.startY = s.y;
        }
        if (g.endX !== undefined && g.endY !== undefined) {
          const e = transformCoord({ x: g.endX, y: g.endY }, fp.transform);
          transformedG.endX = e.x;
          transformedG.endY = e.y;
        }
        if (g.points) {
          transformedG.points = g.points.map((p: any) => transformCoord(p, fp.transform));
        }
        this.renderGraphic(ctx, transformedG, '#4B5563', zoom, isSelected);
      }
      // Draw texts
      for (const t of def.texts) {
        const transformedTextCoord = transformCoord(t.transform, fp.transform);
        const transformedT = {
          ...t,
          transform: {
            ...t.transform,
            x: transformedTextCoord.x,
            y: transformedTextCoord.y,
            rotation: (t.transform.rotation + fp.transform.rotation) % 360,
          },
        };
        this.renderText(ctx, transformedT, '#CCCCCC', zoom);
      }
    }
  }

  private renderSelectionBox(ctx: CanvasRenderingContext2D, box: PhysicalBBox): void {
    const tl = this.viewport.worldToScreen({ x: box.minX, y: box.minY });
    const br = this.viewport.worldToScreen({ x: box.maxX, y: box.maxY });
    ctx.strokeStyle = SELECTION_COLOR;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.fillStyle = 'rgba(0, 170, 255, 0.08)';
    ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    ctx.setLineDash([]);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private isInViewport(obj: PhysicalObject, viewBBox: PhysicalBBox): boolean {
    if (!obj.bbox) return true; // render if we don't know
    return !(obj.bbox.maxX < viewBBox.minX || obj.bbox.minX > viewBBox.maxX ||
      obj.bbox.maxY < viewBBox.minY || obj.bbox.minY > viewBBox.maxY);
  }

  private bboxInView(bbox: PhysicalBBox, viewBBox: PhysicalBBox): boolean {
    return !(bbox.maxX < viewBBox.minX || bbox.minX > viewBBox.maxX ||
      bbox.maxY < viewBBox.minY || bbox.minY > viewBBox.maxY);
  }
}
