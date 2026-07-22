import { ComponentMetadata } from '../component-library/types';
import { globalRegistry } from '../component-library';
import { listDatasheets } from './datasheets/manager';
import { listDevices } from './devices/manager';
import { listFootprints } from './footprints/manager';
import { listSymbols } from './symbols/manager';
import { DatasheetReference, DeviceDefinition, FootprintDefinition, SymbolDefinition } from './types';
import { globalLibraryUsage } from './usage/manager';

export type LibraryCatalogKind = 'component' | 'device' | 'symbol' | 'footprint' | 'datasheet';

export interface LibraryCatalogItem {
  id: string;
  kind: LibraryCatalogKind;
  name: string;
  description: string;
  category: string;
  tags: string[];
  aliases: string[];
  version?: string;
  deprecated?: boolean;
  source: 'component-library' | 'library';
  payload: ComponentMetadata | DeviceDefinition | SymbolDefinition | FootprintDefinition | DatasheetReference;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface LibraryCatalogOptions extends PaginationOptions {
  kind?: LibraryCatalogKind;
  category?: string;
  includeDeprecated?: boolean;
}

function paginate<T>(items: T[], options?: PaginationOptions): PaginatedResult<T> {
  const pageSize = Math.max(1, options?.pageSize || items.length || 1);
  const page = Math.max(1, options?.page || 1);
  const start = (page - 1) * pageSize;
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export function createCatalogItemFromComponent(component: ComponentMetadata): LibraryCatalogItem {
  return {
    id: component.id,
    kind: 'component',
    name: component.name,
    description: component.description,
    category: component.tvcs?.categoryPath?.[0] || 'Uncategorized',
    tags: component.tvcs?.tags || component.knowledge?.tags || [],
    aliases: component.aliases || [],
    source: 'component-library',
    payload: component,
  };
}

export function listCatalogItems(options?: LibraryCatalogOptions): LibraryCatalogItem[] {
  const items: LibraryCatalogItem[] = [
    ...globalRegistry.list().map(createCatalogItemFromComponent),
    ...listDevices().map((device) => ({
      id: device.id,
      kind: 'device' as const,
      name: device.name,
      description: device.description,
      category: device.category,
      tags: [],
      aliases: device.manufacturerParts.map((part) => part.mpn),
      version: device.version,
      deprecated: device.deprecationState !== 'active',
      source: 'library' as const,
      payload: device,
    })),
    ...listSymbols().map((symbol) => ({
      id: symbol.id,
      kind: 'symbol' as const,
      name: symbol.displayName,
      description: symbol.description,
      category: symbol.category,
      tags: symbol.tags,
      aliases: symbol.aliases,
      version: symbol.version,
      deprecated: symbol.deprecationState !== 'active',
      source: 'library' as const,
      payload: symbol,
    })),
    ...listFootprints().map((footprint) => ({
      id: footprint.id,
      kind: 'footprint' as const,
      name: footprint.name,
      description: footprint.description,
      category: footprint.mountType,
      tags: [footprint.mountType, `${footprint.padCount}-pad`],
      aliases: [],
      source: 'library' as const,
      payload: footprint,
    })),
    ...listDatasheets().map((datasheet) => ({
      id: datasheet.id,
      kind: 'datasheet' as const,
      name: datasheet.title,
      description: datasheet.url,
      category: 'Documentation',
      tags: ['datasheet'],
      aliases: [datasheet.url, datasheet.localPath || ''].filter(Boolean),
      source: 'library' as const,
      payload: datasheet,
    })),
  ];

  return items.filter((item) => {
    if (options?.kind && item.kind !== options.kind) return false;
    if (options?.category && item.category.toLowerCase() !== options.category.toLowerCase()) return false;
    if (!options?.includeDeprecated && item.deprecated) return false;
    return true;
  });
}

export function getCatalogItem(id: string): LibraryCatalogItem | undefined {
  const item = listCatalogItems({ includeDeprecated: true }).find((entry) => entry.id === id);
  if (item) {
    globalLibraryUsage.touchRecent(item.id);
  }
  return item;
}

export function listCatalogPage(options?: LibraryCatalogOptions): PaginatedResult<LibraryCatalogItem> {
  return paginate(listCatalogItems(options), options);
}

export async function loadCatalogPage(options?: LibraryCatalogOptions): Promise<PaginatedResult<LibraryCatalogItem>> {
  return listCatalogPage(options);
}

export { paginate };
