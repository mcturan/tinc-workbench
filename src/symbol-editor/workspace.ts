import { SymbolManager } from './manager';
import { CommandEngine } from '../command-engine';
import { CanvasEngine } from '../canvas-engine';
import { SymbolDefinition, SymbolVariant, SymbolPin } from '../library/types';
import { SymbolDocument, SymbolItem } from './types';
import { generateUUID } from '../utils';

export interface SymbolValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class SymbolEditorWorkspace {
  public symbolManager: SymbolManager;
  public canvasEngine: CanvasEngine;

  private activeSymbolId: string | null = null;

  constructor(
    public commandEngine: CommandEngine
  ) {
    this.symbolManager = new SymbolManager();
    this.canvasEngine = new CanvasEngine();
    
    // Wire up events
    this.commandEngine.setSymbolManager(this.symbolManager);
  }

  public loadSymbol(sym: SymbolDefinition, variantIndex: number = 0): void {
    this.activeSymbolId = sym.id;
    this.symbolManager.clear();
    
    const doc = this.symbolManager.createDocument(sym.id, sym.displayName || sym.internalName);
    doc.description = sym.description;
    
    const variant = sym.variants[variantIndex];
    if (variant) {
      if (variant.graphics) {
        variant.graphics.forEach(g => this.symbolManager.addItem(doc.id, { ...g, selected: g.selected ?? false, locked: g.locked ?? false } as SymbolItem));
      }
      variant.pins.forEach(p => {
        this.symbolManager.addItem(doc.id, {
          id: p.id,
          kind: 'pin',
          name: p.name,
          number: p.number || '',
          direction: p.direction,
          electricalType: 'passive',
          length: p.length || 5,
          visible: p.visible ?? true,
          transform: { x: p.x || 0, y: p.y || 0, rotation: p.rotation || 0 },
          selected: false,
          locked: false
        });
      });
    }
  }

  public saveSymbol(): SymbolVariant {
    if (!this.activeSymbolId) throw new Error('No symbol active');
    const doc = this.symbolManager.getActiveDocument();
    if (!doc) throw new Error('No active document');

    const pins = doc.items.filter(i => i.kind === 'pin').map(p => {
      const pin = p as any;
      return {
        id: pin.id,
        name: pin.name,
        number: pin.number,
        direction: pin.direction,
        length: pin.length,
        x: pin.transform.x,
        y: pin.transform.y,
        rotation: pin.transform.rotation,
        visible: pin.visible
      } as SymbolPin;
    });

    const graphics = doc.items.filter(i => i.kind !== 'pin').map(g => ({ ...g }));

    return {
      id: doc.id,
      name: doc.name,
      pins,
      graphics: graphics as any
    };
  }

  public validate(): SymbolValidationResult {
    const result: SymbolValidationResult = { valid: true, errors: [], warnings: [] };
    const doc = this.symbolManager.getActiveDocument();
    if (!doc) return result;

    const pins = doc.items.filter(i => i.kind === 'pin') as any[];
    const texts = doc.items.filter(i => i.kind === 'text') as any[];

    // Empty symbol
    if (doc.items.length === 0) {
      result.errors.push('Symbol is empty');
      result.valid = false;
    }

    // Missing reference prefix
    const hasRef = texts.some(t => t.textType === 'reference');
    if (!hasRef) {
      result.errors.push('Missing reference prefix text');
      result.valid = false;
    }

    // Duplicate pin numbers
    const numbers = new Set<string>();
    for (const p of pins) {
      if (p.number) {
        if (numbers.has(p.number)) {
          result.errors.push(`Duplicate pin number: ${p.number}`);
          result.valid = false;
        }
        numbers.add(p.number);
      }
    }

    // Invalid pin definitions
    for (const p of pins) {
      if (!p.name) {
        result.errors.push(`Pin ${p.id} is missing a name`);
        result.valid = false;
      }
    }

    return result;
  }
}
