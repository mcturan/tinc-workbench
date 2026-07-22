import { BoardDocument, PhysicalObject, ViaObject, PadObject } from '../physical-design/types';

export class ExcellonExporter {
  public exportDrills(board: BoardDocument): string {
    const out: string[] = [];
    out.push('M48'); // Start of header
    out.push('METRIC,TZ');
    
    // Collect all drills
    const drills: { x: number, y: number, diameter: number, type: 'plated' | 'non-plated' }[] = [];
    
    for (const obj of board.objects) {
      if (!obj.visible) continue;
      if (obj.kind === 'via') {
        const v = obj as ViaObject;
        drills.push({ x: v.transform.x, y: v.transform.y, diameter: v.drillDiameter, type: 'plated' });
      } else if (obj.kind === 'pad') {
        const p = obj as PadObject;
        if (p.drillDiameter && p.drillDiameter > 0) {
          drills.push({ x: p.transform.x, y: p.transform.y, diameter: p.drillDiameter, type: p.padType === 'np-thru-hole' ? 'non-plated' : 'plated' });
        }
      } else if (obj.kind === 'mounting-hole') {
        const mh = obj as any; // MountingHoleObject
        drills.push({ x: mh.transform.x, y: mh.transform.y, diameter: mh.drillDiameter, type: mh.plated ? 'plated' : 'non-plated' });
      }
    }
    
    // Group by diameter
    const tools = new Map<number, number>();
    let nextTool = 1;
    
    for (const d of drills) {
      if (!tools.has(d.diameter)) {
        tools.set(d.diameter, nextTool++);
      }
    }
    
    // Write tool definitions
    for (const [diam, t] of tools.entries()) {
      out.push(`T${t}C${this.nmToMm(diam)}`);
    }
    
    out.push('%'); // End of header
    
    // Write drill locations
    for (const [diam, t] of tools.entries()) {
      out.push(`T${t}`);
      for (const d of drills) {
        if (d.diameter === diam) {
          out.push(`X${this.formatCoord(d.x)}Y${this.formatCoord(d.y)}`);
        }
      }
    }
    
    out.push('M30'); // End of program
    
    return out.join('\\n') + '\\n';
  }
  
  private nmToMm(nm: number): string {
    return (nm / 1_000_000).toFixed(3);
  }

  private formatCoord(nm: number): string {
    const mm = nm / 1_000_000;
    const val = Math.round(mm * 1000);
    return val.toString();
  }
}
