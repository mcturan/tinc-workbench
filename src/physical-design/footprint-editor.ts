import {
  PCBFootprintDefinition,
  PhysicalObject,
  PadObject,
  GraphicObject,
  TextObject,
  PhysicalCoord,
  PhysicalBBox,
  BoardDocument,
  LayerSide
} from './types';
import { generateUUID } from '../utils';
import { BoardManager } from './board';
import { PhysicalSelectionEngine } from './selection';
import { SpatialIndex } from './spatial-index';
import { PhysicalViewportManager } from './viewport';
import { CommandEngine } from '../command-engine';
import { createDefaultLayers } from './layers';
import { createDefaultStackup } from './stackup';
import { computeObjectBBox, bboxFromPoints } from './geometry';
import { bboxUnion } from './types';

export interface FootprintValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class FootprintEditorWorkspace {
  public boardManager: BoardManager;
  public selectionEngine: PhysicalSelectionEngine;
  public spatialIndex: SpatialIndex;
  public viewport: PhysicalViewportManager;
  
  private activeFootprintId: string | null = null;
  private pcbEditorMode: boolean = false; // Just to indicate this is a specialized workspace

  constructor(
    public commandEngine: CommandEngine
  ) {
    this.boardManager = new BoardManager();
    this.spatialIndex = new SpatialIndex();
    this.selectionEngine = new PhysicalSelectionEngine(
      (id) => this.boardManager.getActiveBoard()?.objects.find(o => o.id === id),
      this.spatialIndex
    );
    this.viewport = new PhysicalViewportManager();
    
    // Wire up events
    this.commandEngine.setBoardManager(this.boardManager);
  }

  /**
   * Loads a footprint definition into the workspace for editing.
   * We convert it into a temporary BoardDocument.
   */
  public loadFootprint(fp: PCBFootprintDefinition): void {
    this.activeFootprintId = fp.id;
    
    // Convert footprint objects to board objects.
    // They are already PhysicalObjects, so we can just clone them.
    const objects: PhysicalObject[] = [
      ...fp.pads.map(p => ({...p})),
      ...fp.graphics.map(g => ({...g})),
      ...fp.texts.map(t => ({...t})),
      ...(fp.courtyard ? fp.courtyard.map(c => ({...c})) : []),
      ...(fp.assembly ? fp.assembly.map(a => ({...a})) : []),
      ...(fp.documentation ? fp.documentation.map(d => ({...d})) : [])
    ];
    
    const board: BoardDocument = {
      id: fp.id, // Use footprint ID as board ID
      uuid: fp.id,
      name: fp.name,
      layers: createDefaultLayers(),
      stackup: createDefaultStackup(createDefaultLayers()),
      origin: { x: fp.anchor.x, y: fp.anchor.y },
      objects: objects,
      footprints: [],
      rules: [],
      layerGroups: [],
      layerPresets: [],
      netClasses: [],
      boardOutline: [],
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      unitSystem: { primary: 'mm', display: 'mm', precision: 4, internalUnit: 'nm' },
      activeLayerId: 'F.Cu'
    };
    
    // Clear and set the board manager
    this.boardManager.clear();
    // Override the boards map directly since BoardManager has no loadBoard API
    this.boardManager['boards'].clear();
    this.boardManager['boards'].set(board.id, board);
    this.boardManager.setActiveBoard(board.id);
    
    // Populate spatial index
    this.spatialIndex.clear();
    objects.forEach(o => {
      const bbox = computeObjectBBox(o);
      if (bbox) {
        this.spatialIndex.upsert({ id: o.id, layerId: o.layerId, bbox });
      }
    });
    
    this.selectionEngine.clearSelection();
  }

