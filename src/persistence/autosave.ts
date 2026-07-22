import { ObjectEngine } from '../object-engine';
import { PersistenceSerializer } from './serializer';
import { PersistenceStorage } from './types';

export class AutosaveService {
  private serializer = new PersistenceSerializer();
  private lastSignature = '';
  private timerId: any = null;
  private intervalMs = 30000;

  constructor(
    private objectEngine: ObjectEngine,
    private storage: PersistenceStorage,
    private storageKey: string
  ) {
    this.lastSignature = this.getDirtySignature();
  }

  private getDirtySignature(): string {
    return JSON.stringify({
      project: this.objectEngine.getProject(),
      wires: this.objectEngine.getWires(),
      connections: this.objectEngine.getConnections(),
    });
  }

  setInterval(ms: number): void {
    this.intervalMs = ms;
    if (this.timerId !== null) {
      this.stop();
      this.start();
    }
  }

  start(): void {
    if (this.timerId !== null) return;

    this.timerId = setInterval(() => {
      this.triggerAutosave();
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  isDirty(): boolean {
    return this.getDirtySignature() !== this.lastSignature;
  }

  triggerAutosave(): boolean {
    const currentSig = this.getDirtySignature();
    if (currentSig === this.lastSignature) {
      return false;
    }

    const current = this.serializer.serialize(this.objectEngine);
    try {
      this.storage.setItem(this.storageKey, current);
      this.lastSignature = currentSig;
      return true;
    } catch {
      return false;
    }
  }
}
