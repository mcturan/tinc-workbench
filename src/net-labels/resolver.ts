import { listLabels } from './labels';
import { ElectricalGraphInstance } from '../net-engine/graph';
import { ObjectEngine } from '../object-engine';

export function resolveLabels(objectEngine: ObjectEngine, graph: ElectricalGraphInstance): void {
  const allLabels = listLabels();
  if (allLabels.length === 0) return;

  const localGroups = new Map<string, { compId: string; pinId: string }[]>();
  const globalGroups = new Map<string, { compId: string; pinId: string }[]>();

  for (const label of allLabels) {
    const compId = label.targetObjectId;
    const pinId = label.targetPinId;

    const lastSlash = compId.lastIndexOf('/');
    const path = lastSlash !== -1 ? compId.substring(0, lastSlash + 1) : '';

    if (label.scope === 'Local') {
      const key = `${path}:${label.name}`;
      if (!localGroups.has(key)) localGroups.set(key, []);
      localGroups.get(key)!.push({ compId, pinId });
    } else {
      const key = label.name;
      if (!globalGroups.has(key)) globalGroups.set(key, []);
      globalGroups.get(key)!.push({ compId, pinId });
    }
  }

  for (const [key, pins] of localGroups.entries()) {
    if (pins.length > 1) {
      for (let i = 0; i < pins.length - 1; i++) {
        const src = pins[i];
        const tgt = pins[i + 1];
        const edgeId = `label-edge-local-${key.replace(/[:/]/g, '_')}-${i}`;
        graph.addEdge(edgeId, src.compId, src.pinId, tgt.compId, tgt.pinId);
      }
    }
  }

  for (const [key, pins] of globalGroups.entries()) {
    if (pins.length > 1) {
      for (let i = 0; i < pins.length - 1; i++) {
        const src = pins[i];
        const tgt = pins[i + 1];
        const edgeId = `label-edge-global-${key.replace(/[:/]/g, '_')}-${i}`;
        graph.addEdge(edgeId, src.compId, src.pinId, tgt.compId, tgt.pinId);
      }
    }
  }
}
