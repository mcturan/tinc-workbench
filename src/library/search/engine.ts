import { listSymbols } from '../symbols/manager';
import { listDevices } from '../devices/manager';
import { listFootprints } from '../footprints/manager';
import { listDatasheets } from '../datasheets/manager';
import { paginate, PaginatedResult } from '../catalog';

export interface SearchDoc {
  id: string;
  type: 'symbol' | 'device' | 'footprint' | 'datasheet';
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
  aliases: string[];
  keywords: string[];
  package?: string;
  manufacturer?: string;
  mpn?: string;
  mountType?: string;
  url?: string;
}

export interface SearchFilter {
  type?: SearchDoc['type'];
  category?: string;
  tag?: string;
  manufacturer?: string;
  package?: string;
  mountType?: string;
}

export interface SearchOptions {
  fuzzy?: boolean;
  sortBy?: 'name' | 'rank';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  doc: SearchDoc;
  score: number;
}

export interface RankedSearchPage extends PaginatedResult<SearchResult> {
  query: string;
  filters?: SearchFilter;
}

let searchIndex: SearchDoc[] = [];

export function rebuildSearchIndex(): void {
  searchIndex = [];

  // Index Symbols
  const symbols = listSymbols();
  for (const sym of symbols) {
    searchIndex.push({
      id: sym.id,
      type: 'symbol',
      name: sym.displayName,
      description: sym.description || '',
      category: sym.category || '',
      subcategory: sym.subcategory || '',
      tags: sym.tags || [],
      aliases: sym.aliases || [],
      keywords: sym.keywords || [],
    });
  }

  // Index Devices
  const devices = listDevices();
  for (const dev of devices) {
    searchIndex.push({
      id: dev.id,
      type: 'device',
      name: dev.name,
      description: dev.description || '',
      category: dev.category || '',
      tags: [],
      aliases: dev.manufacturerParts.flatMap((part) => [part.mpn, part.manufacturer, part.packageOption]),
      keywords: [dev.metadata?.mechanical?.packageType, dev.metadata?.commercial?.lifecycle].filter((value): value is string => Boolean(value)),
      package: dev.metadata?.mechanical?.packageType || '',
      manufacturer: dev.metadata?.commercial?.manufacturer || '',
      mpn: dev.metadata?.commercial?.mpn || '',
    });
  }

  for (const fp of listFootprints()) {
    searchIndex.push({
      id: fp.id,
      type: 'footprint',
      name: fp.name,
      description: fp.description || '',
      category: fp.mountType,
      tags: [fp.mountType, `${fp.padCount}-pad`],
      aliases: [],
      keywords: [String(fp.padCount), `${fp.padCount} pad`, fp.mountType],
      package: fp.name,
      mountType: fp.mountType,
    });
  }

  for (const ds of listDatasheets()) {
    searchIndex.push({
      id: ds.id,
      type: 'datasheet',
      name: ds.title,
      description: ds.url,
      category: 'Documentation',
      tags: ['datasheet'],
      aliases: [ds.url, ds.localPath || ''].filter(Boolean),
      keywords: ['datasheet', ds.hash || ''].filter(Boolean),
      url: ds.url,
    });
  }
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const d: number[][] = [];

  for (let i = 0; i <= m; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  return d[m][n];
}

function scoreDocument(doc: SearchDoc, query: string, fuzzyEnabled = true): number {
  const q = query.toLowerCase().trim();
  if (!q) return 1.0;

  let score = 0;

  if (doc.name.toLowerCase() === q) score += 100;
  if (doc.mpn?.toLowerCase() === q) score += 90;
  if (doc.aliases.some(a => a.toLowerCase() === q)) score += 80;

  if (doc.name.toLowerCase().startsWith(q)) score += 50;
  if (doc.mpn?.toLowerCase().startsWith(q)) score += 45;

  if (doc.name.toLowerCase().includes(q)) score += 20;
  if (doc.description.toLowerCase().includes(q)) score += 10;
  if (doc.category.toLowerCase().includes(q)) score += 15;
  if (doc.subcategory?.toLowerCase().includes(q)) score += 10;
  if (doc.manufacturer?.toLowerCase().includes(q)) score += 15;
  if (doc.mpn?.toLowerCase().includes(q)) score += 20;
  if (doc.package?.toLowerCase().includes(q)) score += 15;
  if (doc.mountType?.toLowerCase().includes(q)) score += 10;
  if (doc.url?.toLowerCase().includes(q)) score += 10;

  for (const t of doc.tags) {
    if (t.toLowerCase().includes(q)) score += 5;
  }
  for (const a of doc.aliases) {
    if (a.toLowerCase().includes(q)) score += 5;
  }
  for (const kw of doc.keywords) {
    if (kw.toLowerCase().includes(q)) score += 5;
  }

  if (score === 0 && fuzzyEnabled) {
    const nameDist = levenshteinDistance(doc.name.toLowerCase(), q);
    const maxLen = Math.max(doc.name.length, q.length);
    if (maxLen > 0) {
      const similarity = 1 - nameDist / maxLen;
      if (similarity > 0.6) {
        score += similarity * 10;
      }
    }
  }

  return score;
}

export function searchLibrary(
  query: string,
  filter?: SearchFilter,
  options?: SearchOptions
): SearchResult[] {
  // Registries are mutable module-level stores, so rebuild to keep results fresh.
  rebuildSearchIndex();

  let results: SearchResult[] = [];
  const q = query.trim();

  for (const doc of searchIndex) {
    // Apply filters
    if (filter) {
      if (filter.type && doc.type !== filter.type) continue;
      if (filter.category && doc.category.toLowerCase() !== filter.category.toLowerCase()) continue;
      if (filter.tag && !doc.tags.some(t => t.toLowerCase() === filter.tag!.toLowerCase())) continue;
      if (filter.manufacturer && doc.manufacturer?.toLowerCase() !== filter.manufacturer.toLowerCase()) continue;
      if (filter.package && doc.package?.toLowerCase() !== filter.package.toLowerCase()) continue;
      if (filter.mountType && doc.mountType?.toLowerCase() !== filter.mountType.toLowerCase()) continue;
    }

    const score = q ? scoreDocument(doc, q, options?.fuzzy !== false) : 1.0;
    if (score > 0) {
      results.push({ doc, score });
    }
  }

  // Sort
  const sortBy = options?.sortBy || 'rank';
  const sortOrder = options?.sortOrder || 'desc';

  results.sort((a, b) => {
    if (sortBy === 'rank') {
      return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
    } else {
      const nameA = a.doc.name.toLowerCase();
      const nameB = b.doc.name.toLowerCase();
      if (nameA < nameB) return sortOrder === 'desc' ? 1 : -1;
      if (nameA > nameB) return sortOrder === 'desc' ? -1 : 1;
      return 0;
    }
  });

  if (options?.page !== undefined && options?.pageSize !== undefined) {
    const start = (options.page - 1) * options.pageSize;
    const end = start + options.pageSize;
    results = results.slice(start, end);
  }

  return results;
}

export function searchLibraryPage(
  query: string,
  filter?: SearchFilter,
  options?: SearchOptions
): RankedSearchPage {
  const unpaged = searchLibrary(query, filter, { ...options, page: undefined, pageSize: undefined });
  return {
    ...paginate(unpaged, options),
    query,
    filters: filter,
  };
}

export function getSearchIndexSnapshot(): SearchDoc[] {
  rebuildSearchIndex();
  return [...searchIndex];
}