  /**
   * Saves the current workspace back into a PCBFootprintDefinition.
   */
  public saveFootprint(): PCBFootprintDefinition {
    if (!this.activeFootprintId) throw new Error('No footprint loaded');
    const board = this.boardManager.getBoard(this.activeFootprintId);
    if (!board) throw new Error('Board not found');
    
    const pads: PadObject[] = [];
    const graphics: GraphicObject[] = [];
    const texts: TextObject[] = [];
    const courtyard: GraphicObject[] = [];
    const assembly: GraphicObject[] = [];
    const documentation: GraphicObject[] = [];
    
    for (const obj of board.objects) {
      if (obj.kind === 'pad') {
        pads.push(obj as PadObject);
      } else if (obj.kind === 'graphic') {
        // Sort graphics into arrays based on their layer
        // Simple heuristic: F.CrtYd -> courtyard, F.Fab -> assembly, etc.
        const g = obj as GraphicObject;
        if (g.layerId === 'F.CrtYd' || g.layerId === 'B.CrtYd') {
          courtyard.push(g);
        } else if (g.layerId === 'F.Fab' || g.layerId === 'B.Fab') {
          assembly.push(g);
        } else if (g.layerId === 'Cmts.User' || g.layerId === 'Eco1.User' || g.layerId === 'Eco2.User') {
          documentation.push(g);
        } else {
          graphics.push(g); // Default silkscreen or other graphics
        }
      } else if (obj.kind === 'text') {
        texts.push(obj as TextObject);
      }
    }
    
    // Recompute BBox
    let globalBbox: PhysicalBBox | undefined;
    const allObjs = [...pads, ...graphics, ...texts, ...courtyard, ...assembly, ...documentation];
    for (const obj of allObjs) {
      const bbox = computeObjectBBox(obj);
      if (bbox) {
        if (!globalBbox) globalBbox = bbox;
        else globalBbox = bboxUnion(globalBbox, bbox);
      }
    }
    
    return {
      id: this.activeFootprintId,
      name: board.name,
      tags: [],
      pads,
      graphics,
      texts,
      courtyard,
      assembly,
      documentation,
      anchor: { x: board.origin.x, y: board.origin.y },
      bbox: globalBbox
    };
  }

  /**
   * Validates the footprint.
   */
  public validate(): FootprintValidationResult {
    const result: FootprintValidationResult = { valid: true, errors: [], warnings: [] };
    if (!this.activeFootprintId) return result;
    const board = this.boardManager.getBoard(this.activeFootprintId);
    if (!board) return result;
    
    const pads = board.objects.filter(o => o.kind === 'pad') as PadObject[];
    const texts = board.objects.filter(o => o.kind === 'text') as TextObject[];
    const graphics = board.objects.filter(o => o.kind === 'graphic') as GraphicObject[];
    
    // 1. Missing Reference
    const hasReference = texts.some(t => t.textType === 'reference');
    if (!hasReference) {
      result.errors.push('Missing reference designator text');
      result.valid = false;
    }
    
    // 2. Overlapping pads (simplified check)
    for (let i = 0; i < pads.length; i++) {
      for (let j = i + 1; j < pads.length; j++) {
        const p1 = pads[i];
        const p2 = pads[j];
        if (p1.layerId === p2.layerId) {
           const b1 = computeObjectBBox(p1);
           const b2 = computeObjectBBox(p2);
           if (b1 && b2) {
             const intersectX = Math.max(0, Math.min(b1.maxX, b2.maxX) - Math.max(b1.minX, b2.minX));
             const intersectY = Math.max(0, Math.min(b1.maxY, b2.maxY) - Math.max(b1.minY, b2.minY));
             if (intersectX > 0 && intersectY > 0) {
               // Only warn if they have different numbers or different nets
               if (p1.padNumber !== p2.padNumber) {
                 result.errors.push(`Pad ${p1.padNumber} overlaps with Pad ${p2.padNumber}`);
                 result.valid = false;
               }
             }
           }
        }
      }
    }
    
    // 3. Invalid Drills
    for (const pad of pads) {
      if (pad.padType === 'thru-hole' || pad.padType === 'np-thru-hole') {
        if (!pad.drillDiameter || pad.drillDiameter <= 0) {
          result.errors.push(`Through-hole pad ${pad.padNumber} has invalid drill diameter`);
          result.valid = false;
        }
      }
    }
    
    // 4. Missing Origin
    if (board.origin.x === 0 && board.origin.y === 0) {
      // It's at 0,0, which is fine, but maybe we should ensure there's an anchor object?
      // Actually anchor is just the origin coord.
      // But we can warn if there are no pads around 0,0
    }
    
    return result;
  }
}
