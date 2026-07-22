import { listBuses, listBusEntries, listBusTaps } from './manager';
import { ElectricalGraphInstance } from '../../net-engine/graph';
import { ObjectEngine } from '../../object-engine';

export function resolveBuses(objectEngine: ObjectEngine, graph: ElectricalGraphInstance): void {
  const buses = listBuses();
  if (buses.length === 0) return;

  const entries = listBusEntries();
  const taps = listBusTaps();

  const busGroups = new Map<string, { id: string; isTap: boolean }[]>();

  for (const entry of entries) {
    const key = `${entry.busId}:${entry.netName}`;
    if (!busGroups.has(key)) busGroups.set(key, []);
    busGroups.get(key)!.push({ id: entry.id, isTap: false });
  }

  for (const tap of taps) {
    const key = `${tap.busId}:${tap.netName}`;
    if (!busGroups.has(key)) busGroups.set(key, []);
    busGroups.get(key)!.push({ id: tap.id, isTap: true });
  }

  for (const [key, nodes] of busGroups.entries()) {
    if (nodes.length > 1) {
      for (let i = 0; i < nodes.length - 1; i++) {
        const src = nodes[i];
        const tgt = nodes[i + 1];
        const srcComp = src.isTap ? `busTap:${src.id}` : `busEntry:${src.id}`;
        const tgtComp = tgt.isTap ? `busTap:${tgt.id}` : `busEntry:${tgt.id}`;

        graph.addNode(srcComp, 'bus');
        graph.addNode(tgtComp, 'bus');

        const edgeId = `bus-edge-${key.replace(/[:[\]..]/g, '_')}-${i}`;
        graph.addEdge(edgeId, srcComp, 'bus', tgtComp, 'bus');
      }
    }
  }
}
