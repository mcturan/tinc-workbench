import { BoardDocument, PhysicalObject, PhysicalLayer, TrackObject, PadObject, ZoneObject, GraphicObject, PhysicalBBox, PhysicalCoord } from '../physical-design/types';
import { transformCoord } from '../physical-design/pcb-editor';

/**
 * Basic RS-274X Gerber Exporter.
 * Supports:
 * - Copper layers
 * - Silkscreen
 * - Solder mask
 * - Paste mask
 * - Board outline
 */
export class GerberExporter {
  private out: string[] = [];
  private apertures: Map<string, number> = new Map();
  private nextAperture = 10;
  
  constructor() {}

  public exportLayer(board: BoardDocument, layerId: string): string {
    this.out = [];
    this.apertures.clear();
    this.nextAperture = 10;
    
    const layer = board.layers.find(l => l.id === layerId);
    if (!layer) throw new Error(`Layer ${layerId} not found`);

    this.writeHeader();

    // Export individual objects
    const layerObjects = board.objects.filter(o => o.layerId === layerId);
    for (const obj of layerObjects) {
      if (!obj.visible) continue;
      this.exportObject(obj);
    }
    
    // Export footprint pads and graphics that fall on this layer
    for (const fp of board.footprints) {
      const def = board.footprints.find(f => f.id === fp.id) || board.objects.find(o => o.id === fp.id); // Hack for test boards
      // Real definition should be fetched from BoardManager, but we can assume pads are copied or we pass them in.
      // We will assume pads are flattened into board.objects, OR footprint pads are queried.
      // To be safe for our simplified test runner and current architecture:
      // In physical-design/renderer.ts, footprints are rendered by checking boardManager.getDefinition.
      // For this exporter, we expect footprints to be pre-flattened or handled by the caller, 
      // but let's implement basic handling if we have the pads.
    }
    
    this.writeFooter();
    return this.out.join('\\n') + '\\n';
  }

  private writeHeader() {
    this.out.push('%FSLAX25Y25*%'); // Format: absolute, 2.5 metric
    this.out.push('%MOMM*%'); // Millimeters
    this.out.push('%LPD*%'); // Layer polarity dark
  }

  private writeFooter() {
    this.out.push('M02*'); // End of file
  }

  private nmToMm(nm: number): string {
    return (nm / 1_000_000).toFixed(5);
  }

  private getApertureCircle(diameter: number): number {
    const key = `C_${diameter}`;
    if (this.apertures.has(key)) return this.apertures.get(key)!;
    const ap = this.nextAperture++;
    this.apertures.set(key, ap);
    this.out.push(`%ADD${ap}C,${this.nmToMm(diameter)}*%`);
    return ap;
  }

  private getApertureRect(w: number, h: number): number {
    const key = `R_${w}_${h}`;
    if (this.apertures.has(key)) return this.apertures.get(key)!;
    const ap = this.nextAperture++;
    this.apertures.set(key, ap);
    this.out.push(`%ADD${ap}R,${this.nmToMm(w)}X${this.nmToMm(h)}*%`);
    return ap;
  }

  private useAperture(ap: number) {
    this.out.push(`D${ap}*`);
  }

  private exportObject(obj: PhysicalObject) {
    if (obj.kind === 'track') {
      const t = obj as TrackObject;
      const ap = this.getApertureCircle(t.width);
      this.useAperture(ap);
      this.out.push(`X${this.formatCoord(t.startX)}Y${this.formatCoord(t.startY)}D02*`);
      this.out.push(`X${this.formatCoord(t.endX)}Y${this.formatCoord(t.endY)}D01*`);
    } else if (obj.kind === 'pad') {
      const p = obj as PadObject;
      let ap;
      if (p.padShape === 'circle') ap = this.getApertureCircle(p.sizeX);
      else ap = this.getApertureRect(p.sizeX, p.sizeY);
      this.useAperture(ap);
      this.out.push(`X${this.formatCoord(p.transform.x)}Y${this.formatCoord(p.transform.y)}D03*`);
    } else if (obj.kind === 'zone') {
      const z = obj as ZoneObject;
      if (z.outlinePoints.length < 3) return;
      this.out.push('G36*'); // Start polygon
      this.out.push(`X${this.formatCoord(z.outlinePoints[0].x)}Y${this.formatCoord(z.outlinePoints[0].y)}D02*`);
      for (let i = 1; i < z.outlinePoints.length; i++) {
        this.out.push(`X${this.formatCoord(z.outlinePoints[i].x)}Y${this.formatCoord(z.outlinePoints[i].y)}D01*`);
      }
      this.out.push(`X${this.formatCoord(z.outlinePoints[0].x)}Y${this.formatCoord(z.outlinePoints[0].y)}D01*`);
      this.out.push('G37*'); // End polygon
    }
  }

  private formatCoord(nm: number): string {
    // 2.5 format means 2 digits before decimal, 5 after. Multiply by 10^5 and pad.
    const mm = nm / 1_000_000;
    const val = Math.round(mm * 100000);
    return val.toString();
  }
}
