export type ComponentRuntimeState = 'powered' | 'unpowered' | 'active' | 'disabled' | 'connected' | 'warning' | 'error' | 'default';

export type StatusIndicatorType = 'power' | 'serial' | 'usb' | 'wifi' | 'bluetooth' | 'mqtt' | 'home-assistant' | 'warning' | 'error';
export type AnimationType = 'led' | 'button' | 'switch' | 'rotary' | 'relay' | 'servo' | 'fan' | 'potentiometer';

export interface ComponentRuntimeData {
  state: ComponentRuntimeState;
  indicators: {
    type: StatusIndicatorType;
    active: boolean;
    color?: string; // Optional override color
  }[];
  animations?: {
    type: AnimationType;
    value: number; // For continuous (0.0-1.0) or discrete (0|1)
    label?: string; // e.g. "D13 LED"
    x?: number; // local offset x (nm)
    y?: number; // local offset y (nm)
  }[];
  custom?: Record<string, unknown>;
}

export interface RuntimeProvider {
  id: string;
  name: string;
  update(deltaMs: number): void;
}

export class RuntimeEngine {
  private providers: RuntimeProvider[] = [];
  private states = new Map<string, ComponentRuntimeData>();
  
  public registerProvider(provider: RuntimeProvider): void {
    this.providers.push(provider);
  }
  
  public unregisterProvider(providerId: string): void {
    this.providers = this.providers.filter(p => p.id !== providerId);
  }
  
  public update(deltaMs: number): void {
    for (const p of this.providers) {
      p.update(deltaMs);
    }
  }

  public setState(objectId: string, data: ComponentRuntimeData): void {
    this.states.set(objectId, data);
  }

  public getState(objectId: string): ComponentRuntimeData | undefined {
    return this.states.get(objectId);
  }
  
  public clear(): void {
    this.states.clear();
  }
}
