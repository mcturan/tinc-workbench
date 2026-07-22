import { FootprintDefinition } from '../types';

const footprintsRegistry = new Map<string, FootprintDefinition>();

export function registerFootprint(footprint: FootprintDefinition): void {
  if (!footprint.id) {
    throw new Error('Footprint ID is required');
  }
  footprintsRegistry.set(footprint.id, footprint);
}

export function unregisterFootprint(id: string): void {
  footprintsRegistry.delete(id);
}

export function getFootprint(id: string): FootprintDefinition | undefined {
  return footprintsRegistry.get(id);
}

export function listFootprints(): FootprintDefinition[] {
  return Array.from(footprintsRegistry.values());
}

export function clearFootprints(): void {
  footprintsRegistry.clear();
}
