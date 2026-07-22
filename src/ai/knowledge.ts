import { globalRegistry, globalSearch } from '../component-library';
import { ComponentMetadata, ElectricalPin } from '../component-library/types';
import { getLibraryMetadata, LibraryMetadataRecord } from '../library/metadata';
import { searchLibrary, SearchResult } from '../library/search/engine';
import { listSignals, listLabels } from '../net-labels';
import { resolveHierarchy } from '../hierarchy';
import { ObjectEngine } from '../object-engine';

export function listNamedSignals(): any[] {
  return listSignals();
}

export function lookupNet(objectEngine: ObjectEngine, netId: string): any {
  const graph = resolveHierarchy(objectEngine);
  return graph.getNet(netId);
}

export function resolveSignal(objectEngine: ObjectEngine, signalName: string): any {
  const allLabels = listLabels();
  const matchedLabels = allLabels.filter(l => l.name.toLowerCase() === signalName.toLowerCase());
  const graph = resolveHierarchy(objectEngine);

  const matchedNets = new Set<string>();
  const pins: any[] = [];

  for (const label of matchedLabels) {
    const net = graph.getNetByPin(label.targetObjectId, label.targetPinId);
    if (net) {
      matchedNets.add(net.id);
      pins.push(...net.pins);
    }
  }

  return {
    signalName,
    labels: matchedLabels,
    resolvedNetIds: Array.from(matchedNets),
    pins,
  };
}

export function searchSignals(query: string): any[] {
  const q = query.toLowerCase();
  return listSignals().filter(s => s.name.toLowerCase().includes(q));
}

export class KnowledgeAPI {
  getComponent(id: string): ComponentMetadata | undefined {
    return globalRegistry.getById(id);
  }

  getLibraryItem(id: string): LibraryMetadataRecord | undefined {
    return getLibraryMetadata(id);
  }

  getPins(id: string): ElectricalPin[] | undefined {
    const meta = globalRegistry.getById(id);
    if (meta?.electrical?.pins) {
      return meta.electrical.pins;
    }

    const libraryMeta = getLibraryMetadata(id);
    return libraryMeta?.electricalPins.map((pinId) => ({
      id: pinId,
      name: pinId,
      aliases: [],
      electricalType: 'unspecified',
      direction: 'unspecified' as const,
    }));
  }

  getWarnings(id: string): string[] | undefined {
    const meta = globalRegistry.getById(id);
    return meta?.knowledge?.warnings;
  }

  getApplications(id: string): string[] | undefined {
    const meta = globalRegistry.getById(id);
    return meta?.knowledge?.applications;
  }

  searchKnowledge(query: string): ComponentMetadata[] {
    return globalSearch.search(query);
  }

  searchLibraryKnowledge(query: string): SearchResult[] {
    return searchLibrary(query);
  }

  lookupNet(objectEngine: ObjectEngine, netId: string): any {
    return lookupNet(objectEngine, netId);
  }

  listNamedSignals(): any[] {
    return listNamedSignals();
  }

  resolveSignal(objectEngine: ObjectEngine, signalName: string): any {
    return resolveSignal(objectEngine, signalName);
  }

  searchSignals(query: string): any[] {
    return searchSignals(query);
  }
}
export const lookupKnowledge = new KnowledgeAPI();
