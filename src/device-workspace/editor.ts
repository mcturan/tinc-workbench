import { DeviceWorkspaceManager } from './manager';
import { CommandEngine } from '../command-engine';
import { PhysicalSelectionEngine } from '../physical-design/selection';
import { SpatialIndex } from '../physical-design/spatial-index';
import { DeviceObject } from './types';
import { PhysicalCoord } from '../physical-design/types';

export class DeviceWorkspaceEditor {
  public activeTool: 'select' | 'wire' | 'place' = 'select';
  private activePlacementObject: DeviceObject | null = null;
  
  constructor(
    public manager: DeviceWorkspaceManager,
    public commandEngine: CommandEngine,
    public selectionEngine: PhysicalSelectionEngine,
    public spatialIndex: SpatialIndex
  ) {
    // SpatialIndex can be used, but note that DeviceObject requires bbox extraction
  }

  public setTool(tool: 'select' | 'wire' | 'place', placementObj?: DeviceObject): void {
    this.activeTool = tool;
    if (tool === 'place' && placementObj) {
      this.activePlacementObject = placementObj;
    } else {
      this.activePlacementObject = null;
    }
  }

  public handleMouseClick(pt: PhysicalCoord): void {
    if (this.activeTool === 'place' && this.activePlacementObject) {
      // Place the object
      const newObj = { ...this.activePlacementObject, id: `dev-obj-${Date.now()}` };
      newObj.transform = {
        x: pt.x,
        y: pt.y,
        rotation: 0,
        mirrorX: false,
        mirrorY: false
      };
      
      const layerId = this.manager.getWorkspace().layers[0].id; // Place on first layer
      this.manager.addObject(layerId, newObj);
      this.activePlacementObject = null;
      this.activeTool = 'select';
    }
  }

  public handleMouseMove(pt: PhysicalCoord): void {
    // Handle transient snap or preview logic
  }
}
