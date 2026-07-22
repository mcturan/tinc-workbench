import { BoardDocument } from '../physical-design/types';
import { GerberExporter } from './gerber';
import { ExcellonExporter } from './excellon';
import { PickPlaceExporter } from './pick-place';
import { BOMExporter } from './bom';
import { ManufacturingValidator, ValidationError } from './validator';

export interface ManufacturingOutputs {
  gerbers: Map<string, string>; // layerId -> content
  excellon: string;
  pickPlaceCSV: string;
  pickPlaceJSON: string;
  bomCSV: string;
  bomJSON: string;
}

export class ManufacturingEngine {
  private gerberExporter = new GerberExporter();
  private excellonExporter = new ExcellonExporter();
  private pickPlaceExporter = new PickPlaceExporter();
  private bomExporter = new BOMExporter();
  private validator = new ManufacturingValidator();

  public validate(board: BoardDocument): ValidationError[] {
    return this.validator.validate(board);
  }

  public exportAll(board: BoardDocument): ManufacturingOutputs {
    const outputs: ManufacturingOutputs = {
      gerbers: new Map(),
      excellon: this.excellonExporter.exportDrills(board),
      pickPlaceCSV: this.pickPlaceExporter.exportCSV(board),
      pickPlaceJSON: this.pickPlaceExporter.exportJSON(board),
      bomCSV: this.bomExporter.exportCSV(board),
      bomJSON: this.bomExporter.exportJSON(board)
    };

    // Export a gerber for every visible copper, mask, paste, and silkscreen layer
    for (const layer of board.layers) {
      if (layer.visible && ['copper', 'solder-mask', 'solder-paste', 'silkscreen', 'mechanical'].includes(layer.kind)) {
        outputs.gerbers.set(layer.id, this.gerberExporter.exportLayer(board, layer.id));
      }
    }

    return outputs;
  }
}

export * from './gerber';
export * from './excellon';
export * from './pick-place';
export * from './bom';
export * from './validator';
