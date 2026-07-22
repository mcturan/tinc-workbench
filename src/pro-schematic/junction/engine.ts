import { Coordinate } from '../../types';
import { ObjectEngine } from '../../object-engine';
import { Junction } from '../types';

const junctions = new Map<string, Junction>();

function coordKey(c: Coordinate): string {
  return `${Math.round(c.x)},${Math.round(c.y)}`;
}

export function createJunction(j: Junction): Junction {
  junctions.set(j.id, j);
  return j;
}

export function deleteJunction(id: string): void {
  junctions.delete(id);
}

export function listJunctions(): Junction[] {
  return Array.from(junctions.values());
}

export function clearJunctions(): void {
  junctions.clear();
}

export function autoJunction(objectEngine: ObjectEngine): void {
  const coordToWires = new Map<string, { coord: Coordinate; wireIds: Set<string> }>();

  for (const wire of objectEngine.getWires()) {
    for (const seg of wire.segments) {
      const keys = [coordKey(seg.start), coordKey(seg.end)];
      const coords = [seg.start, seg.end];

      for (let i = 0; i < 2; i++) {
        const k = keys[i];
        if (!coordToWires.has(k)) {
          coordToWires.set(k, { coord: coords[i], wireIds: new Set() });
        }
        coordToWires.get(k)!.wireIds.add(wire.id);
      }
    }
  }

  for (const j of listJunctions()) {
    if (j.type === 'Auto') {
      deleteJunction(j.id);
    }
  }

  let autoIdCounter = 0;
  for (const [, val] of coordToWires.entries()) {
    if (val.wireIds.size >= 3) {
      createJunction({
        id: `auto-junc-${autoIdCounter++}`,
        type: 'Auto',
        position: val.coord,
        connectedWireIds: Array.from(val.wireIds),
      });
    }
  }
}

export function cleanupJunctions(objectEngine: ObjectEngine): void {
  const wires = objectEngine.getWires();

  for (const j of listJunctions()) {
    const connected: string[] = [];
    for (const w of wires) {
      const isConnected = w.segments.some(
        seg => coordKey(seg.start) === coordKey(j.position) || coordKey(seg.end) === coordKey(j.position)
      );
      if (isConnected) {
        connected.push(w.id);
      }
    }

    if (connected.length === 0) {
      deleteJunction(j.id);
    } else {
      j.connectedWireIds = connected;
    }
  }
}

export interface JunctionDiagnostic {
  id: string;
  type: 'floating' | 'duplicate' | 'invalid';
  message: string;
  position: Coordinate;
}

export function validateJunctions(_objectEngine: ObjectEngine): JunctionDiagnostic[] {
  const diags: JunctionDiagnostic[] = [];
  const list = listJunctions();
  const seen = new Set<string>();

  for (const j of list) {
    const key = coordKey(j.position);

    if (seen.has(key)) {
      diags.push({
        id: `JUNC-DUP-${j.id}`,
        type: 'duplicate',
        message: `Duplicate junction at coordinate (${Math.round(j.position.x)}, ${Math.round(j.position.y)})`,
        position: j.position,
      });
    }
    seen.add(key);

    if (j.connectedWireIds.length === 0) {
      diags.push({
        id: `JUNC-FLOAT-${j.id}`,
        type: 'floating',
        message: `Floating junction at coordinate (${Math.round(j.position.x)}, ${Math.round(j.position.y)}) with no connected wires`,
        position: j.position,
      });
    }
  }

  return diags;
}
export function mergeJunctions(objectEngine: ObjectEngine): void {
  autoJunction(objectEngine);
  cleanupJunctions(objectEngine);
}
