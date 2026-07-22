import { KnowledgeAPI } from '../ai/knowledge';
import { ComponentMetadata } from '../component-library/types';
import { ObjectEngine } from '../object-engine';
import { SemanticObject } from '../types';
import { getCatalogItem, listCatalogItems } from './catalog';
import { getLibraryMetadata } from './metadata';
import { globalLibraryUsage } from './usage/manager';

export function getInspectorLibraryMetadata(object: SemanticObject): ReturnType<typeof getLibraryMetadata> {
  return getLibraryMetadata(object.type);
}

export function matchesProjectExplorerLibraryQuery(object: SemanticObject, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const metadata = getLibraryMetadata(object.type);
  return Boolean(
    object.id.toLowerCase().includes(q) ||
      object.type.toLowerCase().includes(q) ||
      object.name?.toLowerCase().includes(q) ||
      metadata?.aliases.some((alias) => alias.toLowerCase().includes(q)) ||
      metadata?.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

export function getKnowledgeLibraryItems(api: KnowledgeAPI, query: string): ComponentMetadata[] {
  return api.searchKnowledge(query);
}

export function markCatalogItemUsed(id: string): void {
  if (getCatalogItem(id)) {
    globalLibraryUsage.touchRecent(id);
  }
}

export function listFavoriteCatalogItems(): ReturnType<typeof listCatalogItems> {
  const favorites = new Set(globalLibraryUsage.listFavorites());
  return listCatalogItems({ includeDeprecated: true }).filter((item) => favorites.has(item.id));
}

export function createSemanticObjectFromCatalogItem(id: string, objectId: string, name?: string): SemanticObject {
  const item = getCatalogItem(id);
  if (!item) {
    throw new Error(`Catalog item '${id}' was not found`);
  }

  const metadata = getLibraryMetadata(id);
  return {
    id: objectId,
    type: item.id,
    name: name || item.name,
    ports: (metadata?.electricalPins || []).map((pinId) => ({
      id: pinId,
      name: pinId,
      direction: 'passive',
      signalCategory: 'unspecified',
    })),
    pins: [],
    properties: {},
  };
}

export function addCatalogItemToObjectEngine(
  objectEngine: ObjectEngine,
  layerId: string,
  catalogId: string,
  objectId: string,
  name?: string
): SemanticObject {
  const object = createSemanticObjectFromCatalogItem(catalogId, objectId, name);
  objectEngine.addComponent(layerId, object);
  globalLibraryUsage.touchRecent(catalogId);
  return object;
}
