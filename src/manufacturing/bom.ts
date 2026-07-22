import { BoardDocument } from '../physical-design/types';

interface BOMItem {
  references: string[];
  quantity: number;
  value: string;
  package: string;
}

export class BOMExporter {
  public exportCSV(board: BoardDocument): string {
    const items = this.groupComponents(board);
    
    const lines: string[] = [];
    lines.push('Item,Quantity,Reference(s),Value,Package');
    
    let index = 1;
    for (const item of items) {
      const refs = item.references.join(' ');
      lines.push(`${index++},${item.quantity},"${refs}",${item.value},${item.package}`);
    }
    
    return lines.join('\\n') + '\\n';
  }

  public exportJSON(board: BoardDocument): string {
    const items = this.groupComponents(board);
    return JSON.stringify(items, null, 2);
  }

  private groupComponents(board: BoardDocument): BOMItem[] {
    const map = new Map<string, BOMItem>();
    
    for (const fp of board.footprints) {
      if (!fp.reference || fp.reference.startsWith('REF')) continue; // Skip placeholders
      
      const pkg = fp.definitionId || 'Unknown';
      const key = `${fp.value}_${pkg}`;
      
      if (!map.has(key)) {
        map.set(key, {
          references: [],
          quantity: 0,
          value: fp.value,
          package: pkg
        });
      }
      
      const item = map.get(key)!;
      item.references.push(fp.reference);
      item.quantity++;
    }
    
    // Sort references inside each item
    for (const item of map.values()) {
      item.references.sort();
    }
    
    // Sort items by value
    return Array.from(map.values()).sort((a, b) => a.value.localeCompare(b.value));
  }
}
