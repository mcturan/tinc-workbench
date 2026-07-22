import { BoardDocument, PadObject } from '../physical-design/types';

export interface ValidationError {
  type: 'missing_footprint' | 'missing_drill' | 'invalid_layer' | 'duplicate_reference' | 'missing_metadata';
  message: string;
  objectId?: string;
  severity: 'error' | 'warning';
}

export class ManufacturingValidator {
  public validate(board: BoardDocument): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Check missing footprints
    if (board.footprints.length === 0 && board.objects.length === 0) {
      errors.push({
        type: 'missing_footprint',
        message: 'Design contains no objects or footprints.',
        severity: 'warning'
      });
    }

    // Check duplicate references
    const refs = new Set<string>();
    for (const fp of board.footprints) {
      if (!fp.reference || fp.reference.startsWith('REF')) continue;
      
      if (refs.has(fp.reference)) {
        errors.push({
          type: 'duplicate_reference',
          message: `Duplicate designator found: ${fp.reference}`,
          objectId: fp.id,
          severity: 'error'
        });
      }
      refs.add(fp.reference);
    }
    
    // Check missing drill info on through-hole pads
    for (const obj of board.objects) {
      if (obj.kind === 'pad') {
        const pad = obj as PadObject;
        if (pad.padType === 'thru-hole' && (!pad.drillDiameter || pad.drillDiameter <= 0)) {
          errors.push({
            type: 'missing_drill',
            message: `Through-hole pad ${pad.id} has no drill diameter defined.`,
            objectId: pad.id,
            severity: 'error'
          });
        }
      }
    }

    // Check invalid layers (objects on non-existent layers)
    const layerIds = new Set(board.layers.map(l => l.id));
    for (const obj of board.objects) {
      if (!layerIds.has(obj.layerId)) {
        errors.push({
          type: 'invalid_layer',
          message: `Object ${obj.id} is on an invalid or deleted layer (${obj.layerId}).`,
          objectId: obj.id,
          severity: 'error'
        });
      }
    }

    // Check missing manufacturing metadata (stackup info)
    if (!board.stackup || board.stackup.layers.length === 0) {
      errors.push({
        type: 'missing_metadata',
        message: 'Board stackup information is missing.',
        severity: 'warning'
      });
    }

    return errors;
  }
}
