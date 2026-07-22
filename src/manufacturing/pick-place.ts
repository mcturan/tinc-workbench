import { BoardDocument } from '../physical-design/types';

export class PickPlaceExporter {
  public exportCSV(board: BoardDocument): string {
    const lines: string[] = [];
    lines.push('Designator,Val,Package,Mid X,Mid Y,Rotation,Layer');
    
    for (const fp of board.footprints) {
      if (!fp.reference || fp.reference.startsWith('REF')) continue; // Skip unannotated or default
      
      const x = this.nmToMm(fp.transform.x);
      const y = this.nmToMm(fp.transform.y);
      const rot = fp.transform.rotation;
      const layer = board.layers.find(l => l.id === fp.layerId)?.side || 'front';
      const side = layer === 'front' ? 'Top' : 'Bottom';
      
      // Package could be stored in metadata or value or a dedicated field. We'll extract what we can.
      const pkg = fp.definitionId || 'Unknown';
      
      lines.push(`${fp.reference},${fp.value},${pkg},${x},${y},${rot},${side}`);
    }
    
    return lines.join('\\n') + '\\n';
  }

  public exportJSON(board: BoardDocument): string {
    const components = board.footprints.map(fp => {
      const layer = board.layers.find(l => l.id === fp.layerId)?.side || 'front';
      return {
        designator: fp.reference,
        value: fp.value,
        package: fp.definitionId || 'Unknown',
        x: this.nmToMm(fp.transform.x),
        y: this.nmToMm(fp.transform.y),
        rotation: fp.transform.rotation,
        layer: layer === 'front' ? 'Top' : 'Bottom'
      };
    });
    
    return JSON.stringify(components, null, 2);
  }

  private nmToMm(nm: number): number {
    return Math.round((nm / 1_000_000) * 1000) / 1000;
  }
}
