import { generateUUID } from '../utils';
import { DeviceWorkspaceState, DeviceLayer, DeviceObject } from './types';
import { RuntimeEngine } from './runtime';

export class DeviceWorkspaceManager {
  private workspace: DeviceWorkspaceState;
  private runtime: RuntimeEngine;

  constructor() {
    this.workspace = this.createDefaultWorkspace();
    this.runtime = new RuntimeEngine();
  }

  public getWorkspace(): DeviceWorkspaceState {
    return this.workspace;
  }

  public getRuntime(): RuntimeEngine {
    return this.runtime;
  }

  public setWorkspace(workspace: DeviceWorkspaceState): void {
    this.workspace = workspace;
  }

  public addObject(layerId: string, obj: DeviceObject): void {
    const layer = this.workspace.layers.find(l => l.id === layerId);
    if (!layer) throw new Error(`Layer ${layerId} not found`);
    layer.objects.push(obj);
  }

  public removeObject(objectId: string): void {
    for (const layer of this.workspace.layers) {
      layer.objects = layer.objects.filter(o => o.id !== objectId);
    }
  }

  public getObject(objectId: string): DeviceObject | undefined {
    for (const layer of this.workspace.layers) {
      const obj = layer.objects.find(o => o.id === objectId);
      if (obj) return obj;
    }
    return undefined;
  }

  public updateObject(objectId: string, updates: Partial<DeviceObject>): void {
    const obj = this.getObject(objectId);
    if (obj) {
      Object.assign(obj, updates);
    }
  }

  private createDefaultWorkspace(): DeviceWorkspaceState {
    const defaultLayer: DeviceLayer = {
      id: generateUUID(),
      name: 'Assembly',
      visible: true,
      locked: false,
      objects: []
    };

    const wiringLayer: DeviceLayer = {
      id: generateUUID(),
      name: 'Wiring',
      visible: true,
      locked: false,
      objects: []
    };

    return {
      id: generateUUID(),
      layers: [defaultLayer, wiringLayer],
      grid: {
        enabled: true,
        pitchX: 2540000, // 2.54mm (100mil) in nm
        pitchY: 2540000
      }
    };
  }
}
